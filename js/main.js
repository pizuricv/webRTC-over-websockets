var socketAddress = 'ws://localhost:1337/';

var RTCApp = {
  name: null,
  webRTC: null,
  commChannel: null,
  message: null
};

RTCApp.commChannel = signaling({webSocketAddress : socketAddress, id: RTCApp.name });

RTCApp.commChannel.addCallback('presence' , presenceCallback);
RTCApp.commChannel.addCallback('s-offer', accept);
RTCApp.commChannel.addCallback('roster', roster);


RTCApp.webRTC = webrtc({sourcevid : document.getElementById('sourceSmallvid'),
  stunServer : "stun.l.google.com:19302",
  commChannel : RTCApp.commChannel,
  onremote : remoteCallback,
  constrains : 'dynamic'
});
    
RTCApp.webRTC.startVideo();

var users = {};
var caller, newUser;
var snd = new Audio("data/ringtone.wav");
var newUsers = {}; 

$(document).ready(function() {
  //loadFromJSON("data/people.json", "ajax-modal", ".people-carousel", false);
  //loadFromJSON("data/rooms.json", "ajax-room-modal", ".rooms-carousel", true);
  $('#people_content').hide();
  $('#room_content').hide();
  $('#people').fadeIn();
  $('[id^="myCarousel"]').carousel({interval: false});
});

$("#form").submit(function(event) {
  event.preventDefault();
  RTCApp.name = $("#user").val();    
  RTCApp.commChannel.sendPresence(RTCApp.name, 'on');

  $('#user').attr('readonly', true);
  $("#submit").hide();
});

$('#accept').bind('click', function() {
  RTCApp.commChannel.answer(caller, 'accept');
  $('#acceptModal').modal('hide');
});

$('#reject').bind('click', function() {
  RTCApp.commChannel.answer(caller, 'reject');
  $('#acceptModal').modal('hide');
});

function accept(message){
  if(message.from === RTCApp.name){
    console.log("can't call yourself ");
    return;
  }
  caller = message.from;
  snd.play();
  $('#callerTitle').text('Incoming call');
  $('#caller').text('Caller id '+ message.from);
  $('#acceptModal').modal('show');
}

function talkFunction(flag){
  var callback = flag === true? "hide" : "show"; 
  $('#people_content')[callback]();
  $('#room_content')[callback]();
}

function remoteCallback(from, added, stream){
  var resource = 'resource_'+ from;
  if(added){
    if (window.webkitURL) {
      $('.inner').append('<video class="span4" id=' + resource + ' src=' +  
          window.webkitURL.createObjectURL(event.stream) + ' autoplay></video>');
    } else {
      $('.inner').append('<video class="span4" id=' + resource + ' mozSrcObject=' +  
          event.stream + ' autoplay></video>');
    }
  } else {
    $('#'+resource).attr('src',"");
    $('#'+resource).remove();
  }
}


$('#acceptNewUser').bind('click', function() {
  delete newUsers[newUser];
  addNewUser({
    "name" : newUser,
    "id": newUser,
    "img" : "images/person.jpg"
  }, "ajax-modal", ".people-carousel");
  $('#userModal').modal('hide');
});

$('#rejectNewUser').bind('click', function() {
  newUsers[newUser] = false;
  $('#userModal').modal('hide');
});

function presenceCallback(message){
  roomFlag = message.room !== undefined;
  var user_id, room_id;
  if(!roomFlag){
      $(".ajax-modal").each(function(){
      user_id = $(this).attr('user-id'); 
      if(user_id !== undefined && user_id === message.name){
        if(message.status === 'on'){
          $(this).find('img').attr('src', 'images/online-icon.png');
        } else {
          $(this).find('img').attr('src', 'images/offline-icon.png');
        }
      }       
    });
    if(users[message.name] === undefined && message.status === 'on'){
      console.log('presence received from the person that is not in the address book ' + message.name);
      if(newUsers[message.name] === undefined){
        newUsers[message.name] = true;
      } 
    }
  }
  else{
      $(".ajax-room-modal").each(function(){
        room_id = $(this).attr('user-id'); 
        if(room_id !== undefined && room_id === message.name){
          if(message.status === 'on'){
            $(this).find('img').attr('src', 'images/online-icon.png');
          }else {
            $(this).find('img').attr('src', 'images/offline-icon.png');
          }
        }       
      });
  }
}

$('#main').delegate('a.ajax-modal', 'click', function() {
  event.preventDefault();
  var user_id = $(this).attr('user-id');
  if(user_id !== undefined && user_id !== RTCApp.name) 
    RTCApp.commChannel.callOtherParty(user_id);
});

$('#main').delegate('a.ajax-room-modal', 'click', function() {
  event.preventDefault();
  var room = $(this).attr('user-id');
  RTCApp.commChannel.joinRoom(room);
});

$.ajaxSetup({
'beforeSend' : function(xhr) {
    xhr.overrideMimeType('text/html; charset=ISO-8859-1');
},
});

window.onbeforeunload = function() {
  if(RTCApp.commChannel !== null)
    RTCApp.commChannel.sendPresence(RTCApp.name, 'off');
}

function addNewUser(jsonData, class_name, class_div){
  users[jsonData.id] = jsonData;
  $('.people-carousel').empty();
  var array = $.map(users, function (value, key) { return value; });
  addDataToDiv(array, class_name, class_div, false);
}

function loadFromJSON(file, class_name, class_div, roomFlag){
    $.getJSON(file, function(data) {
      addDataToDiv(data, class_name, class_div, roomFlag);
  });
}

function roster(message){
  addDataToDiv(message.people, "ajax-modal", ".people-carousel", false);
  addDataToDiv(message.rooms, "ajax-room-modal", ".rooms-carousel", true);

  if(message.people.length > 0)
    $('#people_content').show();
  if(message.rooms.length > 0)
    $('#room_content').show();

  if(users[RTCApp.name] === undefined){
    console.log('user not known by the system, create an avatar');
    addNewUser({
      "name" : RTCApp.name,
      "id": RTCApp.name,
      "img" : "images/person.jpg"
    }, "ajax-modal", ".people-carousel");
  }
  if(users[RTCApp.name].room !== undefined){
    for(var i=0; i < users[RTCApp.name].room.length; i ++)
      RTCApp.commChannel.joinRoom(users[RTCApp.name].room[i]);
  }
}

function addDataToDiv(data, class_name, class_div, roomFlag){
  var items = [];
  var i = 0;
  var groupIndex = 12;

  $.each(data, function(key, value) {
    var name = this.name;
    var image = this.img;
    var id = this.id;
    if(!roomFlag)
      users[id] = value;
       
    if(i % groupIndex === 0){
      if(i === 0)
        items.push('<div class="item active">');
      else
        items.push('<div class="item">');
      items.push('<ul class="thumbnails">');
    }
    
    items.push('<li class="span1"><div class="thumbnail"><img src="' + image 
      +' " alt=""></a> <h4>' + name + '</h4><p><a href="#" class="btn btn-primary ' + 
      class_name + ' " user-id="' + id + 
      '" >Talk<img src="images/offline-icon.png" width="24" height="24" align="left" alt=""> </a></p></div></li>');

    if( (i % groupIndex) === (groupIndex - 1) ){
      items.push('</ul>');
      items.push('</div>');
    }
    i++;
  });
    
  if(items.lenght > 0 && items[items.lenght - 1].indexOf('div') < 0 ){
    items.push('</ul>');
    items.push('</div>');
  }
  
  $(items.join('')).appendTo(class_div);
}


setInterval(function(){
  for(newUser in newUsers){
    if(newUsers[newUser]){
      $('#userTitle').text('Accept a new user?');
      $('#callerUser').text('User id '+ newUser);
      $('#userModal').modal('show');
      break;
    }
  }
}, 10000);
