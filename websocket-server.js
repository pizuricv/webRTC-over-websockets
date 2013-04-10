var WebSocketServer = require('websocket').server;
var http = require('http');
var clientConnections = [];
var people = {};
var connectionDict = {};
var rooms = {};
var PRESENCE_REFRESH_RATE = 5000;

var server = http.createServer(function(request, response) {
    // process HTTP request. Since we're writing just WebSockets serve we don't have to implement anything.
});

server.listen(1337, function() {
    console.log('Server is listening on port 1337');
});

wsServer = new WebSocketServer({
    httpServer: server
});

setInterval(sendPresence, PRESENCE_REFRESH_RATE);

// This callback function is called every time someone tries to connect to the WebSocket server
// if the type of message is presence, it will send the broadcast. If the type is room, it will send the offer type as multicast, 
// if from and to field are defined, and connection.name that maches to exists, it will send the unicast.
// Otherwise, it will send the broadcast.

wsServer.on('request', function(request) {
    console.log('Connection from origin ' + request.origin);
    var connection = request.accept(null, request.origin);
    console.log('Connection address ' + connection.remoteAddress);
    clientConnections.push(connection);
    console.log('Number of connections ' + clientConnections.length);

    connection.on('message', function(message) {
        if (message.type === 'utf8') {
            // process WebSocket message
            console.log('Received Message ' + message.utf8Data);
            
            //parse the message
            msg = JSON.parse(message.utf8Data);
            var type = msg.type;
            var from = msg.from;
            var to = msg.to;

            //after presence message, socket connection is 'named', only such connections participate later.
            if(type === 'presence'){
                var name = msg.name;
                var status = msg.status;
                if(status === 'on'){
                    connection.name = name;
                    connectionDict[name] = connection;
                    console.log('adding '+name)
                    people[name] = 'on';
                } else {
                    remove(name);
                }
            } else if(type === 'room'){
                sendPresence(to, 'on');
                console.log('Sending multicast from ' + from + ": to room "+ to);
                if(rooms[to] === undefined)
                    rooms[to] = [];
                console.log('Number of people in the room ' + rooms[to].length);
                for(var i = 0; i < rooms[to].length; i ++){
                    var x = rooms[to][i];
                    if(connectionDict[x] !== undefined){
                        console.log('Sending offer from ' + from + ": to "+ x);
                        sendOffer(connectionDict[x], from, x);
                    }
                }
                if(rooms[to].indexOf(from) < 0)
                    rooms[to].push(from);
                return;
            } else if(to !== undefined && from !== undefined && connectionDict[to] !== undefined){
                console.log('Sending unicast from ' + from + ":"+ to);
                connectionDict[to].send(message.utf8Data, function (){
                    that = this;
                    sendCallback.call(that);
                });
                return;
            }

            console.log('Sending broadcast from '+ from);

            // broadcast message to all connected clientConnections that have name attached
            clientConnections.forEach(function (outputConnection) {
                if (outputConnection !== connection && outputConnection.name !== undefined) {
                    console.log('Sending data to '+ outputConnection.name);
                    outputConnection.send(message.utf8Data, function (){
                    that = this;
                    sendCallback.call(that);
                    });
                }
            });
        }
    });

    connection.on('close', function(conn) {
        console.log('Peer disconnected.'); 
        for(var i = 0; i < clientConnections.length; i++) {
            if(clientConnections[i] === conn) {
                clientConnections.splice(i, 1);
                if(conn.name !== undefined){
                    sendPresence(conn.name, 'off');
                }
                break;
            }
        }
    });
});


function sendOffer(connection, _from, _to){
    connection.send(JSON.stringify({type: 's-offer', from: _from, to: _to}), function (){
        that = this;
        sendCallback.call(that);
        });

}

function sendPresence(who, live){
    //console.log('sendind presence...');
    if(who !== undefined && live !== undefined){
        people[who] = live;
        clientConnections.forEach(function (connection) {
        if(connection.name !== undefined){
            connection.send(JSON.stringify({type: 'presence', name: who, status: live}), function (){
                that = this;
                sendCallback.call(that);
                });
            }
        });
    } else {
        for(var _name in people){
            clientConnections.forEach(function (connection) {
                if(people[_name] === 'off'){
                    console.log('Sending off presence '+ _name + ' to ' + connection.name);
                    connection.send(JSON.stringify({type: 'presence', name: _name, status: 'off' }), function (){
                    that = this;
                    sendCallback.call(that);
                    });
                } else if(people[_name] === 'on'){
                    console.log('Sending on presence '+ _name + ' to ' + connection.name);
                    connection.send(JSON.stringify({type: 'presence', name: _name, status: 'on'}), function (){
                    that = this;
                    sendCallback.call(that);
                    });
                }
            });
        }
        //console.log('sendPresence finished');
    }
}

function remove(name){
    console.log('removing '+ name);
    people[name] = 'off';
    delete connectionDict[name];
    var index = clientConnections.indexOf(name);
    clientConnections.splice(index, 1);
}

function sendCallback(err) {
    if (err){
        console.error("send() error: " + err);
        if(err === "Connection closed"){
            for(var i = 0; i < clientConnections.length; i++) {
                if(clientConnections[i] === this) {
                    clientConnections.splice(i, 1);
                    break;
                }
            }
        }
    }   
}

