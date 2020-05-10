/* global handleOnClick, Prefs */
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

  if (!fake) {
    chrome.runtime.sendMessage({action: "init"});
    document.getElementById("debug-section").style.display = (Prefs.debug.get()) ? "block" : "none";
  }
}

function init() {
  Prefs.init();
  Prefs.initHTML(markDirty);
  if (Prefs.debug.get()) {
    document.getElementById("debug-section").style.display = "block";
  }

  let label;
  if (localStorage.captureData) {
    label = "Capture recorded at " + JSON.parse(localStorage.captureData).timestamp;
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

/* exported markDirty */
function markDirty() {
  document.getElementById("save-button").disabled = false;
}

function markClean() {
  if (!document.getElementsByClassName("pref-fail").length) {
    document.getElementById("save-button").disabled = true;
  }
}

function debug_setDiFi_ts() {
  const ts = parseInt(document.getElementById("DiFi_ts").value);
  chrome.runtime.sendMessage({action: "timeMachine", ts: ts});
}

function debug_setDiFi_ts_month() {
  chrome.runtime.sendMessage({action: "timeMachine"});
}

function debug_capture() {
  chrome.runtime.sendMessage({action: "mustCapture"});
}
