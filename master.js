/**
 * Created by schen on 1/6/18.
 */
var express = require('express');
var app = express();
var server = require('http').Server(app);
var fs = require('fs');
var pusage = require('pidusage');

var redis = require('redis');
var sub = redis.createClient();

var infoStack = [];
var benchmark = {};

app.use('/assets', express.static(__dirname + '/dashboard/assets'));

app.get('/',function(req,res){
    res.sendFile(__dirname + '/dashboard/dashboard.html');
});

app.get('/load', function(req,res) {
    var callback = function() {
        infoStack.push(benchmark);
        res.send(JSON.stringify(infoStack));
        infoStack.splice(0, infoStack.length);
    };
    processUsage(callback);
    // Clear the stack whenever the client makes the AJAX call
});

server.listen(process.env.PORT || 8000, function() {
    console.log('Master listening on ' + server.address().port);
});

var pushInfo = function(channel, packet) {
    // Push data onto stack
    infoStack.push(JSON.parse(packet));
};
sub.on('message', pushInfo);
sub.subscribe('master');

function processUsage(callback) {
    pusage.stat(process.pid, function(err, stat) {
        benchmark['machine'] = server.address().port;
        benchmark['cpu'] = stat.cpu;
        benchmark['memory'] = stat.memory; // these are bytes
        benchmark['time'] = new Date().getTime() / 1000;
    });
    callback();
}