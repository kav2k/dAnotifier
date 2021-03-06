/* global goToUrl, goToMTUrl, getLoginUrl, getMessagesUrl, getNotesUrl, prepText */
/* global DiFi, popupData */
/* global DN_clear */
/* global Prefs */

// Global variable to hold current interval id
let runningInterval;
// Global variable to hold current login state
let loggedOut = false;

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

// Exported: can be called from same page
/* exported onMessage */
function onMessage(request, sender, callback) {
  switch (request.action) {
    case "seenInbox":
      DiFi.seenInbox();
      break;
    case "showMC":
      goToMTUrl(request.type, request.alt, request.alt, DiFi.eclipse);
      break;
    case "showNotes":
      goToUrl(getNotesUrl(), request.alt, request.alt);
      break;
    case "openURL":
      goToUrl(request.url);
      break;
    case "updateNow":
      scheduleRequest();
      break;
    case "clearPopupNew":
      DiFi.clearPopupNew();
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
      callback(DiFi.getLastNewCount(request));
      break;
    case "timeMachine":
      DiFi.timeMachine(request.ts);
      scheduleRequest();
      break;
    case "init":
      init();
      break;
    case "mustCapture":
      DiFi.mustCapture = true;
      break;
    case "getPopupData":
      callback(popupData);
      break;
    case "getUsername":
      callback(DiFi.getUsername());
      break;
    case "detectEclipse":
      if (DiFi.eclipse != request.eclipse) {
        scheduleRequest(true);
      }
      break;
  }
}

// Enabling event handlers
chrome.runtime.onMessage.addListener(onMessage);

// Controls whether we need to show a release notes update
const relNotesVersion = 29; // FIXME: HAAAAAAAX!

init();

// *** Init function
function init() {
  let audio_element = document.createElement("audio");
  audio_element.id = "notify_sound";
  audio_element.src = chrome.runtime.getURL("audio/notify.ogg");
  document.body.appendChild(audio_element);

  Prefs.init();

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
    DiFi.lastTotalCount = parseInt(localStorage.lastState_lastTotalCount) || 0;
    DiFi.timestamp = parseInt(localStorage.lastState_timestamp) || 0;
    DiFi.alertTimestamp = parseInt(localStorage.lastState_alertTimestamp) || 0;
    DiFi.lastTotalNewCount = parseInt(localStorage.lastState_lastTotalNewCount) || 0;
    DiFi.lastTotalNewCountApprox = (localStorage.lastState_lastTotalNewCountApprox == "true");

    if (DiFi.lastTotalCount > 0 && Prefs.badgeMode.get() == "all") {
      chrome.browserAction.setBadgeBackgroundColor(COLOR_INACTIVE);
      chrome.browserAction.setBadgeText({text: prepText("" + DiFi.lastTotalCount)});
    } else if (DiFi.lastTotalNewCount > 0 && Prefs.badgeMode.get() == "newOnly") {
      chrome.browserAction.setBadgeBackgroundColor(COLOR_INACTIVE);
      chrome.browserAction.setBadgeText({text: prepText(DiFi.lastTotalNewCount + ((DiFi.lastTotalNewCountApprox) ? "+" : ""))});
    }
  }

  DiFi.maxItems = Prefs.maxItems.get();

  console.log("Setting refresh interval as " + Prefs.refreshInterval.get());
  
  // SUNSET: Disabling main logic
  //scheduleRequest();
  sunset();
}

function sunset() {
  chrome.browserAction.setIcon({path: "img/dan_logo2_19_crisp.png"});
  chrome.browserAction.setBadgeText({text: "END"});
  chrome.browserAction.setTitle({title: prepText("This extension is now defunct.\nSo long, and thanks for all the fish!")});
  chrome.browserAction.setPopup({popup: "popup_sunset.html"});
}

// *** Scheduler
// Runs runRequest immediately and schedules refresh every refreshInterval.
function scheduleRequest(eclipseRefresh) {
  runRequest(eclipseRefresh); // run immediately on rescheduling

  // ensure only one instance of interval runs
  if (runningInterval) { window.clearInterval(runningInterval); }

  // schedule refreshes
  runningInterval = window.setInterval(runRequest, Prefs.refreshInterval.get());
}

function runRequest(eclipseRefresh) { // (wrap-around for now)
  DiFi.doEverything(eclipseRefresh);
}
