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
    var remoteCallback;

    var commChannel = options.commChannel,  
        stunServer = options.stunServer,
        sourcevid = options.sourcevid,
        remotevid = options.remotevid;

    var localStream = null;
    var remoteStream;
    var peerConn = null;
    var peerConnectionStarted = false;
    var mediaConstraints = {'mandatory': {
                            'OfferToReceiveAudio':true, 
                            'OfferToReceiveVideo':true }};
   
    var logg = function(s) { console.log(s); };

    commChannel.addMessageCallback(processSignalingMessage);

    that.startVideo = function() {
        try { 
            getUserMedia({audio: true, video: true}, successCallback, errorCallback);
        } catch (e) {
            getUserMedia("video,audio", successCallback, errorCallback);
        }
        function successCallback(stream) {
            sourcevid.src = window.webkitURL.createObjectURL(stream);
            //sourcevid.style.webkitTransform = "rotateY(180deg)";
            localStream = stream;
            logg('local stream started');
        }
        function errorCallback(error) {
            logg('An error occurred: [CODE ' + error.code + ']');
        }
    }
 
    that.stopVideo = function() {
        sourcevid.src = "";
    }

    // start the connection upon user request
    that.call = function() {
        if (!peerConnectionStarted && localStream) {
            logg("Creating PeerConnection.");
            createPeerConnection();
        } else if (!localStream){
            alert("Please start the video first");
            logg("localStream not started");
            return;
        } else {
            logg("peer SDP offer already made");
        }
        logg("create offer");
        peerConn.createOffer(setLocalAndSendMessage, null, mediaConstraints);
    }

    that.onHangUp = function() {
        logg("Hang up.");
        if (peerConnectionStarted) {
            commChannel.sendMessage({type: 'bye'});
            closeSession();
        }
    }

    that.addRemoteCallback = function(f){
        remoteCallback = f;
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
            alert("Failed to create PeerConnection, exception: " + e.message);
            return;
        }
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
        remoteCallback(true);
    }

    // when remote removes a stream, remove it from the local video element
    function onRemoteStreamRemoved(event) {
        logg("Remove remote stream");
        remotevid.src = "";
        remoteCallback(false);
    }

    function onIceCandidate(event) {
        if (event.candidate) {
          commChannel.sendMessage({type: 'candidate',
                       label: event.candidate.sdpMLineIndex,
                       id: event.candidate.sdpMid,
                       candidate: event.candidate.candidate});
        } else {
          logg("End of candidates.");
        }
    }
 
    function onMessage(evt) {
        logg("RECEIVED: " + evt.data);
        processSignalingMessage(evt.data);
    }

    function processSignalingMessage(message) {
        var msg = JSON.parse(message);
        logg("processSignalingMessage type(" + msg.type + ")= " + message);
       
        if (msg.type === 'offer') {
            if(!peerConnectionStarted && localStream) {                   
                createPeerConnection();
                //set remote description
                peerConn.setRemoteDescription(new RTCSessionDescription(msg));
                //create answer
                logg("Sending answer to peer.");
                peerConn.createAnswer(setLocalAndSendMessage, null, mediaConstraints);                
            } else {
                logg('peerConnection has already been started');
            }         
        } else if (msg.type === 'answer' && peerConnectionStarted) {
            logg("setRemoteDescription...");
            peerConn.setRemoteDescription(new RTCSessionDescription(msg));
        } else if (msg.type === 'candidate' && peerConnectionStarted) {
            var candidate = new RTCIceCandidate({sdpMLineIndex:msg.label, candidate:msg.candidate});
            peerConn.addIceCandidate(candidate);
        } else if (msg.type === 'bye' && peerConnectionStarted) {
            onRemoteHangUp();  
        } else {
            logg("message unknown:" + message);
        } 
    }

    function setLocalAndSendMessage(sessionDescription) {
        peerConn.setLocalDescription(sessionDescription);
        commChannel.sendMessage(sessionDescription);
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
            commChannel.sendMessage({type: 'bye'});
        }
    }

    return that;
};



