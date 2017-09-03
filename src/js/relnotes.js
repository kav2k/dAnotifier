/* global Prefs */

document.addEventListener("DOMContentLoaded", function() {
  Prefs.init();
  Prefs.initHTML_relnotes(save);
});

function save() {
  Prefs.hideRelnotes.saveHTML();
}
