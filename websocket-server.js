var WebSocketServer = require('websocket').server;
var http = require('http');
var clients = [];
var clientsToRemove = [];
var tmpConnection = null;
var people = [];
var peopleToRemove = [];
//var fromTo = {};

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
        if(err === "Connection closed")
            clientsToRemove.push(tmpConnection);
    }   
}

// This callback function is called every time someone
// tries to connect to the WebSocket server
wsServer.on('request', function(request) {
    console.log('Connection from origin ' + request.origin);
    var connection = request.accept(null, request.origin);
    console.log('Connection address ' + connection.remoteAddress);
    clients.push(connection);
    console.log('Number of connections ' + clients.length);

    
    // This is the most important callback for us, we'll handle
    // all messages from users here.
    connection.on('message', function(message) {
        if (message.type === 'utf8') {
            // process WebSocket message
            console.log('Received Message ' + message.utf8Data);
            
            //parse the message
            msg = JSON.parse(message.utf8Data);
            var type = msg.type;

            if(type !== undefined && type === 'presence'){
                var name = msg.name;
                var status = msg.status;
                if(name !== undefined && status !== undefined){
                    if(status === 'on'){
                        console.log('adding '+name)
                        people.push(name);
                    } else  {
                        console.log('removing '+name)
                        peopleToRemove.push(name);
                    }
                    connection.name = name;
                }
            }


/*
            //get from field
            msg = JSON.parse(message.utf8Data);
            var from = msg.from;
            var to = msg.to;
            if(from !== undefined){
                fromTo[from] = connection;
            }
            if(to !== undefined && fromTo[to] !== undefined){
                console.log('Sending data p2p from ' + from + ":"+ to);
                fromTo[to].send(message.utf8Data, sendCallback);
                return;
            }
*/
            console.log('Sending broadcast');

            // broadcast message to all connected clients
            clients.forEach(function (outputConnection) {
                if (outputConnection !== connection) {
                    tmpConnection = outputConnection;
                    console.log('Sending data to '+ outputConnection.name);
                    outputConnection.send(message.utf8Data, sendCallback);
                }
            });
            cleanConnections();
            sendPresence();
        }
    });
    
    function cleanConnections(){
        clientsToRemove.forEach(function (connectionToRemove) {
            var index = clients.indexOf(connectionToRemove);
            clients.splice(index, 1);
            index = people.indexOf(connectionToRemove.name);
            peopleToRemove.push(connectionToRemove.name);
            people.splice(index,1);
        });
        clientsToRemove.length = 0;
        console.log('Number of connections ' + clients.length); 
    } 

    function sendPresence(){
        clients.forEach(function (connection) {
            peopleToRemove.forEach(function(_name){
                console.log('Sending off presence of '+ _name);
                connection.send(JSON.stringify({type: 'presence', name: _name, status: 'off'}));
            });
            peopleToRemove.length = 0;
            people.forEach(function(_name){
                console.log('Sending on presence of '+ _name);
                connection.send(JSON.stringify({type: 'presence', name: _name, status: 'on' }));
            });
        });
    }
    
    connection.on('close', function(connection) {
        console.log('Peer disconnected.'); 
    });
});
