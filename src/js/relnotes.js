document.addEventListener('DOMContentLoaded', function () {
  initPrefs();
  initPrefsHTML_relnotes();
});

function save(){
  Prefs.hideRelnotes.saveHTML();
}
