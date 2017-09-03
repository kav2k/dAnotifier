/**** Error object scructure ****
 *
 * type (required): a string containing one of the following error types:
 * * LOGGED_OUT: User is logged out from dA, need to login to proceed
 * * SERVER_ERROR: Server-side error (no data or recognised "error" response)
 * * PARSE_ERROR: Unexpected answer from server, probably needs urgent patching
 * * TIMEOUT: No timely response from the server or no network connectivity
 * * TEST_ERROR: What it says on the tin
 * * TEST_WARNING: Again, label is self-explanatory
 * * INTERNAL_ERROR: Caught exception in the code. Must set raw data to trace.
 *
 * raw (optional): raw text data that can be copied into clipboard on request
 *
 */

/* global getTimestamp, prepText, Prefs, COLOR_INACTIVE, popupData, DN_clear */
/* global DiFi */
/* exported handleError */

function handleError(error) {
  var title = "Last updated: " + getTimestamp() + "\n" + errorText(error) + ((error.raw) ? ("\n" + error.raw) : "");
  var badge = errorBadge(error);

  chrome.browserAction.setTitle({title: prepText(title)});

  // Make the badge red for serious errors
  if (errorCritical(error)) {
    chrome.browserAction.setIcon({path: "img/dan_logo2_19_red.png"});
    console.warn(errorText(error));
  } else {
    chrome.browserAction.setIcon({path: "img/dan_logo2_19_grey.png"});
  }

  if (badge == "?") { // 0.5: Last seen count
    if (DiFi.lastTotalCount && Prefs.badgeMode == "all") {
      chrome.browserAction.setBadgeText({text: prepText(DiFi.lastTotalCount + badge)});
    } else if (DiFi.lastTotalNewCount && Prefs.badgeMode == "newOnly") {
      chrome.browserAction.setBadgeText({text: prepText(DiFi.lastTotalNewCount + (DiFi.lastTotalNewCountApprox) ? "+" : "") + badge});
    }
  } else {
    chrome.browserAction.setBadgeText({text: prepText(badge)});
  }
  chrome.browserAction.setBadgeBackgroundColor(COLOR_INACTIVE);

  popupData.error = error;
  if (error.type == "LOGGED_OUT") {
    delete popupData.aggregateClasses; // prevent old data from showing after log in
    DN_clear();
  }

  DiFi.skipUpdate = false;
  popupData.refreshing = false;
  chrome.runtime.sendMessage({action: "updatePopup", data: popupData});
}

function errorText(error) {
  switch (error.type) {
    case "LOGGED_OUT": return "You are logged out.<br>Click the button to log in.";
    case "SERVER_ERROR": return "Error on dA side.<br>This should resolve itself shortly.";
    case "PARSE_ERROR": return "Unexpected reply from dA server.<br>If this persists, notify the developer!";
    case "TIMEOUT": return "Request timed out.<br>Check your internet connection if this persists.";
    case "TEST_ERROR": return "This is a test error.<br>You should NOT see this in release version!";
    case "TEST_WARNING": return "This is a test warning.<br>You should NOT see this in release version!";
    case "INTERNAL_ERROR": return "Error condition in the code.<br>Please inform the developer!";
    default:
      console.error("Unrecognized error type '" + error.type + "' in the handler!");
      return "Unrecognised error type.<br>This should NEVER happen, notify the developer!";
  }
}

function errorCritical(error) {
  switch (error.type) {
    case "LOGGED_OUT": return true;
    case "SERVER_ERROR": return false;
    case "PARSE_ERROR": return true;
    case "TIMEOUT": return false;
    case "TEST_ERROR": return true;
    case "TEST_WARNING": return false;
    case "INTERNAL_ERROR": return true;
    default: return true;
  }
}

function errorBadge(error) {
  switch (error.type) {
    case "LOGGED_OUT": return "!";
    case "SERVER_ERROR": return "?";
    case "PARSE_ERROR": return "ERR";
    case "TIMEOUT": return "?";
    case "TEST_ERROR": return "ERR";
    case "TEST_WARNING": return "?";
    case "INTERNAL_ERROR": return "ERR";
    default: return "ERR";
  }
}
