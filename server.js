/*
 // sending to sender-client only
 socket.emit('message', "this is a test");

 // sending to all clients, include sender
 io.emit('message', "this is a test");

 // sending to all clients except sender
 socket.broadcast.emit('message', "this is a test");

 // sending to all clients in 'game' room(channel) except sender
 socket.broadcast.to('game').emit('message', 'nice game');

 // sending to all clients in 'game' room(channel), include sender
 io.in('game').emit('message', 'cool game');

 // sending to sender client, only if they are in 'game' room(channel)
 socket.to('game').emit('message', 'enjoy the game');

 // sending to all clients in namespace 'myNamespace', include sender
 io.of('myNamespace').emit('message', 'gg');

 // sending to individual socketid, but not sender
 socket.broadcast.to(socketid).emit('message', 'for your eyes only');
 */

var fs = require('fs');
var config = JSON.parse(fs.readFileSync(__dirname + '/assets/json/servers_alloc.json')).servers;

var express = require('express');
var app = express();
var server = require('http').Server(app);
var io = require('socket.io').listen(server);
var mongo = require('mongodb').MongoClient;
var quickselect = require('quickselect'); // Used to compute the median for latency
var pusage = require('pidusage');

// Listen for messages on Redis
var redis = require('redis');
var sub_top = redis.createClient();
var sub_btm = redis.createClient();
var pub = redis.createClient();

var gs = require('./js/server/GameServer.js').GameServer;
// For the binary protocol of update packets :
var CoDec = require('./js/CoDec.js').CoDec;
var Encoder = require('./js/server/Encoder.js').Encoder;

// For pushing status to master
var benchmark = {};

server.enableBinary = false;
gs.server = server;

app.use('/css',express.static(__dirname + '/css'));
app.use('/js',express.static(__dirname + '/js'));
app.use('/assets',express.static(__dirname + '/assets'));


app.get('/',function(req,res){
    res.sendFile(__dirname+'/index.html');
});

// Manage command line arguments
var myArgs = require('optimist').argv;
var mongoHost, mongoDBName;

function sleep(milliseconds) {
    console.log('Waiting for database - start: ' + new Date().getTime());
    var start = new Date().getTime();
    while (true) {
        if ((new Date().getTime() - start) > milliseconds){
            break;
        }
    }
    console.log('Waiting for database - finished: ' + (new Date().getTime() - start));
}

if(myArgs.waitForDatabase) {
    sleep(myArgs.waitForDatabase);
}

if(myArgs.heroku){ // --heroku flag to behave according to Heroku's specs
    mongoHost = 'heroku_4tv68zls:'+myArgs.pass+'@ds141368.mlab.com:41368';
    mongoDBName = 'heroku_4tv68zls';
}else {
    var mongoPort = (myArgs.mongoPort || 27017);
    var mongoServer = (myArgs.mongoServer || 'localhost');
    mongoHost = mongoServer+':'+mongoPort;
    mongoDBName = 'phaserQuest';
}

// Specify port through command line with PORT=XXXX
server.listen(myArgs.p || process.env.PORT || 6053,function(){ // -p flag to specify port ; the env variable is needed for Heroku
    console.log('Listening on '+server.address().port);
    server.clientUpdateRate = 1000/5; // Rate at which update packets are sent
    gs.setup(server.address().port);
    gs.readMap();
    server.setUpdateLoop();

    mongo.connect('mongodb://'+mongoHost+'/'+mongoDBName,function(err,db){
        if(err) throw(err);
        server.db = db;
        console.log('Connection to db established');
    });
});

/*
 * Packet contains the original packet from the socket call
 * and the socket ID, socket latency
 * and the serialized player information
 */
var redisCallback = function(channel, packet) {
    var received = JSON.parse(packet);
    // Break down the packet into its components
    var time = received.loggedTime;
    var data = received.oriPacket;
    var socketInfo = received.socketInfo;
    var player = received.player;
    gs.handleRedis(data, player, socketInfo, time);
};
sub_top.on('message', redisCallback);
sub_btm.on('message', redisCallback);

// Subscribe to overlap channels
var servPort = server.address().port.toString();
if(config[servPort].topChannel.length > 0) {
    sub_top.subscribe(config[servPort].topChannel);
}
if(config[servPort].bottomChannel.length > 0) {
    sub_btm.subscribe(config[servPort].bottomChannel);
}

io.on('connection',function(socket){
    console.log('connection with ID '+socket.id);
    console.log(server.getNbConnected()+' already connected');
    socket.pings = [];

    socket.on('ponq',function(sentStamp){
        // Compute a running estimate of the latency of a client each time an interaction takes place between client and server
        // The running estimate is the median of the last 20 sampled values
        var ss = server.getShortStamp();
        var delta = (ss - sentStamp)/2;
        if(delta < 0) delta = 0;
        socket.pings.push(delta); // socket.pings is the list of the 20 last latencies
        if(socket.pings.length > 20) socket.pings.shift(); // keep the size down to 20
        socket.latency = server.quickMedian(socket.pings.slice(0)); // quickMedian used the quickselect algorithm to compute the median of a list of values
        benchmark['latency'] = socket.latency;
        processUsage();
    });

    socket.on('init-world', function(data) {
        if(!gs.mapReady) {
            socket.emit('wait');
            return;
        }
        if(data.new) {
            if(!gs.checkSocketID(socket.id)) return;
            gs.addNewPlayer(false,socket,data);
        }else{
            if(!gs.checkPlayerID(data.id)) return;
            gs.loadPlayer(socket,data.id);
        }
    });

    // DEBUG
    // socket.on('test', function() {
    //     console.log('Test packet received');
    // });

    socket.on('revive',function(){
        gs.revivePlayer(gs.getPlayerID(socket.id));
    });

    socket.on('path',function(data){
        var callback = function() {
            if(!gs.handlePath(pub,data,data.path,data.action,data.or,socket)) socket.emit('reset',gs.getCurrentPosition(socket.id));
        };

        // Ensure that latency is calculated and that you give a 500ms headstart to the server to before setting path for player
        if(!socket.latency) {
            socket.emit('latency', server.addStamp(data));
            setTimeout(callback, 500);
        } else {
            callback();
        }
    });

    socket.on('chat',function(txt){
        if(!txt.length || txt.length > 300) return;
        var rooms = gs.listAOIsFromSocket(socket.id);
        var playerID = gs.getPlayerID(socket.id);
        rooms.forEach(function(room){
            socket.broadcast.to(room).emit('chat', {id:playerID,txt:txt});
        });
    });

    socket.on('delete',function(data){
        gs.deletePlayer(data.id);
    });

    socket.on('disconnect',function(){
        console.log('Disconnection with ID '+socket.id);
        if(gs.getPlayer(socket.id)) gs.removePlayer(socket.id);
    });

    socket.on('transfer', function(data) {
        gs.receiveTransfer(data,socket);
    });

    // Benchmark whenever a user is connected
    function processUsage() {
        pusage.stat(process.pid, function(err, stat) {
            benchmark['machine'] = server.address().port;
            benchmark['cpu'] = stat.cpu;
            });
        // DEBUG
        // console.log(benchmark);
        pub.publish('master', JSON.stringify(benchmark));
    }

    // Ping to measure latency every 5 seconds
    var ping = function() {
        // DEBUG
        // console.log('timestamp', new Date().getTime() / 1000);
        var data = {data: "empty"};
        server.addStamp(data);
        socket.emit('latency',data);
    };
    setInterval(ping, 5000);
});


server.setUpdateLoop = function(){
    setInterval(gs.updatePlayers,server.clientUpdateRate);
};

server.sendInitializationPacket = function(socket,packet){
    packet = server.addStamp(packet);
    if(server.enableBinary) packet = Encoder.encode(packet,CoDec.initializationSchema);
    socket.emit('init',packet);
};

server.sendUpdate = function(socketID,pkg){
    pkg = server.addStamp(pkg);
    try{
        pkg.latency = Math.floor(server.getSocket(socketID).latency);
    }catch(e){
        console.log(e);
        pkg.latency = 0;
    }
    if(server.enableBinary) pkg = Encoder.encode(pkg,CoDec.finalUpdateSchema);
    if(pkg) io.in(socketID).emit('update',pkg);
};

server.getNbConnected =function(){
    return Object.keys(gs.players).length;
};

server.addToRoom = function(socketID,room){
    var socket = server.getSocket(socketID);
    socket.join(room);
};

server.leaveRoom = function(socketID,room){
    var socket = server.getSocket(socketID);
    if(socket) socket.leave(room);
};

server.sendID = function(socket,playerID){
    socket.emit('pid',playerID);
};

server.sendError = function(socket){
    socket.emit('dbError');
};

server.addStamp = function(pkg){
    pkg.stamp = server.getShortStamp();
    return pkg;
};

server.getShortStamp = function(){
    return parseInt(Date.now().toString().substr(-9));
};

server.getSocket = function(id){
    return io.sockets.connected[id]; // won't work if the socket is subscribed to a namespace, because the namsepace will be part of the id
};

server.quickMedian = function(arr){ // Compute the median of an array using the quickselect algorithm
    var  l = arr.length;
    var n = (l%2 == 0 ? (l/2)-1 : (l-1)/2);
    quickselect(arr,n);
    return arr[n];
};