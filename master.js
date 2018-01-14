/**
 * Created by schen on 1/6/18.
 */
var express = require('express');
var app = express();
var server = require('http').Server(app);
var fs = require('fs');

var pusage = require('pidusage');
var math = require('mathjs');
var redis = require('redis');
var sub = redis.createClient();

// Manage command line arguments
var myArgs = require('optimist').argv;

// Manage incoming
var infoStack = [];
// Manage outgoing
var sendStack = [];
var benchmark = {};

// For the dynamic load balancing
var setDynamic = false;
var fibHeap = new math.type.FibonacciHeap();
// For the Fibonacci Heap to maintain the server with minimum workload
var serversAvgCpu = [0.0, 0.0, 0.0, 0.0, 0.0];

// Track if servers are active
// Initialize variables to calculate current workloads
var serversActive = [false, false, false, false, false];
var serversTotalCpu = [0.0, 0.0, 0.0, 0.0, 0.0];
var serversTotalLat = [0.0, 0.0, 0.0, 0.0, 0.0];
var conn = [0, 0, 0, 0, 0];

var masterTime = "",
    masterCpu = 0.0;

app.use('/assets', express.static(__dirname + '/dashboard/assets'));

app.get('/',function(req,res){
    res.sendFile(__dirname + '/dashboard/dashboard.html');
});

app.get('/load', function(req,res) {
    for (var i = 0; i < infoStack.length; i++) {
        if (!infoStack[i].machine) {
            continue;
        }
        switch (infoStack[i].machine) {
            case 6050:
                serversActive[0] = true;
                serversTotalCpu[0] += infoStack[i].cpu;
                serversTotalLat[0] += infoStack[i].latency;
                conn[0] += 1;
                break;
            case 6051:
                serversActive[1] = true;
                serversTotalCpu[1] += infoStack[i].cpu;
                serversTotalLat[1] += infoStack[i].latency;
                conn[1] += 1;
                break;
            case 6052:
                serversActive[2] = true;
                serversTotalCpu[2] += infoStack[i].cpu;
                serversTotalLat[2] += infoStack[i].latency;
                conn[2] += 1;
                break;
            case 6053:
                serversActive[3] = true;
                serversTotalCpu[3] += infoStack[i].cpu;
                serversTotalLat[3] += infoStack[i].latency;
                conn[3] += 1;
                break;
            case 6054:
                serversActive[4] = true;
                serversTotalCpu[4] += infoStack[i].cpu;
                serversTotalLat[4] += infoStack[i].latency;
                conn[4] += 1;
                break;
            case 8000:
                masterCpu = infoStack[i].cpu;
                masterTime = infoStack[i].time.toString();
                break;
        }
    }

    var avgCpu = [0.0, 0.0, 0.0, 0.0, 0.0];
    var avgLat = [0.0, 0.0, 0.0, 0.0, 0.0];
    for (var machine=0; machine < serversTotalCpu.length; machine++) {
        avgCpu[machine] = (conn[machine] > 0) ? (serversTotalCpu[machine] / conn[machine]) : 0;
        avgLat[machine] = (conn[machine] > 0) ? (serversTotalLat[machine] / conn[machine]) : 0;
    }

    sendStack.push({'machine': 6050, 'isActive': serversActive[0], 'conn': conn[0], 'cpu': avgCpu[0], 'lat': avgLat[0]});
    sendStack.push({'machine': 6051, 'isActive': serversActive[1], 'conn': conn[1], 'cpu': avgCpu[1], 'lat': avgLat[1]});
    sendStack.push({'machine': 6052, 'isActive': serversActive[2], 'conn': conn[2], 'cpu': avgCpu[2], 'lat': avgLat[2]});
    sendStack.push({'machine': 6053, 'isActive': serversActive[3], 'conn': conn[3], 'cpu': avgCpu[3], 'lat': avgLat[3]});
    sendStack.push({'machine': 6054, 'isActive': serversActive[4], 'conn': conn[4], 'cpu': avgCpu[4], 'lat': avgLat[4]});
    // DEBUG
    // console.log('sendStack', sendStack);

    // TODO: Insert function to evaluate workload on all nodes here


    var callback = function() {
        sendStack.push(benchmark);
        res.send(JSON.stringify(sendStack));

        // Clear variables after responding to client AJAX call
        infoStack.splice(0, infoStack.length);
        sendStack.splice(0, sendStack.length);
        serversTotalCpu.map(function() {
            return 0.0;
        });
        serversTotalLat.map(function() {
            return 0.0;
        });
        conn.map(function() {
            return 0.0;
        });
        masterCpu = 0.0;
    };
    processUsage(callback);
});

// -d flag specifies if dynamic load balancing is active;
// defaults to static load balancing
server.listen(myArgs.d || process.env.PORT || 8000, function() {
    if(myArgs.d) {
        setDynamic = true;
    }
    console.log('Master listening on ' + server.address().port);
});

var pushInfo = function(channel, packet) {
    // Push data onto stack
    infoStack.push(JSON.parse(packet));
    // DEBUG
    // console.log('packet', packet);
};
sub.on('message', pushInfo);
sub.subscribe('master');

function processUsage(callback) {
    pusage.stat(process.pid, function(err, stat) {
        benchmark['machine'] = server.address().port;
        benchmark['cpu'] = stat.cpu;
        // TODO: Add memory benchmarking
        // benchmark['memory'] = stat.memory;
        benchmark['time'] = new Date().getTime() / 1000;
    });
    callback();
}

/*
 * Begin dynamic load balancing with Fib Heap
 */
// function evaluateWorkload(avgCpu0, avgCpu1, avgCpu2, avgCpu3, avgCpu4) {
//     for (var server=0; server < serversActive.length; i++) {
//         // If server has just become active
//         if(serversActive[server] && serversAvgCpu[server] === 0.0) {
//
//             fibHeap.insert()
//         // If server has been active and has previous workload
//         } else if(serversActive[server]) {
//
//         }
//     }
// }
