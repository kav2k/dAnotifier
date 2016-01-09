document.addEventListener("DOMContentLoaded", function() {
  handleOnClick("save-button", save);
  handleOnClick("revert-button", revert);
  handleOnClick("reset-button", reset);
  handleOnClick("DiFi_ts-button", debug_setDiFi_ts);
  handleOnClick("DiFi_ts-month-button", debug_setDiFi_ts_month);
  handleOnClick("DiFi_capture-button", debug_capture);
  init();
});

function save(fake) {
  Prefs.foreach("saveHTML");
  markClean();

  if (!fake && chrome.extension) {
    chrome.extension.getBackgroundPage().init();
    document.getElementById("debug-section").style.display = (Prefs.debug.get()) ? "block" : "none";
  }
}

function init() {
  initPrefs();
  initPrefsHTML();
  if (Prefs.debug.get()) {
    document.getElementById("debug-section").style.display = "block";
  }

  var label;
  if (localStorage.captureData) {
    var capture = JSON.parse(localStorage.captureData);
    label = "Capture recorded at " + capture.timestamp;
  } else {
    label = "No capture data available";
  }
  document.getElementById("capture-label").innerText = label;

  save(true);
}

function revert() {
  Prefs.foreach("initHTMLControl");
  save(true);
}

function reset() {
  if (confirm("This will reset ALL settings to their default values.\nAre you sure?")) {
    Prefs.foreach("reset");
    revert();
  }
}

function markDirty() {
  document.getElementById("save-button").disabled = false;
}

function markClean() {
  if (!document.getElementsByClassName("pref-fail").length) {
    document.getElementById("save-button").disabled = true;
  }
}

function testSound() {
  chrome.extension.getBackgroundPage().playSound();
  //chrome.extension.sendRequest({playSound : true});
}

function debug_setDiFi_ts() {
  var ts_textbox = document.getElementById("DiFi_ts");
  chrome.extension.getBackgroundPage().DiFi_timestamp = parseInt(ts_textbox.value);
  chrome.extension.getBackgroundPage().DiFi_alertTimestamp = parseInt(ts_textbox.value);
}

function debug_setDiFi_ts_month() {
  var ts = Math.round(new Date().getTime() / 1000.0) - 2592000;
  chrome.extension.getBackgroundPage().DiFi_timestamp = ts;
  chrome.extension.getBackgroundPage().DiFi_alertTimestamp = ts;
}

function debug_capture() {
  chrome.extension.getBackgroundPage().DiFi_mustCapture = true;
}
