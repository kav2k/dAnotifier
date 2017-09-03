/* global Prefs */
/* exported save */

document.addEventListener("DOMContentLoaded", function() {
  Prefs.init();
  Prefs.initHTML_relnotes();
});

function save() {
  Prefs.hideRelnotes.saveHTML();
}
