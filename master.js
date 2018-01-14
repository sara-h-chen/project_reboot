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

var infoStack = [];
var sendStack = [];
var benchmark = {};

// Manage command line arguments
var myArgs = require('optimist').argv;

// For the dynamic load balancing
var setDynamic = false;
// TODO: Implement dynamic load balancing
// var fibHeap = new FibonacciHeap();

// Track if servers are active
// Initialize variables to calculate current workloads
var serversActive = [false, false, false, false, false];
var server0ttcpu = 0.0,
    server1ttcpu = 0.0,
    server2ttcpu = 0.0,
    server3ttcpu = 0.0,
    server4ttcpu = 0.0;

var server0ttlat = 0.0,
    server1ttlat = 0.0,
    server2ttlat = 0.0,
    server3ttlat = 0.0,
    server4ttlat = 0.0;

var conn0 = 0,
    conn1 = 0,
    conn2 = 0,
    conn3 = 0,
    conn4 = 0;

var mastertime = "",
    mastercpu = 0.0;

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
                server0ttcpu += infoStack[i].cpu;
                server0ttlat += infoStack[i].latency;
                conn0 += 1;
                break;
            case 6051:
                serversActive[1] = true;
                server1ttcpu += infoStack[i].cpu;
                server1ttlat += infoStack[i].latency;
                conn1 += 1;
                break;
            case 6052:
                serversActive[2] = true;
                server2ttcpu += infoStack[i].cpu;
                server2ttlat += infoStack[i].latency;
                conn2 += 1;
                break;
            case 6053:
                serversActive[3] = true;
                server3ttcpu += infoStack[i].cpu;
                server3ttlat += infoStack[i].latency;
                conn3 += 1;
                break;
            case 6054:
                serversActive[4] = true;
                server4ttcpu += infoStack[i].cpu;
                server4ttlat += infoStack[i].latency;
                conn4 += 1;
                break;
            case 8000:
                mastercpu = infoStack[i].cpu;
                mastertime = infoStack[i].time.toString();
                break;
        }
    }

    var avg0cpu = (conn0 > 0) ? (server0ttcpu / conn0) : 0,
        avg0lat = (conn0 > 0) ? (server0ttlat / conn0) : 0;
    var avg1cpu = (conn1 > 0) ? (server1ttcpu / conn1) : 0,
        avg1lat = (conn1 > 0) ? (server1ttlat / conn1) : 0;
    var avg2cpu = (conn2 > 0) ? (server2ttcpu / conn2) : 0,
        avg2lat = (conn2 > 0) ? (server2ttlat / conn2) : 0;
    var avg3cpu = (conn3 > 0) ? (server3ttcpu / conn3) : 0,
        avg3lat = (conn3 > 0) ? (server3ttlat / conn3) : 0;
    var avg4cpu = (conn4 > 0) ? (server4ttcpu / conn4) : 0,
        avg4lat = (conn4 > 0) ? (server4ttlat / conn4) : 0;

    sendStack.push({'machine': 6050, 'isActive': serversActive[0], 'conn': conn0, 'cpu': avg0cpu, 'lat': avg0lat});
    sendStack.push({'machine': 6051, 'isActive': serversActive[1], 'conn': conn1, 'cpu': avg1cpu, 'lat': avg1lat});
    sendStack.push({'machine': 6052, 'isActive': serversActive[2], 'conn': conn2, 'cpu': avg2cpu, 'lat': avg2lat});
    sendStack.push({'machine': 6053, 'isActive': serversActive[3], 'conn': conn3, 'cpu': avg3cpu, 'lat': avg3lat});
    sendStack.push({'machine': 6054, 'isActive': serversActive[4], 'conn': conn4, 'cpu': avg4cpu, 'lat': avg4lat});
    // DEBUG
    // console.log('sendStack', sendStack);

    // TODO: Insert function to evaluate workload on all nodes here
    var callback = function() {
        sendStack.push(benchmark);
        res.send(JSON.stringify(sendStack));

        // Clear variables after responding to client AJAX call
        infoStack.splice(0, infoStack.length);
        sendStack.splice(0, sendStack.length);
        server0ttcpu = server1ttcpu = server2ttcpu = server3ttcpu = server4ttcpu = mastercpu = 0.0;
        server0ttlat = server1ttlat = server2ttlat = server3ttlat = server4ttlat = 0.0;
        conn0 = conn1 = conn2 = conn3 = conn4 = 0;
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
        benchmark['time'] = new Date().getTime() / 1000;
    });
    callback();
}

/*
 * Begin dynamic load balancing with Fib Heap
 */

