//http://stackoverflow.com/questions/4583395/calculate-speed-using-javascript
var BANDWITDH = (function(){
  var imageAddr;
  var size;
  var startTime, endTime;
  var downloadSize;
  var download = new Image();

  return {
      /*
        don't forget to change the address every time you make a request to avoid browser caching.
        For a demo, I will be using the same as in the stackoverflow example
      */
      init: function(address, size){
          imageAddr = address !== undefined ? address : "http://www.tranquilmusic.ca/images/cats/Cat2.JPG" + "?n=" + Math.random(); 
          downloadSize = size !== undefined ? size : 5616998; 
          startTime = (new Date()).getTime();
          download.src = imageAddr;
          debugger;
          download.onload = function() {
               endTime = (new Date()).getTime();
         }
      },
      getResult: function(){
          var duration = (endTime - startTime) / 1000;
          debugger;
          var bitsLoaded = downloadSize * 8;
          var speedBps = (bitsLoaded / duration).toFixed(2);
          var speedKbps = (speedBps / 1024).toFixed(2);
          var speedMbps = (speedKbps / 1024).toFixed(2);
          return speedMbps;
      }
    } 
})();
