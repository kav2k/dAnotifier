$(document).ready(function() {
  chrome.runtime.getBackgroundPage(function(win) {
    var username = win.DiFi_folderInfo[win.DiFi_inboxID].name.slice(1);
    $("a").filter(
      function() { return this.textContent == username}
    ).toggleClass("glow");
  });

  $("#boring").click(switch_boring);
});

function switch_boring() {
  $("body").toggleClass("scroll");
  $("body").toggleClass("boring");
  $("#boring").hide();
}
