webRTC-over-websockets
======================

Demo link: http://54.235.253.99/talk/

Small demo of webRTC over websockets, using node.js and HTML5. It allows you to setup peer2peer and group chat calls. You can also add new users on the fly (but not rooms, there are predefined - see `data` directory). 

Ideally, would be best to use XMPP (with strophe.js library) for signaling since it has presence and roster support, with BOSH or even better websockets over XMPP. 


Files
-------
### Data

- `data/people.json` this is the roster file, where people are defined. 
- `data/rooms.json` this is where rooms are defined

### JS files

- `js/main.js` this is the file responsible for UI updates 
- `js/webrtc.js` this is the webrtc wrapper
- `js/signaling.js` signalling client, implemented using websockets
- `js/bandwitdh.js` this is the file for bandwith estimation
- `js/adapter.js` this is the file used in webrtc demo's, it wraps browser dependencies

### Server
- `websocket-server.js` this is the websocket server, used by node.js. It requires websocket library, you can install it using the following command : 
```sh
$ npm install websocket
```



