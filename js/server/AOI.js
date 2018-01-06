/**
 * Created by Jerome on 24-02-17.
 */

var GameServer = require('./GameServer.js').GameServer;
var UpdatePacket = require('./UpdatePacket.js').UpdatePacket;
var AOIutils = require('../AOIutils.js').AOIutils;

function AOI(x,y,w,h){
    this.id = AOIutils.lastAOIid++;
    this.x = x;
    this.y = y;
    this.width = w;
    this.height = h;
    this.entities = []; // list of entities situated within the area corresponding to this AOI
    this.updatePacket = new UpdatePacket();
}

AOI.prototype.getUpdatePacket = function(){
    return (this.updatePacket ? this.updatePacket : null);
};

AOI.prototype.clear = function(){
    this.updatePacket = new UpdatePacket();
};

AOI.prototype.addEntity = function(isRedis,entity,previous){
    this.entities.push(entity);
    if(!isRedis && (entity.responsibleMachine === GameServer.portNumber)) {
        if(entity.constructor.name == 'Player') GameServer.server.addToRoom(entity.socketID,'AOI'+this.id);
    }
    GameServer.handleAOItransition(isRedis,entity,previous);
};

AOI.prototype.deleteEntity = function(entity) {
    var idx = this.entities.indexOf(entity);
    if (idx >= 0) this.entities.splice( idx, 1 );
    if(entity.constructor.name == 'Player') GameServer.server.leaveRoom(entity.socketID,'AOI'+this.id);
};

module.exports.AOI = AOI;