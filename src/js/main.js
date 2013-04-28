// (c) Alexander Kashev, 2010
// Portions of the code (c) Google, Inc (BSD license) and PostaL2600 (MPL license)

// Global variable to hold current interval id
var runningInterval;
// Global variable to hold current login state
var loggedOut = false;

// Plugin options

// Badge colors
var COLOR_ACTIVE = {color: [208, 0, 24, 128]}; // TODO: make adjustable
var COLOR_DEBUG = {color: [0, 200, 0, 128]};
var COLOR_INACTIVE = {color: [24, 24, 24, 128]};

// *** Event handlers

// Main button click handler
function OnClickHandler(tab) {
    if(loggedOut) { // If logged out, go to login page instead
        goToUrl(getLoginUrl());
    }
    else{
        goToUrl(getMessagesUrl());
    }
}

function OnTabUpdateHandler(tabId, changeInfo, tab) {
		if (
			changeInfo.url && 
			(
				/http:.*deviantart.com\/journal\//.test(changeInfo.url) || 
				/http:.*deviantart.com\/blog\//.test(changeInfo.url)
			) && 
			Prefs.useHTTPS.get()
		)
		{
			chrome.tabs.update(tabId, {url: changeInfo.url.replace(/^http:/, "https:")});
		}
}

function onMessage(request, sender, callback) {
	switch(request.action){
		case 'seenInbox':
			DiFi_seenInbox();
			break;
		case 'showMC':
			goToMTUrl(request.type, request.alt, request.alt);
			break;
		case 'openURL':
			goToUrl(request.url);
			break;
		case 'updateNow':
			scheduleRequest();
			break;
		case 'clearPopupNew':
			DiFi_clearPopupNew();
			DN_clear();
			scheduleRequest();
			break;
	}
}

// Enabling event handlers

chrome.extension.onMessage.addListener(onMessage);
chrome.tabs.onUpdated.addListener(OnTabUpdateHandler);

var relNotesVersion = 15; // FIXME: HAAAAAAAX!

document.addEventListener('DOMContentLoaded', function () {
	
	init();
});

// *** Init function
function init(){
	//document.getElementById('audio_placeholder').innerHTML = 
	//	'<audio src="'+chrome.extension.getURL('audio/notify.ogg')+'" id="notify_sound"></audio>';
		
	var audio_element = document.createElement("audio");
		audio_element.id = "notify_sound";
		audio_element.src = chrome.extension.getURL('audio/notify.ogg');
	document.body.appendChild(audio_element);
	
	initPrefs();
	
	if(chrome.browserAction.onClicked.hasListeners()) chrome.browserAction.onClicked.removeListener(OnClickHandler);
	if(Prefs.UIMode.get() == "tooltipOnly") {
		chrome.browserAction.onClicked.addListener(OnClickHandler);
		chrome.browserAction.setPopup({popup: ''});
	}
	else {
		chrome.browserAction.setPopup({popup: 'popup.html'});
	}
	
	if(!localStorage['relnotesver']) localStorage['relnotesver'] = 0;
	if(!(Prefs.hideRelnotes.get()) && (localStorage['relnotesver'] < relNotesVersion)) goToUrl(chrome.extension.getURL("release_notes.html"));
	localStorage['relnotesver'] = relNotesVersion;
	
	if(Prefs.rememberState.get()){
		DiFi_lastTotalCount = localStorage.lastState_lastTotalCount || 0;
		DiFi_timestamp = localStorage.lastState_timestamp || 0;
		DiFi_alertTimestamp = localStorage.lastState_alertTimestamp || 0;
		if(DiFi_lastTotalCount){
			chrome.browserAction.setBadgeBackgroundColor(COLOR_INACTIVE);
			chrome.browserAction.setBadgeText({text: prepText(''+DiFi_lastTotalCount)});
		}
	}
	
	DiFi_maxItems = Prefs.maxItems.get();
	
    console.log("Setting refresh interval as "+Prefs.refreshInterval.get());
    scheduleRequest();
}

// *** Scheduler
// Runs runRequest immediately and schedules refresh every refreshInterval.
function scheduleRequest() {
  runRequest(); // run immediately on rescheduling
  
  // ensure only one instance of interval runs
  if(runningInterval) window.clearInterval(runningInterval);

  // schedule refreshes
  runningInterval = window.setInterval(runRequest, Prefs.refreshInterval.get());
}

function runRequest() { // (wrap-around for now)
  //getMessages();
  DiFi_doEverything();
}

