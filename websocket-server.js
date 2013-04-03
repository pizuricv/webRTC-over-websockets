var WebSocketServer = require('websocket').server;
var http = require('http');
var clientConnections = [];
var people = {};
var connectionDict = {};


var server = http.createServer(function(request, response) {
    // process HTTP request. Since we're writing just WebSockets server
    // we don't have to implement anything.
});
server.listen(1337, function() {
    console.log('Server is listening on port 1337');
});

// create the server
wsServer = new WebSocketServer({
    httpServer: server
});

function sendCallback(err) {
    if (err){
        console.error("send() error: " + err);
    }   
}

setInterval(sendPresence, 5000);

// This callback function is called every time someone
// tries to connect to the WebSocket server
wsServer.on('request', function(request) {
    console.log('Connection from origin ' + request.origin);
    var connection = request.accept(null, request.origin);
    console.log('Connection address ' + connection.remoteAddress);
    clientConnections.push(connection);
    console.log('Number of connections ' + clientConnections.length);

    
    // This is the most important callback for us, we'll handle
    // all messages from users here.
    connection.on('message', function(message) {
        if (message.type === 'utf8') {
            // process WebSocket message
            console.log('Received Message ' + message.utf8Data);
            
            //parse the message
            msg = JSON.parse(message.utf8Data);
            var type = msg.type;
            var from = msg.from;
            var to = msg.to;

            //after presence message, socket connection is 'named', 
            //only such connections participate later.
            if(type === 'presence'){
                var name = msg.name;
                var status = msg.status;
                if(name !== undefined){
                    connection.name = name;
                    connectionDict[name] = connection;
                }
                if(status !== undefined){
                    if(status === 'on'){
                        console.log('adding '+name)
                        people[name] = 'on';
                    } else  {
                        remove(name);
                    }
                }
            } else if(to !== undefined && from !== undefined && connectionDict[to] !== undefined){
                console.log('Sending unicast from ' + from + ":"+ to);
                connectionDict[to].send(message.utf8Data, sendCallback);
                return;
            }

            console.log('Sending broadcast from '+ from);

            // broadcast message to all connected clientConnections that have name attached
            clientConnections.forEach(function (outputConnection) {
                if (outputConnection !== connection && outputConnection.name !== undefined) {
                    console.log('Sending data to '+ outputConnection.name);
                    outputConnection.send(message.utf8Data, sendCallback);
                }
            });
        }
    });

    connection.on('close', function(connection) {
        console.log('Peer disconnected.'); 
        for(var i = 0; i < clientConnections.length; i++) {
            if(clientConnections[i] === connection) {
                clientConnections.splice(i, 1);
                if(connection.name !== undefined){
                    remove(connection.name);
                    sendPresence(connection.name, 'off');
                }
                break;
            }
        }
    });
});

function remove(name){
    console.log('removing '+ name)
    delete people[name];
    delete connectionDict[name];
    var index = clientConnections.indexOf(name);
    clientConnections.splice(index, 1);
}

function sendPresence(who, live){
    //console.log('sendind presence...');
    if(who !== undefined && live !== undefined){
        clientConnections.forEach(function (connection) {
            people[who] = live;
            connection.send(JSON.stringify({type: 'presence', name: who, status: live}), sendCallback);
        });
    } else {
        for(var _name in people){
            clientConnections.forEach(function (connection) {
                if(people[_name] ==='off'){
                    //console.log('Sending off presence '+ _name + ' to ' + connection.name);
                    connection.send(JSON.stringify({type: 'presence', name: _name, status: 'off' }), sendCallback);
                } else {
                    //console.log('Sending on presence '+ _name + ' to ' + connection.name);
                    connection.send(JSON.stringify({type: 'presence', name: _name, status: 'on'}), sendCallback);
                }
            });
            if(people[_name] === 'off'){
                remove(_name);
            }

        }
        //console.log('sendPresence finished');
    }
}

