var webrtc = function(options) {            
    var my = {};

    var commChannel = options.commChannel,  
        stunServer = options.stunServer,
        sourcevid = options.sourcevid,
        remoteCallback : options.onremote;

    var localStream;
    var peerConn = {};

    //callback to start p2p connection between two parties
    commChannel.addAnswerCallback(call);
    commChannel.addMessageCallback(processSignalingMessage);

    function RTCPeer(pc_config, name) {
        this.from = name;
        this.rtc = new RTCPeerConnection(pc_config);
        that = this;
     
        this.rtc.onaddstream = function(event){
            logg("Added remote stream");
            remoteCallback(that.from, true, event.stream);
        };
        this.rtc.onremovestream = function(event) {
            logg("Remove remote stream");
            remoteCallback(that.from, false);
        };
        this.rtc.onicecandidate = function(event) {
            logg("send on Icecandidate");
            if (event.candidate) {
              commChannel.sendMessage({type: 'candidate',
                           label: event.candidate.sdpMLineIndex,
                           id: event.candidate.sdpMid,
                           candidate: event.candidate.candidate}, that.from);
            } else {
              logg("End of candidates.");
            }
        };
    }

    RTCPeer.prototype.createOffer = function(){
        logg("createOffer to " + this.from);
        that = this;
        
        var setLocalDescriptionAndMessage = function(sessionDescription){
            logg("setLocalDescriptionAndMessage");
            that.rtc.setLocalDescription(sessionDescription);
            commChannel.sendMessage(sessionDescription, that.from);
        }

        this.rtc.createOffer(setLocalDescriptionAndMessage, null, mediaConstraints);
    }

    RTCPeer.prototype.createAnswer = function(){
        logg("createAnswer to " + this.from);
        that = this;
        var setLocalDescriptionAndMessage = function(sessionDescription){
            logg("setLocalDescriptionAndMessage");
            that.rtc.setLocalDescription(sessionDescription);
            commChannel.sendMessage(sessionDescription, that.from);
        }
        this.rtc.createAnswer(setLocalDescriptionAndMessage, null, mediaConstraints);
    }

    RTCPeer.prototype.getRTC = function(){
        return this.rtc;
    }

    RTCPeer.prototype.getFrom = function(){
        return this.from;
    }

    var mediaConstraints = {'mandatory': {
                            'OfferToReceiveAudio':true, 
                            'OfferToReceiveVideo':true }};
   
    var logg = function(s) { console.log(s); };

    my.startVideo = function() {
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
 
    my.stopVideo = function() {
        sourcevid.src = "";
    }

    my.onHangUp = function() {
        logg("Hang up.");
        closeSession();
    }

    // start the connection upon user request
    function call(from, answer) {
        if (peerConn[from] === undefined && localStream) {
            logg("Creating PeerConnection with "+from);
            createPeerConnection(from);
        } else if (!localStream){
            alert("Please start the video first");
            logg("localStream not started");
            return;
        } else {
            logg("peer SDP offer already made");
        }
        logg("create offer");
        peerConn[from].createOffer();
    }


    function createPeerConnection(from) {
        try {
            logg("Creating peer connection with " + from);
            var servers = [];
            servers.push({'url':'stun:' + stunServer});
            var pc_config = {'iceServers':servers};     
            peerConn[from] = new RTCPeer(pc_config, from);
            logg("Connected using stun server "+ stunServer);
        } catch (e) {
            alert("Failed to create PeerConnection, exception: " + e.message);
            return;
        }
        logg('Adding local stream...');
        peerConn[from].getRTC().addStream(localStream);
    }

 
    function processSignalingMessage(message, from) {
        var msg = JSON.parse(message);
        logg("processSignalingMessage type(" + msg.type + ")= " + message);
       
        if (msg.type === 'offer') {
            if(peerConn[from] === undefined && localStream) {                   
                createPeerConnection(from);
                //set remote description
                peerConn[from].getRTC().setRemoteDescription(new RTCSessionDescription(msg));
                //create answer
                logg("Sending answer to peer.");
                peerConn[from].createAnswer();                
            } else {
                logg('peerConnection has already been started');
            }         
        } else if (msg.type === 'answer' && peerConn[from] !== undefined) {
            logg("setRemoteDescription...");
            peerConn[from].getRTC().setRemoteDescription(new RTCSessionDescription(msg));
        } else if (msg.type === 'candidate' && peerConn[from] !== undefined) {
            var candidate = new RTCIceCandidate({sdpMLineIndex:msg.label, candidate:msg.candidate});
            peerConn[from].getRTC().addIceCandidate(candidate);
        } else if (msg.type === 'bye' && peerConn[from] !== undefined) {
            onRemoteHangUp(from);  
        } else {
            logg("message unknown:" + message);
        } 
    }

    function onRemoteHangUp(from) {
        logg("Remote(" + from +  ") Hang up ");
        remoteCallback(from, false);
        peerConn[from].getRTC().close();
        delete peerConn[from];
    }
 
    function closeSession() {
        for(var index in peerConn){
            remoteCallback(peerConn[index].getFrom(), false);
            peerConn[index].getRTC().close();
            delete peerConn[index];
        }
    }
 
    window.onbeforeunload = function() {
        if (Object.keys(peerConn).length > 0) {
            closeSession();
            commChannel.sendMessage({type: 'bye'});
        }
    }

    return my;
};



