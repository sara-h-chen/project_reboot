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
var comms = require('socket.io-client').connect('http://127.0.0.1:8000');

/*
 * 6050: Lava area at top
 * 6051: Wasteland before final lava area
 * 6052: Forest
 * 6053: Starting area
 * 6054: Beach
 */
var serversToChooseFrom = [6050,6051,6052,6053,6054];
var oneServer = undefined;
var servAssignment = 0;

var ObjectId = require('mongodb').ObjectId;
var Player = require(__dirname + '/js/server/Player').Player;

app.use('/css',express.static(__dirname + '/css'));
app.use('/js',express.static(__dirname + '/js'));
app.use('/assets',express.static(__dirname + '/assets'));


app.get('/',function(req,res){
    res.sendFile(__dirname+'/index.html');
});

// Manage command line arguments
var myArgs = require('optimist')
    .usage('Usage: use --oo flag to stress only one server: node gate.js [--oo]')
    .argv;
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
    // Randomly choose only one server
    if(myArgs.oo) {
        oneServer = serversToChooseFrom[Math.floor(Math.random()*serversToChooseFrom.length)];
    }

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
        // var callback = function(portNumber) {
        //     sendAssignment(socket, portNumber);
        // };
        getServerAssignment(socket, data);
    });

    socket.on('disconnect',function(){
        socket.disconnect();
        console.log('Disconnection with ID '+socket.id);
    });

    // =============== IN CASE OF COMPONENT FAILURE
    //
    comms.on('ready', function() {
        console.log('ready', servAssignment);
        sendAssignment(socket, servAssignment);
    });

    comms.on('reroute', function(data) {
        console.log('rerouted', data);
        sendAssignment(socket, data);
    });
});

var getServerAssignment = function(socket, data) {
    server.db.collection('players').findOne({_id: new ObjectId(data.id)}, function(err, doc) {
        // DEBUG
        // console.log('---------------- player ', doc);
        if (err) throw err;
        if (!doc) {
            let randomAllocation;
            if (!oneServer) {
                randomAllocation = serversToChooseFrom[Math.floor(Math.random()*serversToChooseFrom.length)];
                console.log('random ---->>', randomAllocation);
            } else {
                randomAllocation = oneServer;
            }
            serverAssignment(socket, Number(randomAllocation) - 6050);
        } else {
            var location = {
                'x': doc.x,
                'y': doc.y
            };
            serverAssignment(socket, location);
        }
    });
};

var serverAssignment = function(socket, location) {
    if(location.y) {
        for (var key in servers) {
            if (servers.hasOwnProperty(key)) {
                if (servers[key].max_y > location.y) {
                    break;
                }
            }
        }
        servAssignment = Number(key) - 6050;
    } else {
        servAssignment = location;
    }
    // checkIfActive(servAssignment);
    sendAssignment(socket, servAssignment);
};

var sendAssignment = function(socket, portNumber) {
    var packet = {
        portNumber: 6050 + Number(portNumber)
    };
    socket.emit('alloc', packet);
};

var checkIfActive = function(portNumber) {
    comms.emit('check', portNumber);
};