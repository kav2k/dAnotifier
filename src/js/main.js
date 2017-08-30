/* global goToUrl, goToMTUrl, getLoginUrl, getMessagesUrl, prepText */
/* global DiFi_seenInbox, DiFi_clearPopupNew, DiFi_getLastNewCount, DiFi_doEverything */
/* global DN_clear */
/* global Prefs, initPrefs */

/* HALL OF GLOBAL SHAME */
/* global DiFi_timestamp:true, DiFi_lastTotalCount:true, DiFi_alertTimestamp:true, DiFi_lastTotalNewCount:true, DiFi_lastTotalNewCountApprox:true, DiFi_maxItems:true */
/* exported DiFi_timestamp, DiFi_alertTimestamp, DiFi_lastTotalNewCount, DiFi_maxItems */

// Global variable to hold current interval id
var runningInterval;
// Global variable to hold current login state
var loggedOut = false;

// Badge colors
/* exported COLOR_ACTIVE, COLOR_DEBUG, COLOR_INACTIVE */
const COLOR_ACTIVE = {color: [208, 0, 24, 255]}; // TODO: make adjustable
const COLOR_DEBUG = {color: [0, 150, 0, 255]};
const COLOR_INACTIVE = {color: [24, 24, 24, 255]};

// *** Event handlers

// Main button click handler
function OnClickHandler() {
  if (loggedOut) { // If logged out, go to login page instead
    goToUrl(getLoginUrl());
  } else {
    goToUrl(getMessagesUrl());
  }
}

function onMessage(request, sender, callback) {
  switch (request.action) {
    case "seenInbox":
      DiFi_seenInbox();
      break;
    case "showMC":
      goToMTUrl(request.type, request.alt, request.alt);
      break;
    case "openURL":
      goToUrl(request.url);
      break;
    case "updateNow":
      scheduleRequest();
      break;
    case "clearPopupNew":
      DiFi_clearPopupNew();
      DN_clear();
      scheduleRequest();
      break;
    case "getMCReminder":
      callback(Prefs.MCReminder.get());
      break;
    case "getMCHighlight":
      callback(Prefs.MCHighlight.get());
      break;
    case "getLastNewCount":
      callback(DiFi_getLastNewCount(request));
      break;
  }
}

// Enabling event handlers

chrome.runtime.onMessage.addListener(onMessage);

var relNotesVersion = 28; // FIXME: HAAAAAAAX!

init();

// *** Init function
function init() {
  var audio_element = document.createElement("audio");
  audio_element.id = "notify_sound";
  audio_element.src = chrome.runtime.getURL("audio/notify.ogg");
  document.body.appendChild(audio_element);

  initPrefs();

  chrome.browserAction.onClicked.removeListener(OnClickHandler);

  if (Prefs.UIMode.get() == "tooltipOnly") {
    chrome.browserAction.onClicked.addListener(OnClickHandler);
    chrome.browserAction.setPopup({popup: ""});
  } else {
    chrome.browserAction.setPopup({popup: "popup.html"});
  }

  if (!localStorage.relnotesver) { localStorage.relnotesver = 0; }
  if (!(Prefs.hideRelnotes.get()) && (localStorage.relnotesver < relNotesVersion) && localStorage.relnotesver > relNotesVersion) {
    goToUrl(chrome.runtime.getURL("release_notes.html"));
  }
  localStorage.relnotesver = relNotesVersion;

  chrome.browserAction.setIcon({path: "img/dan_logo2_19_grey.png"});

  if (Prefs.rememberState.get()) {
    DiFi_lastTotalCount = parseInt(localStorage.lastState_lastTotalCount) || 0;
    DiFi_timestamp = parseInt(localStorage.lastState_timestamp) || 0;
    DiFi_alertTimestamp = parseInt(localStorage.lastState_alertTimestamp) || 0;
    DiFi_lastTotalNewCount = parseInt(localStorage.lastState_lastTotalNewCount) || 0;
    DiFi_lastTotalNewCountApprox = (localStorage.lastState_lastTotalNewCountApprox == "true");

    if (DiFi_lastTotalCount > 0 && Prefs.badgeMode.get() == "all") {
      chrome.browserAction.setBadgeBackgroundColor(COLOR_INACTIVE);
      chrome.browserAction.setBadgeText({text: prepText("" + DiFi_lastTotalCount)});
    } else if (DiFi_lastTotalNewCount > 0 && Prefs.badgeMode.get() == "newOnly") {
      chrome.browserAction.setBadgeBackgroundColor(COLOR_INACTIVE);
      chrome.browserAction.setBadgeText({text: prepText(DiFi_lastTotalNewCount + ((DiFi_lastTotalNewCountApprox) ? "+" : ""))});
    }
  }

  DiFi_maxItems = Prefs.maxItems.get();

  console.log("Setting refresh interval as " + Prefs.refreshInterval.get());
  scheduleRequest();
}

// *** Scheduler
// Runs runRequest immediately and schedules refresh every refreshInterval.
function scheduleRequest() {
  runRequest(); // run immediately on rescheduling

  // ensure only one instance of interval runs
  if (runningInterval) { window.clearInterval(runningInterval); }

  // schedule refreshes
  runningInterval = window.setInterval(runRequest, Prefs.refreshInterval.get());
}

function runRequest() { // (wrap-around for now)
  DiFi_doEverything();
}
