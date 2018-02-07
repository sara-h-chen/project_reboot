var io = require('socket.io-client');

// TODO: Figure out why other players don't show up
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
        startup: true
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
        BotClient.socketFunctions(packet);
    });

    BotClient.socketFunctions = function(packet) {
        // DEBUG
        // console.log('bot connected and attempting to connect to ', packet.portNumber);
        BotClient.socket.disconnect();
        BotClient.socket = io.connect('http://127.0.0.1:' + packet.portNumber + '/');

        onevent = BotClient.socket.onevent;

        if(packet.toTransfer) {
            BotClient.socket.emit('ponq',packet.stamp);
            BotClient.socket.emit('transfer', packet);
        }

        if(BotClient.startup) {
            BotClient.requestData();
            BotClient.startup = false;
        }

        BotClient.socket.on(BotClient.initEventName,function(data){ // This event triggers when receiving the initialization packet from the server, to use in Game.initWorld()
            if(data instanceof Buffer) data = Decoder.decode(toArrayBuffer(data),CoDec.initializationSchema); // if in binary format, decode first
            BotClient.socket.emit('ponq',data.stamp); // send back a pong stamp to compute latency
            callback(data.player, index);
            // Game.initWorld(data);
            // Game.updateNbConnected(data.nbconnected);
        });

        // TODO: Allow the bot to reset its position
        BotClient.socket.on('reset',function(data){
            // If there is a mismatch between BotClient and server coordinates, this event will reset the BotClient to the server coordinates
            // data contains the correct position of the player
            // Game.moveCharacter(Game.player.id,data,0,Game.latency);
        });

        BotClient.socket.on('wait',function(){
            // wait is sent back from the server when the BotClient attempts to connect before the server is done initializing and reading the map
            // console.log('Server not ready, re-attempting...');
            setTimeout(BotClient.requestData, 500); // Just try again in 500ms
        });

        BotClient.socket.on('alloc', function(packet) {
            BotClient.socketFunctions(packet);
        });

        BotClient.socket.on('latency', function(packet) {
            BotClient.socket.emit('ponq', packet.stamp);
        });
    };

    BotClient.sendPath = function(path,action,finalOrientation){
        // Send the path that the player intends to travel
        BotClient.socket.emit('path',{
            path:path,
            action:action,
            or:finalOrientation
        });
    };
    return BotClient;
}

exports.createBotClient = createBotClient;