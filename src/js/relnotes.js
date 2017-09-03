/* global Prefs, initPrefsHTML_relnotes */
/* exported save */

document.addEventListener("DOMContentLoaded", function() {
  Prefs.init();
  initPrefsHTML_relnotes();
});

function save() {
  Prefs.hideRelnotes.saveHTML();
}
