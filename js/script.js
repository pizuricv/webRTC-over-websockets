/* 
 input arguments:
 var Input = {
    sourcevid,
    remotevid,
    webSocketAddress,
    stunServer
 }
*/

var webrtc = function(options) {
    
    var that = {};
    
    var socket = new WebSocket(options.webSocketAddress),  
        stunServer = options.stunServer,
        sourcevid = options.sourcevid,
        remotevid = options.remotevid;

    var localStream = null;
    var remoteStream;
    var peerConn = null;
    var peerConnectionStarted = false;
    var isRTCPeerConnection = true; //RFC 5245
    var mediaConstraints = {'mandatory': {
                            'OfferToReceiveAudio':true, 
                            'OfferToReceiveVideo':true }};

    var logg = function(s) { console.log(s); };

    that.startVideo = function() {
        try { 
            getUserMedia({audio: true, video: true}, successCallback, errorCallback);
        } catch (e) {
            getUserMedia("video,audio", successCallback, errorCallback);
        }
        function successCallback(stream) {
            sourcevid.src = window.webkitURL.createObjectURL(stream);
            sourcevid.style.webkitTransform = "rotateY(180deg)";
            localStream = stream;
        }
        function errorCallback(error) {
            logg('An error occurred: [CODE ' + error.code + ']');
        }
    }
 
    that.stopVideo = function() {
        sourcevid.src = "";
    }

    // start the connection upon user request
    that.connect = function() {
        if (!peerConnectionStarted && localStream) {
            logg("Creating PeerConnection.");
            createPeerConnection();
        } else if (!localStream){
            alert("Please start the video first");
            logg("localStream not started");
        } else {
            logg("peer SDP offer already made");
        }

        //create offer
        if (isRTCPeerConnection) {
            logg("create offer with RTC");
            peerConn.createOffer(setLocalAndSendMessage, null, mediaConstraints);
        } else {
            logg("create offer without RTC");
            var offer = peerConn.createOffer(mediaConstraints);
            peerConn.setLocalDescription(peerConn.SDP_OFFER, offer);
            sendMessage({type: 'offer', sdp: offer.toSdp()});
            peerConn.startIce();
        }
    }

    that.onHangUp = function() {
        logg("Hang up.");
        if (peerConnectionStarted) {
            sendMessage({type: 'bye'});
            closeSession();
        }
    }

    function createPeerConnection() {
        try {
            logg("Creating peer connection");
            var servers = [];
            servers.push({'url':'stun:' + stunServer});
            var pc_config = {'iceServers':servers};     
            peerConn = new RTCPeerConnection(pc_config);
            peerConn.onicecandidate = onIceCandidate;
            logg("Connected using stun server "+ stunServer);
            peerConnectionStarted = true;
        } catch (e) {
            try {
                peerConn = new RTCPeerConnection('STUN ' + stunServer, onIceCandidate00);
                isRTCPeerConnection = false;
                logg("Connected without RTC connection");
                peerConnectionStarted = true;
            } catch (e) {
                logg("Failed to create PeerConnection, exception: " + e.message);
            }
        }
        logg("RTCPeerConnection: " + isRTCPeerConnection); 
        peerConn.onaddstream = onRemoteStreamAdded;
        peerConn.onremovestream = onRemoteStreamRemoved;

        logg('Adding local stream...');
        peerConn.addStream(localStream);
    }

    // when remote adds a stream, hand it on to the local video element
    function onRemoteStreamAdded(event) {
        logg("Added remote stream");
        if (window.webkitURL) {
            remotevid.src = window.webkitURL.createObjectURL(event.stream);
        } else {
            remotevid.src = event.stream;
        }
    }

    // when remote removes a stream, remove it from the local video element
    function onRemoteStreamRemoved(event) {
        logg("Remove remote stream");
        remotevid.src = "";
    }

    function onIceCandidate(event) {
        if (event.candidate) {
          sendMessage({type: 'candidate',
                       label: event.candidate.sdpMLineIndex,
                       id: event.candidate.sdpMid,
                       candidate: event.candidate.candidate});
        } else {
          logg("End of candidates.");
        }
    }
 
    function onIceCandidate00(candidate, moreToFollow) {
        if (candidate) {
            sendMessage({type: 'candidate', label: candidate.label, candidate: candidate.toSdp()});
        }
        if (!moreToFollow) {
          logg("End of candidates.");
        }
    }

    function onMessage(evt) {
        logg("RECEIVED: " + evt.data);
        if (isRTCPeerConnection)
          processSignalingMessage(evt.data);
        else
          processSignalingMessage00(evt.data);
    }


    //########## socket related calls
    // accept connection request
    socket.addEventListener("message", onMessage, false);

    socket.addEventListener("error", function(event) {
        logg("SOCKET Error: " + event);
    });
 
    socket.addEventListener("close", function(event) {
        logg("SOCKET Close: " + event);
    });


    // send the message to the websocket server
    function sendMessage(message) {
        var mymsg = JSON.stringify(message);
        logg("SOCKET Send: " + mymsg);
        socket.send(mymsg);
    }

    function processSignalingMessage(message) {
        var msg = JSON.parse(message);
        logg("processSignalingMessage type(" + msg.type + ")= " + message);
     
        if (msg.type === 'offer') {
            if (!peerConnectionStarted && localStream) {
                createPeerConnection();
                if (isRTCPeerConnection) {
                    //set remote description
                    peerConn.setRemoteDescription(new RTCSessionDescription(msg));
                    //create answer
                    logg("Sending answer to peer.");
                    peerConn.createAnswer(setLocalAndSendMessage, null, mediaConstraints);
                } else {
                    //set remote description
                    peerConn.setRemoteDescription(peerConn.SDP_OFFER, new SessionDescription(msg.sdp));
                    //create answer
                    var offer = peerConn.remoteDescription;
                    var answer = peerConn.createAnswer(offer.toSdp(), mediaConstraints);
                    logg("Sending answer to peer.");
                    setLocalAndSendMessage00(answer);
                }
            }
        } else if (msg.type === 'answer' && peerConnectionStarted) {
            peerConn.setRemoteDescription(new RTCSessionDescription(msg));
        } else if (msg.type === 'candidate' && peerConnectionStarted) {
            var candidate = new RTCIceCandidate({sdpMLineIndex:msg.label, candidate:msg.candidate});
            peerConn.addIceCandidate(candidate);
        } else if (msg.type === 'bye' && peerConnectionStarted) {
            onRemoteHangUp();
        } else {
            alert("message unknown:" + message);
        }
    }

    function processSignalingMessage00(message) {
        var msg = JSON.parse(message);
        logg("processSignalingMessage00 type(" + msg.type +")= " + message);

        //--> will never happened since isRTCPeerConnection=true initially
        if (msg.type === 'offer')  {
            logg("received offer type for RTC flag =" + isRTCPeerConnection);
            alert("received offer type for RTC flag =" + isRTCPeerConnection);
        } else if (msg.type === 'answer' && peerConnectionStarted) {
            peerConn.setRemoteDescription(peerConn.SDP_ANSWER, new SessionDescription(msg.sdp));
        } else if (msg.type === 'candidate' && peerConnectionStarted) {
            var candidate = new IceCandidate(msg.label, msg.candidate);
            peerConn.processIceMessage(candidate);
        } else if (msg.type === 'bye' && peerConnectionStarted) {
            onRemoteHangUp();
        } else {
            logg("ERROR: message not processed");
        }
    }
 
    function setLocalAndSendMessage(sessionDescription) {
        peerConn.setLocalDescription(sessionDescription);
        sendMessage(sessionDescription);
    }

    function setLocalAndSendMessage00(answer) {
        peerConn.setLocalDescription(peerConn.SDP_ANSWER, answer);
        sendMessage({type: 'answer', sdp: answer.toSdp()});
        peerConn.startIce();
    }
 
    function onRemoteHangUp() {
        logg("Remote Hang up.");
        closeSession();
    }
 
    function closeSession() {
        peerConn.close();
        peerConn = null;
        peerConnectionStarted = false;
        remotevid.src = ""; 
    }
 
    window.onbeforeunload = function() {
        if (peerConnectionStarted) {
            sendMessage({type: 'bye'});
        }
    }

    return that;
};



