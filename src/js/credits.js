$(document).ready(function() {
  chrome.runtime.getBackgroundPage(function(win) {
    var username = win.DiFi.folderInfo[win.DiFi.inboxID].name.slice(1);
    $("a").filter(
      function() { return this.textContent == username; }
    ).toggleClass("glow");
  });

  $("#boring").click(switchBoring);
});

function switchBoring() {
  $("body").toggleClass("scroll");
  $("body").toggleClass("boring");
  $("#boring").hide();
}
