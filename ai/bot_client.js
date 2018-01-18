var io = require('socket.io-client');

// TODO: Change this so it doesn't require the default exports to be added in these files
// TODO: Figure out why Decoder needs the extra import for CoDec
var CoDec = require('./CoDec.js').default;
var Decoder = require('./Decoder.js').default;

function createBotClient(index, callback) {
    var BotClient = {
        eventsQueue : [], // when events arrive before the flag playerIsInitialized is set to true, they are not processed
        // and instead are queued in this array ; they will be processed once the BotClient is initialized and BotClient.emptyQueue() has been called
        initEventName: 'init', // name of the event that triggers the call to initWorld() and the initialization of the game
        storageNameKey: 'bot_' + index + 'Name', // key in localStorage of the player name
        storageIDKey: 'bot_' + index + 'ID' // key in localStorage of player ID
    };
    BotClient.socket = io.connect('http://localhost:8081');

    // The following checks if the game is initialized or not, and based on this either queues the events or process them
    // The original socket.onevent function is copied to onevent. That way, onevent can be used to call the origianl function,
    // whereas socket.onevent can be modified for our purpose!
    var onevent = BotClient.socket.onevent;
    BotClient.socket.onevent = function (packet) {
        // if(!Game.playerIsInitialized && packet.data[0] != BotClient.initEventName && packet.data[0] != 'dbError'){
            // BotClient.eventsQueue.push(packet);
        // }else{
            onevent.call(this, packet);    // original call
        // }
    };

    BotClient.emptyQueue = function(){ // Process the events that have been queued during initialization
        for(var e = 0; e < BotClient.eventsQueue.length; e++){
            onevent.call(BotClient.socket,BotClient.eventsQueue[e]);
        }
    };

    BotClient.requestData = function(){ // request the data to be used for initWorld()
        BotClient.socket.emit('init-world',BotClient.getInitRequest());
    };

    BotClient.getInitRequest = function(){ // Returns the data object to send to request the initialization data
        // We always create a new player, set new to true and send the name of the player
        // Else, set new to false and send it's id instead to fetch the corresponding data in the database
        return {new:true,name:BotClient.getName(),BotClientTime:Date.now()};
    };

    // BotClient.isNewPlayer = function(){
    //     var id = BotClient.getPlayerID();
    //     var name = BotClient.getName();
    //     var armor = BotClient.getArmor();
    //     var weapon = BotClient.getWeapon();
    //     return !(id !== undefined && name && armor && weapon);
    // };

    // BotClient.setLocalData = function(id){ // store the player ID in localStorage
    //     //console.log('your ID : '+id);
    //     localStorage.setItem(BotClient.storageIDKey,id);
    // };

    // BotClient.getPlayerID = function(){
    //     return localStorage.getItem(BotClient.storageIDKey);
    // };

    // BotClient.hasAchievement = function(id){
    //     return (localStorage.getItem('ach'+id)? true : false);
    // };

    // BotClient.setAchievement = function(id){
    //     localStorage.setItem('ach'+id,true);
    // };

    // BotClient.setArmor = function(key){
    //     localStorage.setItem('armor',key);
    // };

    // BotClient.getArmor = function(){
    //     return localStorage.getItem('armor');
    // };

    // BotClient.setWeapon = function(key){
    //     localStorage.setItem('weapon',key);
    // };

    // BotClient.getWeapon = function(){
    //     return localStorage.getItem('weapon');
    // };

    // BotClient.setName = function(name){
    //     localStorage.setItem('name',name);
    // };

    BotClient.getName = function(){
        return "bot_" + index;
    };

    // BotClient.socket.on('pid',function(playerID){ // the 'pid' event is used for the server to tell the BotClient what is the ID of the player
    //     BotClient.setLocalData(playerID);
    // });

    // TODO: Find out why we have to do this
    function toArrayBuffer(buf) {
        var ab = new ArrayBuffer(buf.length);
        var view = new Uint8Array(ab);
        for (var i = 0; i < buf.length; ++i) {
            view[i] = buf[i];
        }
        return ab;
    }

    BotClient.socket.on(BotClient.initEventName,function(data){ // This event triggers when receiving the initialization packet from the server, to use in Game.initWorld()
        if(data instanceof Buffer) data = Decoder.decode(toArrayBuffer(data),CoDec.initializationSchema); // if in binary format, decode first
        BotClient.socket.emit('ponq',data.stamp); // send back a pong stamp to compute latency
        callback(data.player, index);
        // Game.initWorld(data);
        // Game.updateNbConnected(data.nbconnected);
    });

    // BotClient.socket.on('update',function(data){ // This event triggers uppon receiving an update packet (data)
    //     if(data instanceof ArrayBuffer) data = Decoder.decode(data,CoDec.finalUpdateSchema); // if in binary format, decode first
    //     BotClient.socket.emit('ponq',data.stamp);  // send back a pong stamp to compute latency
    //     if(data.nbconnected !== undefined) Game.updateNbConnected(data.nbconnected);
    //     if(data.latency) Game.setLatency(data.latency);
    //     if(data.global) Game.updateWorld(data.global);
    //     if(data.local) Game.updateSelf(data.local);
    // });

    BotClient.socket.on('reset',function(data){
        // If there is a mismatch between BotClient and server coordinates, this event will reset the BotClient to the server coordinates
        // data contains the correct position of the player
        // Game.moveCharacter(Game.player.id,data,0,Game.latency);
    });

    // BotClient.socket.on('dbError',function(){
    //     // dbError is sent back from the server when the BotClient attempted to connect by sending a player ID that has no match in the database
    //     localStorage.clear();
    //     // Game.displayError();
    // });

    BotClient.socket.on('wait',function(){
        // wait is sent back from the server when the BotClient attempts to connect before the server is done initializing and reading the map
        // console.log('Server not ready, re-attempting...');
        setTimeout(BotClient.requestData, 500); // Just try again in 500ms
    });

    // BotClient.socket.on('chat',function(data){
    //     // chat is sent by the server when another nearby player has said something
    //     Game.playerSays(data.id,data.txt);
    // });

    BotClient.sendPath = function(path,action,finalOrientation){
        // Send the path that the player intends to travel
        BotClient.socket.emit('path',{
            path:path,
            action:action,
            or:finalOrientation
        });
    };

    // BotClient.sendChat = function(txt){
    //     // Send the text that the player wants to say
    //     if(!txt.length || txt.length > Game.maxChatLength) return;
    //     BotClient.socket.emit('chat',txt);
    // };

    // BotClient.sendRevive = function(){
    //     // Signal the server that the player wants to respawn
    //     BotClient.socket.emit('revive');
    // };

    // BotClient.deletePlayer = function(){
    //     // Signal the server that the player wants to delete his character
    //     BotClient.socket.emit('delete',{id:BotClient.getPlayerID()});
    //     localStorage.clear();
    // };
    return BotClient;
}

exports.createBotClient = createBotClient;