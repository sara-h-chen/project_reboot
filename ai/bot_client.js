var io = require('socket.io-client');

// TODO: Change this so it doesn't require the default exports to be added in these files
// TODO: Figure out why Decoder needs the extra import for CoDec
var CoDec = require('./CoDec.js').default;
var Decoder = require('./Decoder.js').default;

function createBotClient(index, callback) {
    var BotClient = {
        eventsQueue : [],
        initEventName: 'init',
        storageNameKey: 'bot_' + index + 'Name',
        storageIDKey: 'bot_' + index + 'ID',
        startup: true,
        backupServers: [false, false, false, false, false],
        substitutes: [1,2,3,4,3],
        lastPath: {}
    };
    BotClient.socket = io.connect('http://127.0.0.1:8081/');

    var onevent = BotClient.socket.onevent;

    BotClient.socket.onevent = function(packet) {
        // if(!Game.playerIsInitialized && packet.data[0] != BotClient.initEventName && packet.data[0] != 'dbError'){
            // BotClient.eventsQueue.push(packet);
        // }else{
            onevent.call(this, packet);    // original call
        // }
    };

    // =================== BOT HELPER FUNCTIONS

    BotClient.emptyQueue = function(){
        for(var e = 0; e < BotClient.eventsQueue.length; e++){
            onevent.call(BotClient.socket,BotClient.eventsQueue[e]);
        }
    };

    BotClient.requestData = function(){ // request the data to be used for initWorld()
        BotClient.socket.emit('init-world',BotClient.getInitRequest());
    };

    BotClient.getInitRequest = function(){
        // Returns the data object to send to request the initialization data
        // We always create a new player, set new to true and send the name of the player
        // Else, set new to false and send it's id instead to fetch the corresponding data in the database
        return {new:true,name:BotClient.getName(),BotClientTime:Date.now()};
    };

    BotClient.getName = function(){
        return "bot_" + index;
    };

    // TODO: Find out why we have to do this
    function toArrayBuffer(buf) {
        var ab = new ArrayBuffer(buf.length);
        var view = new Uint8Array(ab);
        for (var i = 0; i < buf.length; ++i) {
            view[i] = buf[i];
        }
        return ab;
    }

    // ==================== BOT SOCKET FUNCTIONS

    // BotClient.socket.on('pid',function(playerID){ // the 'pid' event is used for the server to tell the BotClient what is the ID of the player
    //     BotClient.setLocalData(playerID);
    // });

    BotClient.socket.on('alloc',function(packet) {
        // DEBUG
        // console.log('received packet on bot', packet.portNumber);
        BotClient.backupServers = packet.subServers;
        BotClient.socketFunctions(packet);
    });

    BotClient.socketFunctions = function(packet) {
        if (BotClient.backupServers[Number(packet.portNumber) - 6050]) {
            // DEBUG
            // console.log('bot connected and attempting to connect to ', packet.portNumber);
            BotClient.socket.disconnect();
            BotClient.socket = io.connect('http://127.0.0.1:' + packet.portNumber + '/');

            let currentPort = packet.portNumber;
            onevent = BotClient.socket.onevent;

            if (packet.toTransfer) {
                BotClient.socket.emit('ponq', packet.stamp);
                BotClient.socket.emit('transfer', packet);
            }

            if (BotClient.startup) {
                BotClient.requestData();
                BotClient.startup = false;
            }

            if (packet.sendPath) {
                BotClient.socket.emit('crash', packet);
            }

            BotClient.socket.on(BotClient.initEventName, function(data) { // This event triggers when receiving the initialization packet from the server, to use in Game.initWorld()
                if (data instanceof Buffer) data = Decoder.decode(toArrayBuffer(data), CoDec.initializationSchema); // if in binary format, decode first
                BotClient.socket.emit('ponq', data.stamp); // send back a pong stamp to compute latency
                callback(data.player, index);
                // Game.initWorld(data);
                // Game.updateNbConnected(data.nbconnected);
            });

            // TODO: Allow the bot to reset its position
            BotClient.socket.on('reset', function(data) {
                // If there is a mismatch between BotClient and server coordinates, this event will reset the BotClient to the server coordinates
                // data contains the correct position of the player
                // Game.moveCharacter(Game.player.id,data,0,Game.latency);
            });

            BotClient.socket.on('wait', function() {
                // wait is sent back from the server when the BotClient attempts to connect before the server is done initializing and reading the map
                // console.log('Server not ready, re-attempting...');
                setTimeout(BotClient.requestData, 500); // Just try again in 500ms
            });

            BotClient.socket.on('alloc', function(packet) {
                // UNCOMMENT: Simple behavior
                // BotClient.socketFunctions(packet);

                if (packet.subServers) { BotClient.backupServers = packet.subServers; }
                if (BotClient.backupServers[Number(packet.portNumber) - 6050]) {
                    BotClient.socketFunctions(packet);
                }
            });

            BotClient.socket.on('latency', function(packet) {
                BotClient.socket.emit('ponq', packet.stamp);
            });

            // UNCOMMENT: Simple, without fault tolerance
            // BotClient.socket.on('disconnect', function() {
            //     BotClient.socket = io.connect('http://127.0.0.1:8081');
            // });

            // Reconnect back to Gate server upon disconnection
            BotClient.socket.on('disconnect', function() {
                if (BotClient.substitutes[currentPort - 6050] != undefined && BotClient.backupServers[currentPort - 6050]) {
                    let dict = {
                        sendPath: true,
                        crashedPort: currentPort,
                        portNumber: (BotClient.substitutes[currentPort - 6050] + 6050),
                        name: BotClient.storageNameKey,
                        path: BotClient.lastPath,
                        player: {
                            id: BotClient.storageIDKey,
                            x: BotClient.lastPath.path[BotClient.lastPath.path.length - 1].x,
                            y: BotClient.lastPath.path[BotClient.lastPath.path.length - 1].y
                        }
                    };
                    // DEBUG
                    // console.log(dict);
                    BotClient.socketFunctions(dict);
                } else {
                    console.log('No servers available');
                }
            });

            // upon server failure
            BotClient.socket.on('connect_error', function(err) {
                // handle server error here
                BotClient.socket.disconnect();
            });

            // TODO: Fix this
            BotClient.socket.on('backup', function(data) {
                console.log('received backup', data);
                BotClient.substitutes = data;
                console.log(BotClient.substitutes);
            });
        }
    };

    BotClient.sendPath = function(path,action,finalOrientation){
        // Send the path that the player intends to travel
        let savedPath = {
            path:path,
            action:action,
            or:finalOrientation
        };
        BotClient.socket.emit('path',savedPath);
        BotClient.lastPath = savedPath;
    };
    return BotClient;
}

exports.createBotClient = createBotClient;