(function() {
  function color(val) { 
    var newColor     = { r: 255, g: 215, b:   0 };
    var defaultColor = { r: 204, g: 215, b: 204 };
    var blended = blendColor(newColor, defaultColor, val);
    return colorToRGB(blended);
  }

  function blendColor(first, second, value){
    if(value < 0 || value > 1) throw Error("Blend value outside [0;1] range");
    var blend = {};
    blend.r = first.r + value * (second.r - first.r);
    blend.g = first.g + value * (second.g - first.g);
    blend.b = first.b + value * (second.b - first.b);
    return blend;
  }

  function colorToRGB(color){
    return "rgb(" + Math.round(color.r) + ", " + Math.round(color.g) + ", " + Math.round(color.b) + ")";
  }

  function normalize(x){
    var x1 = 1000*60*5; // 5 minutes
    var x2 = 1000*60*60*24*1.5; // 3 days
    var exp = -1;

    var y = (Math.pow(0.15, exp) - 1)*(x - x1)/(x2 - x1) + 1;
    if(y < 1) return 1;
    if(y > Math.pow(0.05, exp)) return 0;
    return Math.pow(y, exp);
  }

  function colorize(){
    /*this.style.setProperty(
      "background-color",
      color(1 - normalize(Date.now() - $(this).parent().data("mcbox").message.ts * 1000)),
      "important"
    );*/

    if(! $(this).parent().data("mcbox")) {
      //console.warn($(this).parent());
      return;
    }

    // Color choices:
    // Gold: rgb(255, 204, 0);
    // dA: rgb(191, 206, 0);

    this.style.setProperty(
      "box-shadow",
      "inset 0px 0px 10px 5px rgba(255,204,0," +
        normalize(Date.now() - $(this).parent().data("mcbox").message.ts * 1000) +
      ")"
    );
  }


  /*var target = document.querySelector('.messages-right');

  var observer = new window.WebKitMutationObserver(
    function(mutations) {
      for(var i in mutations){
        for(var j=0; j<mutations[i].addedNodes.length; j++){
          console.dir(mutations[i].addedNodes[j]);
          //colorize(target);
          return;
        } 
      }
    }
  );

  observer.observe(target, {childList : true});*/

  function changeHandler(summaries){
    summaries[0].added.forEach(function(el){colorize.call(el)});
  }

  var observer = new MutationSummary({
    callback: changeHandler,
    queries: [{ element: ".mc-ctrl", elementAttributes: "class" }]
  });

  $(".mc-ctrl").each(colorize);
})();