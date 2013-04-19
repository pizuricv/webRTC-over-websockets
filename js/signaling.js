var signaling = function(options){
	
	var socket = new WebSocket(options.webSocketAddress);	
	var logg = function(s) { console.log(s); };

	var myId = options.id;

	var that = {};
    var callbacks = {};

    function getCallback(type){
        return callbacks[type] !== undefined ? callbacks[type] : function(){
            console.log("Callback of type " + type + " not found");
        };
    }

    that.addCallback = function(type, f){
        callbacks[type] = f;
    }    

	that.sendMessage = function(message, to) {
        sendMsg(message, to);
    }

	that.sendPresence = function(_name, stat){
		_status = stat || 'on';
		myId = _name;
        sendMsg({type: 'presence', name: _name, status: _status});
    }

    that.joinRoom = function(room){
        sendMsg({type: 'room'}, room);
    }

	that.callOtherParty = function(to){
		sendMsg({type: 's-offer'}, to);
	};

	that.answer = function(to, _answer){
		sendMsg({type: 's-answer', answer: _answer}, to);
	};

    function sendMsg(message, to){
    	message.from = myId;
        if(to !== undefined)  
            message.to = to;  
        var mymsg = JSON.stringify(message);
        logg("SOCKET Send: " + mymsg);
        socket.send(mymsg);
    }

	socket.addEventListener("message", onMessage, false);

    socket.addEventListener("error", function(event) {
        logg("SOCKET Error: " + event);
    });
 
    socket.addEventListener("close", function(event) {
        logg("SOCKET Close: " + event);
    });

    function onMessage(evt) {
        logg("RECEIVED: " + evt.data);
        processSignalingMessage(evt.data);
    }

    function processSignalingMessage(message) {
        var msg = JSON.parse(message);
        logg("processSignalingMessage type(" + msg.type + ")= " + message);
        getCallback(msg.type)(msg);
    }

    return that;

}