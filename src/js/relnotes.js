/* global initPrefs, Prefs, initPrefsHTML_relnotes */
/* exported save */

document.addEventListener("DOMContentLoaded", function() {
  initPrefs();
  initPrefsHTML_relnotes();
});

function save() {
  Prefs.hideRelnotes.saveHTML();
}
