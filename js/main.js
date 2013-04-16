var socketAddress = 'ws://localhost:1337/';

var RTCApp = {
  name: null,
  webRTC: null,
  commChannel: null,
  message: null
};

RTCApp.commChannel = signaling({webSocketAddress : socketAddress, id: RTCApp.name });

RTCApp.commChannel.addPresenceCallback(presenceCallback);
RTCApp.commChannel.addOfferCallback(accept);


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
  loadFromJSON("data/people.json", "ajax-modal", ".people-carousel");
  loadFromJSON("data/rooms.json", "ajax-room-modal", ".rooms-carousel");
  $('#people').fadeIn();
  $('[id^="myCarousel"]').carousel({interval: false});
});

$("#form").submit(function(event) {
  event.preventDefault();
  var name = $("#user").val();
  if(users[name] === undefined){
    console.log('user not known by the system, create an avatar');
    addNewUser({
      "name" : name,
      "id": name,
      "img" : "images/person.jpg"
    }, "ajax-modal", ".people-carousel");
  }

  RTCApp.name = name;    
  RTCApp.commChannel.sendPresence(RTCApp.name, 'on');

  $('#user').attr('readonly', true);
  $("#submit").hide();

  if(users[name].room !== undefined){
    for(var i=0; i < users[name].room.length; i ++)
      RTCApp.commChannel.roomOffer(users[name].room[i]);
  }
});

$('#accept').bind('click', function() {
  RTCApp.commChannel.answer(caller, 'accept');
  $('#acceptModal').modal('hide');
});

$('#reject').bind('click', function() {
  RTCApp.commChannel.answer(caller, 'reject');
  $('#acceptModal').modal('hide');
});

function accept(from){
  caller = from;
  snd.play();
  $('#callerTitle').text('Incoming call');
  $('#caller').text('Caller id '+ from);
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

function presenceCallback(who, status){
  var user_id, room;
  $(".ajax-modal").each(function(){
    user_id = $(this).attr('user-id'); 
    if(user_id !== undefined && user_id === who){
      if(status === 'on'){
        $(this).find('img').attr('src', 'images/online-icon.png');
      } else {
        $(this).find('img').attr('src', 'images/offline-icon.png');
      }
    }       
  });
  $(".ajax-room-modal").each(function(){
    room = $(this).attr('user-id'); 
    if(room !== undefined && room === who){
      if(status === 'on'){
        $(this).find('img').attr('src', 'images/online-icon.png');
      }else {
        $(this).find('img').attr('src', 'images/offline-icon.png');
      }
    }       
  });
  if(users[who] === undefined && status === 'on'){
    console.log('presence received from the person that is not in the address book ' + who);
    if(newUsers[who] === undefined){
      newUsers[who] = true;
    } 
  }
}

$('#main').delegate('a.ajax-modal', 'click', function() {
  event.preventDefault();
  var user_id = $(this).attr('user-id');
  if(user_id !== undefined && user_id !== RTCApp.name) 
    RTCApp.commChannel.offer(user_id);
});

$('#main').delegate('a.ajax-room-modal', 'click', function() {
  event.preventDefault();
  var room = $(this).attr('user-id');
  RTCApp.commChannel.roomOffer(room);
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
  addDataToDiv(array, class_name, class_div);
}

function loadFromJSON(file, class_name, class_div){
    $.getJSON(file, function(data) {
      addDataToDiv(data, class_name, class_div);
  });
}

function addDataToDiv(data, class_name, class_div){
  var items = [];
  var i = 0;
  var groupIndex = 12;

  $.each(data, function(key, value) {
    var name = this.name;
    var image = this.img;
    var id = this.id;
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
