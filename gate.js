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

var express = require('express');
var app = express();
var server = require('http').Server(app);
var io = require('socket.io').listen(server);
var mongo = require('mongodb').MongoClient;
var fs = require('fs');

/*
 * 6050: Lava area at top
 * 6051: Wasteland before final lava area
 * 6052: Forest
 * 6053: Starting area
 * 6054: Beach
 */
var startingServer = 6053;

var ObjectId = require('mongodb').ObjectId;
var Player = require(__dirname + '/js/server/Player').Player;

app.use('/css',express.static(__dirname + '/css'));
app.use('/js',express.static(__dirname + '/js'));
app.use('/assets',express.static(__dirname + '/assets'));


app.get('/',function(req,res){
    res.sendFile(__dirname+'/index.html');
});

// Manage command line arguments
var myArgs = require('optimist').argv;
var mongoHost, mongoDBName;

var servers = JSON.parse(fs.readFileSync(__dirname + '/assets/json/servers_alloc.json')).servers;

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

server.listen(myArgs.p || process.env.PORT || 8081,function(){ // -p flag to specify port ; the env variable is needed for Heroku
    console.log('Gate listening on '+server.address().port);

    mongo.connect('mongodb://'+mongoHost+'/'+mongoDBName,function(err,db){
        if(err) throw(err);
        server.db = db;
        console.log('Connection to db established');
    });
});

io.on('connection',function(socket){
    console.log('Gate connection with ID '+socket.id);
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
    });

    socket.on('init-world', function(data) {
        var callback = function(portNumber) {
            sendAssignment(socket, portNumber);
        };
        getServerAssignment(data, callback);
    });

    socket.on('disconnect',function(){
        socket.disconnect();
        console.log('Disconnection with ID '+socket.id);
    });

});

var getServerAssignment = function(data, callback) {
    server.db.collection('players').findOne({_id: new ObjectId(data.id)}, function(err, doc) {
        // DEBUG
        // console.log('---------------- player ', doc);
        if (err) throw err;
        if (!doc) {
            callback(startingServer);
        }
        var location = {
            'x': doc.x,
            'y': doc.y
        };
        var port = serverAssignment(location);
        callback(port);
    });
};

var serverAssignment = function(location) {
    for (var key in servers) {
        if (servers.hasOwnProperty(key)) {
            if (servers[key].max_y > location.y) {
                break;
            }
        }
    }
    return key;
};

var sendAssignment = function(socket, portNumber) {
    var packet = {
        portNumber: portNumber
    };
    socket.emit('alloc', packet);
};