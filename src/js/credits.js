$(document).ready(function() {
  chrome.runtime.sendMessage({action: "getUsername"}, function(username) {
    const name = username.slice(1);
    $("a").filter(
      function() { return this.textContent == name; }
    ).addClass("glow");
  });

  $("#boring").click(switchBoring);
});

function switchBoring() {
  $("body").toggleClass("scroll");
  $("body").toggleClass("boring");
  $("#boring").hide();
}
