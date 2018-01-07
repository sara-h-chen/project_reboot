/**
 * Created by schen on 1/6/18.
 */
var express = require('express');
var app = express();
var server = require('http').Server(app);

var redis = require('redis');
var sub = redis.createClient();

app.use('/css',express.static(__dirname + '/css'));
app.use('/js',express.static(__dirname + '/js'));
app.use('/assets',express.static(__dirname + '/assets'));

app.get('/',function(req,res){
    res.sendFile(__dirname+'dashboard/index.html');
});

