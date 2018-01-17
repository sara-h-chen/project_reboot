/**
 * Created by schen on 1/6/18.
 */
var express = require('express');
var app = express();
var server = require('http').Server(app);
var fs = require('fs');

const dgram = require('dgram');
var udpSocket = dgram.createSocket('udp4');

var pusage = require('pidusage');
var redis = require('redis');
var sub = redis.createClient();

// Manage command line arguments
var myArgs = require('optimist')
    .usage('Usage: node master.js -d[c/l]')
    .argv;
var FibonacciHeap = require('@tyriar/fibonacci-heap').FibonacciHeap;

// Manage incoming
var infoStack = [];
// Manage outgoing
var sendStack = [];
var benchmark = {};

// For the dynamic load balancing
var chosenParameter;
var fibHeap = new FibonacciHeap();
// For the Fibonacci Heap to maintain the server with minimum workload
var serversLastAvg = [0.0, 0.0, 0.0, 0.0, 0.0];
var nodePointers = [null, null, null, null, null];
// Checks if the increase in CPU usage persists for at least 2 ticks
var increaseIsPersistent = [false, false, false, false, false];
// Checks if drops to 0 are due to lost packets
var zeroIsPersistent = [false, false, false, false, false];

// Track if servers are active
// Initialize variables to calculate current workloads
var serversActive = [false, false, false, false, false];
var serversTotalCpu = [0.0, 0.0, 0.0, 0.0, 0.0];
var serversTotalLat = [0.0, 0.0, 0.0, 0.0, 0.0];
var conn = [0, 0, 0, 0, 0];

var masterTime = "",
    masterCpu = 0.0;

// TODO: Change this if this threshold doesn't work
var maxThreshold = 0.2;
var serverAddresses = JSON.parse(fs.readFileSync(__dirname + '/assets/json/server_addresses.json')).servers;

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

    if(myArgs.d) {
        if (myArgs.c) {
            chosenParameter = avgCpu;
        } else if (myArgs.l) {
            chosenParameter = avgLat;
        } else if (!myArgs.c && !myArgs.l) {
            throw "Missing command line argument";
        }

        // Maintain Fibonacci Heap only if dynamically load balancing
        maintainMinWorkloadServer();
        // TODO: Insert function to evaluate workload on all nodes here
        // TODO: Pre-empt transfer if exceeds threshold
        // TODO: Test workload evaluation function
    }

    var callback = function() {
        sendStack.push(benchmark);
        res.send(JSON.stringify(sendStack));

        // Clear variables after responding to client AJAX call
        infoStack.splice(0, infoStack.length);
        sendStack.splice(0, sendStack.length);
        serversTotalCpu = [0.0, 0.0, 0.0, 0.0, 0.0];
        serversTotalLat = [0.0, 0.0, 0.0, 0.0, 0.0];
        conn = [0, 0, 0, 0, 0];
        masterCpu = 0.0;
    };
    processUsage(callback);
});

// -d flag specifies if dynamic load balancing is active;
// defaults to static load balancing
server.listen(process.env.PORT || 8000, function() {
    if(myArgs.d) {
        console.log('The system will now run with dynamic load balancing. WARNING: Ensure you have either [c/l] as command line arguments to load balance by CPU USAGE or LATENCY.');
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
 * Use the Fibonacci Heap to maintain server with min workload
 */
function maintainMinWorkloadServer() {
    for (var server=0; server < serversActive.length; server++) {
        // If server has just become active, insert
        if(serversActive[server] && !nodePointers[server]) {
            // Keep track of the inserted node for each server
            // K: Average workload, V: server
            nodePointers[server] = fibHeap.insert(chosenParameter[server], server);
        // If server has been active and has previous workload
        } else if(serversActive[server]) {
            if(chosenParameter[server] <= serversLastAvg[server]) {
                // Breaks persistence of increase since it hasn't
                increaseIsPersistent[server] = false;

                // In case packets come in empty for a single tick
                if (chosenParameter[server] == 0 && !zeroIsPersistent[server]) {
                    zeroIsPersistent[server] = true;
                } else if (chosenParameter[server] == 0 && zeroIsPersistent[server]) {
                    fibHeap.decreaseKey(nodePointers[server], chosenParameter[server]);
                    zeroIsPersistent[server] = false;
                // Average CPU/lat is not 0
                } else if (chosenParameter[server] < serversLastAvg[server]) {
                    fibHeap.decreaseKey(nodePointers[server], chosenParameter[server]);
                }

            } else if(chosenParameter[server] > serversLastAvg[server]) {
                if(increaseIsPersistent[server]) {
                    fibHeap.delete(nodePointers[server]);
                    nodePointers[server] = fibHeap.insert(chosenParameter[server], server);
                    increaseIsPersistent[server] = false;

                    // Check only if increase is persistent
                    if(chosenParameter[server] > maxThreshold) {
                        var callback = sendCommand;
                        redistributeWorkload(fibHeap, server, callback);
                    }
                } else {
                    // Ignore the temporary increase; do not update the stored value
                    increaseIsPersistent[server] = true;
                    continue;
                }
            }

        }
        serversLastAvg[server] = chosenParameter[server];
    }
    // DEBUG
    // console.log('average params this iteration', chosenParameter);
    // console.log('fib heap ========>> ', fibHeap);
    // console.log('is increase persistent? ', increaseIsPersistent);
    // console.log('is zero persistent? ', zeroIsPersistent);
}

function sendCommand(portNumber, hostAddress) {
    var message = Buffer.from('breach');
    udpSocket.send(message, 0, message.length, portNumber, hostAddress, function(err, bytes) {
        if(err) throw err;
        // DEBUG
        // console.log('sending UDP message...');
    });
}

/*
 * Called when workload on server exceeds its threshold;
 * sends a UDP packet to the least loaded server of the adjacent
 * servers or the entire system
 */
function redistributeWorkload(fibHeap, index, callback) {
    // DEBUG
    // console.log('redistributing ====> ', fibHeap);
    var targetServer;
    // From the 2nd server to the 2nd last server
    if (index > 0 && index < (serversActive.length-1)) {
        // If both adjacent servers are active and exceed the threshold
        if(serversActive[index-1] && serversActive[index+1]) {
            if(chosenParameter[index-1] > maxThreshold && chosenParameter[index+1] > maxThreshold) {
                targetServer = fibHeap.findMinimum().value;
            } else {
                targetServer = (chosenParameter[index-1] >= chosenParameter[index+1]) ? index+1 : index-1;
            }
        // Only one adjacent server is active
        } else if(serversActive[index-1]) {
            targetServer = (chosenParameter[index-1] > maxThreshold) ? fibHeap.findMinimum().value : index-1;

        } else if(serversActive[index+1]) {
            targetServer = (chosenParameter[index+1] > maxThreshold) ? fibHeap.findMinimum().value : index+1;

        // Neither adjacent servers are active
        } else {
            targetServer = fibHeap.findMinimum().value;
        }

    // On the first server
    } else if (index == 0) {
        // If adjacent server is active and exceeds threshold
        if(serversActive[index+1]) {
            targetServer = (chosenParameter[index+1] > maxThreshold) ? fibHeap.findMinimum().value : index+1;
        } else {
            targetServer = fibHeap.findMinimum().value
        }

    // On the last server
    } else if (index == (serversActive.length-1)) {
        if(serversActive[index-1]) {
            targetServer = (chosenParameter[index-1] > maxThreshold) ? fibHeap.findMinimum().value : index-1;
        } else {
            targetServer = fibHeap.findMinimum().value;
        }
    }

    // DEBUG
    // console.log('target ', targetServer, ' index ', index);

    // Prevent sending to self
    // TODO: Make sure you change this to NOT equal
    if(targetServer == index) {
        var sendToPort = serverAddresses[0][targetServer].port;
        var sendToHost = serverAddresses[0][targetServer].host;
        callback(sendToPort, sendToHost);
    }
}