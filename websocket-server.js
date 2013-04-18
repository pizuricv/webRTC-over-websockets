var WebSocketServer = require('websocket').server;
var http = require('http');
var fs = require('fs');

var people = {};
var connectionDict = {};
var rooms = {};
var numberOfConnections = 0;

var settings = {
    websocketPort: 1337,
    refreshRate : 5000,
    autoCall : true,
    acceptNewUsers : false
}

fs.readFile(process.argv[2] || './settings.json', function(err, data) {
    if (err) {
        console.log('No settings.json found ('+err+'). Using default settings');
    } else {
        settings = JSON.parse(data.toString('utf8', 0, data.length));
    }
    console.log(settings);
});

fs.readFile('data/people.json', 'utf8', function (err, data) {
  if (err) throw err;
  var obj = JSON.parse(data.toString('utf8', 0, data.length));
  console.log('Loading people.json file');
  for(var i=0; i< obj.length; i ++){
    people[obj[i].id] = 'off';
    console.log('loaded ' + obj[i].id);
  }
});

var server = http.createServer(function(request, response) {
    // process HTTP request. Since we're writing just WebSockets serve we don't have to implement anything.
}).listen(settings.websocketPort, function() {
    console.log('Socket server is listening on port ' + settings.websocketPort);
});

wsServer = new WebSocketServer({
    httpServer: server
});

setInterval(sendPresence, settings.refreshRate);

// This callback function is called every time someone tries to connect to the WebSocket server
// if the type of message is presence, it will send the broadcast. If the type is room, it will send the offer type as multicast, 
// if from and to field are defined, and connection.name that maches to exists, it will send the unicast.
// Otherwise, it will send the broadcast.

wsServer.on('request', function(request) {
    numberOfConnections ++;
    console.log('Connection from origin ' + request.origin);
    var connection = request.accept(null, request.origin);
    console.log('Connection address ' + connection.remoteAddress);
    console.log('Number of connections ' + numberOfConnections);

    connection.on('message', function(message) {
        if (message.type === 'utf8') {
            // process WebSocket message
            console.log('Received Message ' + message.utf8Data);
            
            //parse the message
            msg = JSON.parse(message.utf8Data);
            var type = msg.type;
            var from = msg.from;
            var to = msg.to;
            var name;

            //accept only messages that are authorized, in simple case, we assume that the
            //first call is the presence with a name of the caller
            if(type !== 'presence' && connection.name === undefined){
                console.log('connection not allowed, name not provided');
                return;
            }

            //after presence message, socket connection is 'named', only such connections participate later.
            if(type === 'presence'){
                name = msg.name;
                if(people[name] === undefined && !settings.acceptNewUsers){
                    console.log('Unknown user not allowed');
                    return;
                }
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
                if(rooms[to] === undefined)
                    rooms[to] = [];
                console.log('Number of people in the room ' + rooms[to].length);
                console.log('Sending multicast from ' + from + ": to room "+ to);
                if(settings.autoCall){
                    for(var i = 0; i < rooms[to].length; i ++){
                        var x = rooms[to][i];
                        if(connectionDict[x] !== undefined){
                            console.log('Sending offer from ' + from + ": to "+ x);
                            sendOffer(connectionDict[x], from, x);
                        }
                    }
                }
                if(rooms[to].indexOf(from) < 0)
                    rooms[to].push(from);
                return;
            } else if(to !== undefined && from !== undefined){
                if(connectionDict[to] !== undefined && people[to] !== 'off'){
                    console.log('Sending unicast from ' + from + ":"+ to);
                    connectionDict[to].send(message.utf8Data, sendCallback);
                    }
                } else {
                    console.log("message couldn't be passed to " + to);
                }
                return;
            }

            console.log('Sending broadcast from '+ from);

            // broadcast message to all clients that have name attached
            for(var client in connectionDict){
                if(client !== name){
                    console.log('Sending data to '+ client);
                    connectionDict[client].send(message.utf8Data, sendCallback);
                }
            }
        });

    connection.on('close', function(conn) {
        console.log('Peer disconnected.'); 
        numberOfConnections --;
        remove(connection.name);
    });
});


function sendOffer(connection, _from, _to){
    connection.send(JSON.stringify({type: 's-offer', from: _from, to: _to}), sendCallback);

}

function sendPresence(){
    //console.log('sendind presence...');
    for(var _name in people){
        for(var client in connectionDict){ 
            if(people[_name] === 'off'){
                console.log('Sending off presence '+ _name + ' to ' + client);
                connectionDict[client].send(JSON.stringify({type: 'presence', name: _name, status: 'off'}), sendCallback);
            } else if(people[_name] === 'on'){
                console.log('Sending on presence '+ _name + ' to ' + client);
                connectionDict[client].send(JSON.stringify({type: 'presence', name: _name, status: 'on'}), sendCallback);
            }
        }
    }
    for(var room in rooms){
        for(var i = 0; i < rooms[room].length; i ++){
            var client = rooms[room][i];
            if(connectionDict[client] !== undefined){
                console.log('Sending on presence of room '+ room + ' to ' + client);
                connectionDict[client].send(JSON.stringify({type: 'presence', name: room, 
                    status: 'on', room: true}), sendCallback);
            }
        }
    }
    //console.log('sendPresence finished');
}

function remove(name){
    if(name !== undefined && name !== null){
        console.log('removing '+ name);
        people[name] = 'off';
        delete connectionDict[name];
    }
}

function sendCallback(err) {
    if (err){
        console.error("send() error: " + err);
    }   
}

