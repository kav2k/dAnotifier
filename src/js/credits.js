$(document).ready(function() {
  $("#boring").click(switch_boring);
});

function switch_boring() {
  $("body").toggleClass("scroll");
  $("body").toggleClass("boring");
  $("#boring").hide();
}