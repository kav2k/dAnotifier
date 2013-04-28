var traceRegexp = /chrome-extension:\/\/\w*\//g;

function getTimestamp(){
	var d = new Date();
	
	var pad = function(n) {return (n < 10) ? "0"+n : n;}
	
	return ( pad(d.getHours()) + ":" + pad(d.getMinutes()) + ":" + pad(d.getSeconds()) ); 
}

function playSound(){
	try {
		if(!Prefs.playSound.get()) return;
		document.getElementById('notify_sound').currentTime = 0;
		document.getElementById('notify_sound').play();
	}
	catch(e){
		console.log(e.stack.replace(traceRegexp, ''));
	}
}

var messagesInfo = {
	// Notices
	"N":{"S":"Hot Topic", "P":"Hot Topics", "pref":"followNotices", "UP":"hottopics", "A": "HT"},
	"CA":{"S":"Contest Announcement", "P":"Contest Announcements", "pref":"followContest", "UP":"contests", "A": "CA"},
	"B":{"S":"Bulletin", "P":"Bulletins", "pref":"followBulletins", "UP":"bulletins", "A": "B"},
	// deviantWATCH
	"D":{"S":"Deviation", "P":"Deviations", "pref":"followDeviations", "UP":"deviations", "A": "D"},
	"WC":{"S":"Watched Critique", "P":"Watched Critiques", "pref":"followCritiques", "UP":"critiques", "A" : "WC"},
	"J":{"S":"Journal", "P":"Journals", "pref":"followJournals", "UP":"journals", "A" : "J"},
	"NW":{"S":"News Article", "P":"News Articles", "pref":"followNews", "UP":"news", "A" : "NA"},
	"F":{"S":"Forum", "P":"Forums", "pref":"followForums", "UP":"forums", "A" : "F"},
	"P":{"S":"Poll", "P":"Polls", "pref":"followPolls", "UP":"polls", "A" : "P"},
	"WA":{"S":"Activity", "P":"Activies", "pref":"followActivities", "UP":"activities", "A" : "WA"},
	// Feedback
	"CN":{"S":"Critique Notice", "P":"Critique Notices", "pref":"followCritNotices", "UP":"critiquesreceived", "A" : "CN"},
	"C":{"S":"Comment", "P":"Comments", "pref":"followComments", "UP":"comments", "feed":true, "A" : "C"},
	"R":{"S":"Reply", "P":"Replies", "pref":"followReplies", "UP":"replies", "A" : "R"},
	"A":{"S":"Activity Message", "P":"Activity Messages", "pref":"followActivity", "UP":"activity", "feed":true, "A": "A"},
	"S":{"S":"Support Ticket", "P":"Support Tickets", "pref":"followTickets", "UP":"support", "A": "S"},
	// Correspondence
	"CO":{"S":"Correspondence Item", "P":"Correspondence Items", "pref":"followCorrespondence", "UP":"correspondence", "A": "CO"},
	// Notes
	"UN":{"S":"Note", "P":"Notes", "pref":"followNotes", "UP":"notes", "A": "N"}
};

var groupMessagesInfo = {
	"CO" 	: {"pref" : "followGroupCorrespondence", "feed" : false}, 
	"N" 	: {"pref" : "followGroupNotices", "feed" : false}, 
	"C" 	: {"pref" : "followGroupComments", "feed" : true}, 
	"A" 	: {"pref" : "followGroupActivity", "feed" : true}
}

var aggregateClasses = {
	"NTC" : {"S" : "Notice", "P": "Notices", "types": ["N", "CA", "B"], "count" : 0, "newCount" : 0, "UP" : "notices"},
	"DWA" : {"S" : "deviantWATCH Message", "P" : "deviantWATCH Messages", "types": ["D", "WC", "J", "NW", "F", "P", "WA"], "count" : 0, "newCount": 0, "UP" : "deviantwatch"},
	"FEE" : {"S" : "Feedback Message", "P" : "Feedback Messages", "types": ["CN", "C", "R", "A", "S"], "count" : 0, "newCount" : 0, "UP" : "feedback"},
	"COR" : {"S" : "Correspondence Item", "P" : "Correspondence Items", "special" : "singleton", "types": ["CO"], "count" : 0, "newCount" : 0, "UP" : "correspondence"},
	"NOT" : {"S" : "Note", "P" : "Notes", "special" : "singleton", "types": ["UN"], "count" : 0, "newCount" : 0, "UP" : "notes"},
	"GRP" : {"S" : "Message", "P" : "Messages", "special" : "group", "types": ["CO", "N", "C", "A"], "groups": new Object(), "UP" : ""}
}

// Combined text preparation for the tooltip
function prepText(text) {
	/* var d = new Date(); // April Fools '11
	 if ((d.getMonth() == 3 && d.getDate() == 1) || Prefs.fools.get()){
		return romanize(text);
	}
	else {return text;}*/
	
	text = text.replace("<br>","\n");
	
	if(Prefs.newlineMagic.get()) text = newlineMagic(text);
	
	return text;
}

// Breaks up long multiline text with \r characters
// Sadly, this is required for WinXP's tooltips
function newlineMagic(text) {
	var lines = text.split("\n");
	var result = lines.shift();
	var len = 0;
	
	for (var i in lines){
		if(len + lines[i].length > 210) {
			result += "\r\n" + lines[i];
			len = 0;
		}
		else {
			result += "\n"+ lines[i];
			len += lines[i].length + 1;
		}
	}
	
	return result;
}

// April Fools '11
/* function romanize(input) {
	var output = input;
	output = output.toUpperCase();
	output = output.replace(/J/g,'I');
	output = output.replace(/U/g,'V');
	//output = output.replace(/W/g,'VV');
	output = output.replace(/([0-9]+)/g, romanNumeral);
	return output;
}

function romanNumeral(decimal) {
  var lookup = {M:1000,CM:900,D:500,CD:400,C:100,XC:90,L:50,XL:40,X:10,IX:9,V:5,IV:4,I:1},
      roman = '',
      i;
  for ( i in lookup ) {
    while ( decimal >= lookup[i] ) {
      roman += i;
      decimal -= lookup[i];
    }
  }
  return roman;
}*/

// *** URL helper functions
function getMessagesUrl() {
	if(Prefs.useHTTPS.get()) return "https://www.deviantart.com/messages/";
	else return "http://www.deviantart.com/messages/";
}

function getLoginUrl() {
	return "https://www.deviantart.com/users/login";
}

// Compares url to targetUrl modulo #... or ?... at end
function isUrl(url, targetUrl, distinct) {
	url = stripUrl(url, distinct);
	targetUrl = stripUrl(targetUrl, distinct);

	if (url.indexOf(targetUrl) != 0)
		return false;

	return url.length == targetUrl.length || url[targetUrl.length] == '?' ||
		url[targetUrl.length] == '#';
}

function stripUrl(url, keepAnchor){
	var result = url.split("#")[0];
	result = result.split("?")[0];
	
	if(keepAnchor) result += '#' + url.split("#").pop();
	
	return result;
}

// *** URL opener
// goToUrl selects tab whose url satisfies isUrl(tab.url, getUrl())
// otherwise opens a new tab with getUrl()
function goToUrl(getUrl, distinct, background) {
	var bringUp = background ? false : true;
	chrome.tabs.getAllInWindow(
		undefined, 
		function(tabs) {
			var rtabs = tabs.reverse();
			for (i in rtabs) {
				if (rtabs[i].url && isUrl(rtabs[i].url, getUrl, distinct)) {
					//chrome.tabs.executeScript(tab.id, {code: "window.location.reload();"});
					//chrome.tabs.update(tab.id, {url: "about:blank", selected: true});
					chrome.tabs.update(rtabs[i].id, {url: getUrl, selected: bringUp, active: bringUp});
					if (bringUp) { chrome.windows.getCurrent( function (window){ chrome.windows.update( window.id, {focused  : true} ); } ); } // BUGGED IN CHROME 10
					return;
				}
			}
			chrome.tabs.create({url: getUrl, selected: bringUp, active: bringUp});
			if (bringUp) { chrome.windows.getCurrent( function (window){ chrome.windows.update( window.id, {focused  : true} ); } ); } // BUGGED IN CHROME 10
		}
	);
}

function messageClassURL(type) {
	if(type == 'all') { return getMessagesUrl() + "?random=" + Math.ceil(10000*Math.random()); }
	else if(type.match(/^\d+$/)) { return getMessagesUrl() + "?random=" + Math.ceil(10000*Math.random()) + "#view=" + type; }
	else if(type.match(/^\w{3}$/)) { return getMessagesUrl() + "?random=" + Math.ceil(10000*Math.random()) + "#view=" + aggregateClasses[type].UP; }
	else return getMessagesUrl() + "?random=" + Math.ceil(10000*Math.random()) + "#view=" + messagesInfo[type].UP;
}

function goToMTUrl(type, distinct, background) {
	goToUrl(messageClassURL(type), distinct, background);
}

function handleOnClick(id, func){
	document.getElementById(id).addEventListener('click', function(e){ func(); });
}

function copyTextToClipboard(text) {
    var copyFrom = $('<textarea/>');
    copyFrom.text(text);
    $('body').append(copyFrom);
    copyFrom.select();
    document.execCommand('copy');
    copyFrom.remove();
}
