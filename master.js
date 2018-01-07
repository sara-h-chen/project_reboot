/**
 * Created by schen on 1/6/18.
 */
var express = require('express');
var app = express();
var server = require('http').Server(app);
var fs = require('fs');

var redis = require('redis');
var sub = redis.createClient();

var infoStack = [];


app.use('/assets', express.static(__dirname + '/dashboard/assets'));

app.get('/',function(req,res){
    res.sendFile(__dirname + '/dashboard/dashboard.html');
});

app.get('/load', function(req,res) {
    res.send(JSON.stringify(infoStack));
    // Clear the stack whenever the client makes the AJAX call
    infoStack.splice(0, infoStack.length);
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