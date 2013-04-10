webRTC-over-websockets
======================

Small demo of webRTC over websockets, using node.js and HTML5.
Ideally, would be best to use XMPP (with strophe.js library) for signaling since it has presence and roster support, with BOSH or even better websockets over XMPP. 
Nevertheless, I will stick to this implementation as this is only the POC. I have implemented 'minimal' presence/roster stack in node.js, but that is far from perfect. Roster comes from the external file.

Example demo: http://54.235.253.99/talk/