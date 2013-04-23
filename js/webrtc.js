var webrtc = function(options) {            
    var my = {};

    var commChannel = options.commChannel,  
        stunServer = options.stunServer,
        sourcevid = options.sourcevid,
        remoteCallback = options.onremote;

    var localStream;
    var peerConn = {};

    var mediaConstraints = {'mandatory': {'OfferToReceiveAudio':true, 'OfferToReceiveVideo':true }};

    if(options.constrains === 'dynamic'){
        BANDWITDH.init(function(bandwitdh){
            console.log('calculate bandwitdh');
            if(!isNaN(bandwitdh) && bandwitdh < 0.5){
            mediaConstraints = {'mandatory': {
                            'OfferToReceiveAudio':true, 
                            'OfferToReceiveVideo':false }};
            }
            console.log('bandwitdh is ' + bandwitdh + ' [Mbps]');
        });
    }


    //callback to start p2p connection between two parties
    commChannel.addCallback('s-answer', call);

    commChannel.addCallback('offer', processSignalingMessage);
    commChannel.addCallback('answer', processSignalingMessage);
    commChannel.addCallback('candidate', processSignalingMessage);
    commChannel.addCallback('bye', processSignalingMessage);

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

    function setLocalDescriptionAndMessage(sessionDescription){
        logg("setLocalDescriptionAndMessage");
        this.rtc.setLocalDescription(sessionDescription);
        commChannel.sendMessage(sessionDescription, this.from);
    }

    RTCPeer.prototype.createOffer = function(callback){
        logg("createOffer to " + this.from);
        that = this;
        this.rtc.createOffer(function(sessionDescription){
            callback.call(that, sessionDescription);
        }, null, mediaConstraints);
    }

    RTCPeer.prototype.createAnswer = function(callback){
        logg("createAnswer to " + this.from);
        that = this;
        this.rtc.createAnswer(function(sessionDescription){
            callback.call(that, sessionDescription);
        }, null, mediaConstraints);
    }

    RTCPeer.prototype.getRTC = function(){
        return this.rtc;
    }

    RTCPeer.prototype.getFrom = function(){
        return this.from;
    }
   
    var logg = function(s) { console.log(s); };

    my.startVideo = function() {
        try { 
            getUserMedia({audio: true, video: true}, successCallback, errorCallback);
        } catch (e) {
            getUserMedia("video,audio", successCallback, errorCallback);
        }
        function successCallback(stream) {
            attachMediaStream(sourcevid, stream);
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
    function call(msg) {
        if(msg.answer !== 'accept') {
            console.log('call not accepted');
            return;
        }

        if (peerConn[msg.from] === undefined && localStream) {
            logg("Creating PeerConnection with "+ msg.from);
            createPeerConnection(msg.from);
        } else if (!localStream){
            alert("Please start the video first");
            logg("localStream not started");
            return;
        } else {
            logg("peer SDP offer already made");
        }
        logg("create offer");
        peerConn[msg.from].createOffer(setLocalDescriptionAndMessage);
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

 
    function processSignalingMessage(msg) {
        logg("processSignalingMessage type(" + msg.type + ")= " + msg);
       
        if (msg.type === 'offer') {
            if(peerConn[msg.from] === undefined && localStream) {                   
                createPeerConnection(msg.from);
                //set remote description
                peerConn[msg.from].getRTC().setRemoteDescription(new RTCSessionDescription(msg));
                //create answer
                logg("Sending answer to peer.");
                peerConn[msg.from].createAnswer(setLocalDescriptionAndMessage);                
            } else {
                logg('peerConnection has already been started');
            }         
        } else if (msg.type === 'answer' && peerConn[msg.from] !== undefined) {
            logg("setRemoteDescription...");
            peerConn[msg.from].getRTC().setRemoteDescription(new RTCSessionDescription(msg));
        } else if (msg.type === 'candidate' && peerConn[msg.from] !== undefined) {
            var candidate = new RTCIceCandidate({sdpMLineIndex:msg.label, candidate:msg.candidate});
            peerConn[msg.from].getRTC().addIceCandidate(candidate);
        } else if (msg.type === 'bye' && peerConn[msg.from] !== undefined) {
            onRemoteHangUp(msg.from);  
        } else {
            logg("message unknown:" + msg);
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
        commChannel.sendMessage({type: 'bye'});
    }
 
    window.onbeforeunload = function() {
        if (Object.keys(peerConn).length > 0) {
            closeSession();
        }
    }

    return my;
};



