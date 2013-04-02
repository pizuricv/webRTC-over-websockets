var signaling = function(options){
	
	var socket = new WebSocket(options.webSocketAddress);	
	var logg = function(s) { console.log(s); };

	var myId = options.id;

	var that = {};
	var offerCallback, answerCallback, presenceCallback, messageCallback;

	that.addPresenceCallback = function(f){
		presenceCallback = f;
	};

	that.addMessageCallback = function(f){
		messageCallback = f;
	};

	that.addOfferCallback = function(f){
		offerCallback = f;
	};

	that.addAnswerCallback = function(f){
		answerCallback = f;
	};

	that.sendMessage = function(message, to) {
        sendMsg(message, to);
    }

	that.sendPresence = function(_name, stat){
		_status = stat || 'on';
		myId = _name;
        sendMsg({type: 'presence', name: _name, status: _status});
    }

	that.offer = function(_id){
		sendMsg({type: 's-offer', origin: myId, id: _id}, _id);
	};

	that.answer = function(to, _answer){
		sendMsg({type: 's-answer', origin: myId, answer: _answer}, to);
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
       
        if (msg.type === 's-offer' && msg.origin !== myId) {
        	logg('offer recevied from ', msg.origin);
        	offerCallback(msg.origin);
        } else if (msg.type === 's-answer' && msg.origin !== myId) {
            logg('answer recevied from ' +  msg.origin + '['+ msg.answer + ']');
            if(msg.answer === 'accept')
            	answerCallback(msg.origin, msg.answer);
        } else if (msg.type === 'presence') {
            logg('presence from: '+ msg.name);
            presenceCallback(msg.name, msg.status);
        } else {
        	if(messageCallback !== undefined) 
        		messageCallback(message, msg.from);
        }
    }

    return that;

}