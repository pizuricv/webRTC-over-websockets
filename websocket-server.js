var WebSocketServer = require('websocket').server;
var http = require('http');
var clients = [];
var clientsToRemove = [];
var tmpConnection = null;

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
    console.log('Connection from origin ' + request.origin + '.');
    var connection = request.accept(null, request.origin);
    console.log('Connection ' + connection.remoteAddress);
    clients.push(connection);
    console.log('Number of connections ' + clients.length);

    
    // This is the most important callback for us, we'll handle
    // all messages from users here.
    connection.on('message', function(message) {
        if (message.type === 'utf8') {
            // process WebSocket message
            console.log('Received Message ' + message.utf8Data);
            // broadcast message to all connected clients
            clients.forEach(function (outputConnection) {
                if (outputConnection !== connection) {
                    tmpConnection = outputConnection;
                    console.log('Sending data ...');
                    outputConnection.send(message.utf8Data, sendCallback);
                }
            });
            clientsToRemove.forEach(function (connectionToRemove) {
                var index = clients.indexOf(connectionToRemove);
                clients.splice(index, 1);
            });
            clientsToRemove.length = 0;
            console.log('Number of connections ' + clients.length); 
        }
    });
    
    connection.on('close', function(connection) {
        // close user connection
        console.log('Peer disconnected.'); 
        var index = clients.indexOf(connection);
        clients.splice(index, 1);   
        console.log('Number of connections ' + clients.length);   
    });
});
