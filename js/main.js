var socketAddress = 'ws://localhost:1337/';

var RTCApp = {
  name: null,
  room: null,
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

var users = [];

$(document).ready(function() {
  loadFromJSON("data/people.json", "ajax-modal", ".people-carousel", true);
  loadFromJSON("data/rooms.json", "ajax-room-modal", ".rooms-carousel", false);
  $('#people').fadeIn();
  $('[id^="myCarousel"]').carousel({interval: false});
});

$("#form").submit(function(event) {
  event.preventDefault();
  var name = $("#user").val();
  if(users.indexOf(name) < 0){
    console.log('user not known by the system, create an avatar');
    $('.people-carousel').empty();
    loadFromJSON("data/people.json", "ajax-modal", ".people-carousel", true, {
      "name" : name,
      "id": name,
      "img" : "images/person.jpg"
    });
  }

  RTCApp.name = name;    
  RTCApp.commChannel.sendPresence(RTCApp.name, 'on');

  $('#user').attr('readonly', true);
  $("#submit").hide();
});

var caller;
$('#accept').bind('click', function() {
  RTCApp.commChannel.answer(caller, 'accept');
  $('#acceptModal').modal('hide');
});

$('#reject').bind('click', function() {
  RTCApp.commChannel.answer(caller, 'reject');
  $('#acceptModal').modal('hide');
});

var snd = new Audio("data/ringtone.wav"); 
function accept(from){
  caller = from;
  snd.play();
  $('#caller').text('You are getting a call request from ' + from);
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

function presenceCallback(who, status){
  $(".ajax-modal").each(function(){
    var user_id = $(this).attr('user-id'); 
    if(user_id !== undefined && user_id === who){
      if(status === 'on'){
        $(this).find('img').attr('src', 'images/online-icon.png');
      }else {
        $(this).find('img').attr('src', 'images/offline-icon.png');
      }
    }       
  });
  $(".ajax-room-modal").each(function(){
    var room = $(this).attr('user-id'); 
    if(room !== undefined && room === who){
      if(status === 'on'){
        $(this).find('img').attr('src', 'images/online-icon.png');
      }else {
        $(this).find('img').attr('src', 'images/offline-icon.png');
      }
    }       
  });
}

$('#main').delegate('a.ajax-modal', 'click', function() {
  event.preventDefault();
  var user_id = $(this).attr('user-id');
  if(user_id !== undefined && user_id !== RTCApp.name) 
    RTCApp.commChannel.offer(user_id);
});

$('#main').delegate('a.ajax-room-modal', 'click', function() {
  event.preventDefault();
  RTCApp.room = $(this).attr('user-id');
  RTCApp.commChannel.roomOffer(RTCApp.room);
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


function loadFromJSON(file, class_name, class_div, flagUser, new_user){
    $.getJSON(file, function(data) {
    var items = [];
    var i = 0;
    var groupIndex = 6;
    if(new_user !== undefined){
      data.unshift(new_user);
    }
   
    $.each(data, function() {
      var name = this.name;
      var image = this.img;
      var id = this.id;
      if(flagUser !== undefined && flagUser){
        users.push(id);
      }
         
      if(i % groupIndex === 0){
        if(i === 0)
          items.push('<div class="item active">');
        else
          items.push('<div class="item">');
        items.push('<ul class="thumbnails">');
      }
      
      items.push('<li class="span2"><div class="thumbnail"><img src="' + image +' " alt=""></a> <h4>' + name + '</h4><p><a href="#" class="btn btn-primary ' + class_name + ' " user-id="' + id + '" >Talk<img src="images/offline-icon.png" width="24" height="24" align="left" alt=""> </a></p></div></li>');

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
  });

}
