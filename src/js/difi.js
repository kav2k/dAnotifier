function DiFi_baseURL() {
	if(Prefs.useHTTPS.get()) return "https://www.deviantart.com/global/difi.php";
	else return "http://www.deviantart.com/global/difi.php";
}

function DiFi_JSONrequest(request, id, callback){

	if(Prefs.useCapture.get()){
		if(localStorage["captureData"]){
			var capture = JSON.parse(localStorage["captureData"]);
			if(capture.folderData[id]) {
				callback(id, capture.folderData[id]);
				return;
			}
		}
		console.warn("No capture data for id=" + id);
	}

	var xhr = new XMLHttpRequest();
	var abortTimerId = window.setTimeout(function() {
		xhr.abort();
		handleError({type: "TIMEOUT"});
	}, Prefs.timeoutInterval.get());

	xhr.onreadystatechange = function(){
		if (xhr.readyState != 4 || (xhr.status != 200 && xhr.status != 403))
			return;

		if (xhr.status == 403){ // doesn't really work anymore
			handleError({type: "LOGGED_OUT"});
			window.clearTimeout(abortTimerId);
			loggedOut = true;
			return;
		}

		loggedOut = false;

		if (xhr.responseText) {
			window.clearTimeout(abortTimerId);
		
			var result;
			try {
				result = JSON.parse(xhr.responseText);
				
				if(result.DiFi.status == "FAIL" && result.DiFi.response.error == "500 Server Error"){
					console.log("DEBUG: Outer hiccup");
					handleError({type: "SERVER_ERROR"});
					window.clearTimeout(abortTimerId);
					return;
				}
				
				if (result.DiFi.response.details && 
					result.DiFi.response.details.calls[0].response.content.error &&
					result.DiFi.response.details.calls[0].response.content.error == "DiFi Security Access Error")
				{ 
					handleError({type: "LOGGED_OUT"});
					window.clearTimeout(abortTimerId);
					loggedOut = true;
					return;
				}
				
				for (var call in result.DiFi.response.calls){
					if(result.DiFi.response.calls[call].response.status == "FAIL" &&
							result.DiFi.response.calls[call].response.content.error == "500 Server Error"){
						console.log("DEBUG: Inner hiccup");
						handleError({type: "SERVER_ERROR"});
						window.clearTimeout(abortTimerId);
						return;
					}
				}
			}
			catch(e){
				handleError({type: "PARSE_ERROR", raw: e.stack.replace(traceRegexp, '')});
				console.log(e.stack);
				window.clearTimeout(abortTimerId);
				return;
			}
			
			if(DiFi_capturing) DiFi_capture.folderData[id] = result;
			callback(id, result);
		}
		else{return;} // Catches abort()
	}
	
	xhr.open("GET", DiFi_baseURL()+request, true);
	
	// Paranoid?
	xhr.setRequestHeader("Cache-Control", "no-cache");
	xhr.setRequestHeader("Pragma", "no-cache");
	
	xhr.send(null);
}

var DiFi_inboxID;
var DiFi_folders;
var DiFi_folderInfo = new Object();

function DiFi_getInboxID(id, result) {
	try{
		if (result.DiFi.status != "SUCCESS") throw Error("DiFi: folder request failed");
		
		var found = false;
		//var needInfo = false;
		DiFi_folders = new Object();
		
		for (var folder in result.DiFi.response.calls[0].response.content)
		{	
			if (result.DiFi.response.calls[0].response.content[folder].is_inbox){
				DiFi_inboxID = result.DiFi.response.calls[0].response.content[folder].folderid; 
				found = true;
				DiFi_folders[result.DiFi.response.calls[0].response.content[folder].folderid] = {type: "inbox", name: "?"};
			}
			else DiFi_folders[result.DiFi.response.calls[0].response.content[folder].folderid] = 
				{type: "?", name: result.DiFi.response.calls[0].response.content[folder].title};
		}
		
		if(!found) throw Error("DiFi: inbox ID missing");
		//if(needInfo) console.log("folderInfo missing");
		//console.log(DiFi_groupFolders);
		
		getFolderInfo(false);
		//DiFi_JSONrequest(DiFi_allMessagesRequest(DiFi_inboxID), DiFi_countMessages);
	}
	catch(e){
		handleError({type: "INTERNAL_ERROR", raw: e.stack.replace(traceRegexp, '')});
		console.log(e.stack);
		return false;
	}
}

// --------------------------------------------------------------

var DiFi_foldersToCount;

function getFolderInfo(giveUp){
	var needInfo = false;
	DiFi_foldersToCount = [];
	
	try {
		if(Prefs.useCapture.get()){
			if(localStorage["captureData"]){
				var capture = JSON.parse(localStorage["captureData"]);
				DiFi_folderInfo = capture.folderInfo;
			}
			else console.warn("No capture data for id=" + id);
		}
	
		for(var i in DiFi_folders){
			if(!DiFi_folderInfo[i]) {
				if(!giveUp) {dAMC_folderInfoRequest(); return;}
				else throw Error("dAMC: folderInfo can't be retrieved ("+i+")");
			}
			else for(var j in DiFi_folderInfo[i]) (DiFi_folders[i])[j] = (DiFi_folderInfo[i])[j];
			
			DiFi_foldersToCount.push(i);
		}

		//for(var i in DiFi_folders) console.log(DiFi_folders[i]); //DEBUG
		
		if(DiFi_capturing) {
			DiFi_capture.folderInfo = DiFi_folderInfo;
			DiFi_capture.inboxID = DiFi_inboxID;
		}
		
		DiFi_countBegin();
		//DiFi_JSONrequest(DiFi_allMessagesRequest(DiFi_inboxID), DiFi_countMessages);
	}
	catch(e){
		handleError({type: "INTERNAL_ERROR", raw: e.stack.replace(traceRegexp, '')});
		console.log(e.stack);
		return false;
	}
}

// --------------------------------------------------------------

var DiFi_types = ["C", "R", "UN", "N", "CA", "A", "CO", "D", "NW", "J", "WC", "P", "F", "WA", "B", "S", "CN"];
var DiFi_groupTypes = ["CO", "N"];
var DiFi_groupFeedTypes = ["C", "A"];

function DiFi_requestSuffix (type, start, max) {
	switch(type){
		case "C" : return ",oq:fb_comments:" + start + ":" + max + ":f&";
		case "R" : return ",oq:fb_replies:" + start + ":" + max + ":f&";
		case "UN": return ",oq:notes_unread:" + start + ":" + max + ":f&";
		case "N" : return ",oq:notices:" + start + ":" + max + ":f&";
		case "CA": return ",oq:contests:" + start + ":" + max + ":f&";
		case "A" : return ",oq:fb_activity:" + start + ":" + max + ":f&";
		case "CN": return ",oq:fb_critiques:" + start + ":" + max + ":f&";
		case "CO": return ",oq:correspondence:" + start + ":" + max + ":f&";
		case "D" : return ",oq:devwatch:" + start + ":" + max + ":f:tg=deviations&";
		case "NW": return ",oq:devwatch:" + start + ":" + max + ":f:tg=news&";
		case "J" : return ",oq:devwatch:" + start + ":" + max + ":f:tg=journals&";
		case "WC": return ",oq:devwatch:" + start + ":" + max + ":f:tg=critiques&";	
		case "P" : return ",oq:devwatch:" + start + ":" + max + ":f:tg=polls&";
		case "B" : return ",oq:bulletins:" + start + ":" + max + ":f&";
		case "S" : return ",oq:zendesk:" + start + ":" + max + ":f&";
		case "F" : return ",oq:devwatch:" + start + ":" + max + ":f:tg=forums&";
		case "WA" : return ",oq:devwatch:" + start + ":" + max + ":f:tg=activities&";
	}
}

var DiFi_maxItems = 20;

var DiFi_totalCount = 0;
var DiFi_totalNewCount = 0;
var DiFi_lastTotalCount = 0;
var DiFi_hasNew = false;
var DiFi_mustAlert = false;
var DiFi_mustPopup = false;

var DiFi_timestamp = 0;
var DiFi_alertTimestamp = 0;

var DiFi_highestTimestamp=0;

function DiFi_countBegin(){
	DiFi_totalCount = 0;
	DiFi_totalNewCount = 0;
	
	DiFi_hasNew = false;
	DiFi_mustAlert = false;
	DiFi_mustPopup = false;
	
	DiFi_countNext();
}

function DiFi_countNext(){
	if(DiFi_foldersToCount.length){
		var id = DiFi_foldersToCount.shift();
		DiFi_folders[id].counts = {"C" : 0, "R" : 0, "UN" : 0, "N" : 0, "CA" : 0, "A" : 0, "CO" : 0, 
							"D" : 0, "NW" : 0, "J" : 0, "WC" : 0, "P" : 0, "F" : 0, "WA": 0, "B": 0, "S": 0, "CN" : 0};
		DiFi_folders[id].newCounts = {"C" : 0, "R" : 0, "UN" : 0, "N" : 0, "CA" : 0, "A" : 0, "CO" : 0, 
							"D" : 0, "NW" : 0, "J" : 0, "WC" : 0, "P" : 0, "F" : 0, "WA": 0, "B": 0, "S": 0, "CN" : 0};
		DiFi_folders[id].highestTimestamps = {"C" : 0, "R" : 0, "UN" : 0, "N" : 0, "CA" : 0, "A" : 0, "CO" : 0, 
							"D" : 0, "NW" : 0, "J" : 0, "WC" : 0, "P" : 0, "F" : 0, "WA": 0, "B": 0, "S": 0, "CN" : 0};
		switch(DiFi_folders[id].type){
		case "inbox":
			DiFi_JSONrequest(DiFi_allMessagesRequest(id), id, DiFi_countMessages);
			return;
		case "group":
			DiFi_JSONrequest(DiFi_groupMessagesRequest(id), id, DiFi_countGroupMessages);
			return;
		default:
			DiFi_countNext();
		}
	}
	else DiFi_countEnd();
}

function DiFi_countEnd(){
	DiFi_timestamp = DiFi_timestamp || epochTS(); // 1st time it's skipped, next time works normally
	DiFi_alertTimestamp = DiFi_highestTimestamp || epochTS(); // Only alert once
	
	DiFi_lastTotalCount = DiFi_totalCount;
	
	if(Prefs.rememberState.get()){
		localStorage.lastState_lastTotalCount = DiFi_lastTotalCount;
		localStorage.lastState_timestamp = DiFi_timestamp;
		localStorage.lastState_alertTimestamp = DiFi_alertTimestamp;
	}

	DiFi_updateTooltip();
}

function DiFi_allMessagesRequest(folderID)
{
	var queryStr = "?";
	for(var type in DiFi_types) /*if(Prefs.MT(DiFi_types[type]).count)*/ {
		queryStr += "c[]=MessageCenter;get_views;" + folderID + DiFi_requestSuffix (DiFi_types[type], 0, DiFi_maxItems);
	}
	queryStr += "t=json";
	return queryStr;
}

function DiFi_groupMessagesRequest(folderID)
{
	var queryStr = "?";
	for(var type in DiFi_groupTypes) /*if(Prefs.MT(DiFi_groupTypes[type]).count)*/ {
		queryStr += "c[]=MessageCenter;get_views;" + folderID + DiFi_requestSuffix (DiFi_groupTypes[type], 0, DiFi_maxItems);
	}
	for(var type in DiFi_groupFeedTypes) /*if(Prefs.MT(DiFi_groupTypes[type]).count)*/ {
		queryStr += "c[]=MessageCenter;get_views;" + folderID + DiFi_requestSuffix (DiFi_groupFeedTypes[type], 0, DiFi_maxItems);
	}
	queryStr += "t=json";
	return queryStr;
}

//var DiFi_lastResult;

function DiFi_countMessages(id, result) {
	try{
		if (result.DiFi.status != "SUCCESS") throw Error("DiFi: message request failed");
		
		//DiFi_lastResult = result;
		
		for(var type in DiFi_types)	if(Prefs.MT(DiFi_types[type]).count) {
			DiFi_totalCount += parseInt(DiFi_folders[id].counts[DiFi_types[type]] = result.DiFi.response.calls[type].response.content[0].result.matches);
		}
		
		//for (var id in DiFi_groupFolders) DiFi_countGroupMessages(result);
		
		if(DiFi_timestamp){ // gotta count new messages
			for(var type in DiFi_types)	if(Prefs.MT(DiFi_types[type]).count && Prefs.MT(DiFi_types[type]).watch) 
			{ 
				DiFi_parseNew(id, DiFi_types[type], result.DiFi.response.calls[type].response.content[0].result); 
			}
		}
		
		DiFi_countNext();
	}
	catch(e){
		handleError({type: "INTERNAL_ERROR", raw: e.stack.replace(traceRegexp, '')});
		console.log(e.stack);
		return false;
	}
}

function epochTS() {
	return Math.round(new Date().getTime()/1000.0);
}

function DiFi_compareWho(who, username) {
	var match = who.match(/.*<a.*>(.+)<\/a>/);
	if (match) return (match[1] == username);
	else return false;
}

function DiFi_parseNew(id, type, result) { // Assumes (DiFi_alertTimestamp >= DiFi_timestamp)
	DiFi_folders[id].newCounts[type] = 0;
	for(var i = 0; i < result.count; i++){
		DiFi_highestTimestamp = (result.hits[i].ts > DiFi_highestTimestamp) ? result.hits[i].ts : DiFi_highestTimestamp;
		DiFi_folders[id].highestTimestamps[type] = 
			(result.hits[i].ts > DiFi_folders[id].highestTimestamps[type]) ? result.hits[i].ts : DiFi_folders[id].highestTimestamps[type];
		if(result.hits[i].ts <= DiFi_timestamp) break;
		
		if(result.hits[i].who && DiFi_compareWho(result.hits[i].who, DiFi_folders[DiFi_inboxID].name.substring(1))) continue;
		
		DiFi_folders[id].newCounts[type]++;
		DiFi_totalNewCount++;
		if(Prefs.MT(type).badge) DiFi_hasNew = true; 
		if(result.hits[i].ts > DiFi_alertTimestamp && Prefs.MT(type).audio) DiFi_mustAlert = true;
		if(result.hits[i].ts > DiFi_alertTimestamp && Prefs.MT(type).popup) DiFi_mustPopup = true;
	}
}

function DiFi_countGroupMessages(id, result) {
	
	try{
		if (result.DiFi.status != "SUCCESS") throw Error("DiFi: message request failed");
		
		for(var type in DiFi_groupTypes) if(Prefs.GMT(DiFi_groupTypes[type]).count){
			DiFi_totalCount += parseInt(DiFi_folders[id].counts[DiFi_groupTypes[type]] = result.DiFi.response.calls[type].response.content[0].result.matches);
		}
		
		if(DiFi_timestamp){ // gotta count new messages
			for(var type in DiFi_groupTypes) if(Prefs.GMT(DiFi_groupTypes[type]).count && Prefs.GMT(DiFi_groupTypes[type]).watch) 
			{ 
				DiFi_parseNew(id, DiFi_groupTypes[type], 
					result.DiFi.response.calls[type].response.content[0].result); 
			}
			for(var type in DiFi_groupFeedTypes) if(Prefs.GMT(DiFi_groupTypes[type]).count && Prefs.GMT(DiFi_groupTypes[type]).watch) 
			{ 
				DiFi_parseNew(id, DiFi_groupFeedTypes[type], 
					result.DiFi.response.calls[parseInt(type)+DiFi_groupTypes.length].response.content[0].result); 
			}
		}
		
		DiFi_countNext();
	}
	catch(e){
		handleError({type: "INTERNAL_ERROR", raw: e.stack.replace(traceRegexp, '')});
		console.log(e.stack);
		return false;
	}
}

var currentTooltip = "";

function DiFi_updateTooltip() {
	var title;
	
	DiFi_fillAggregation();
	
	if (Prefs.aggregateTooltip.get()) {
		title = DiFi_tooltipAggregate();
	}
	else {
		title = DiFi_tooltipFull();
	}
	
//	console.log(title);
	chrome.browserAction.setTitle({title: title});
	currentTooltip = title;

	DiFi_updatePopup();
}

function DiFi_tooltipLine(type, count, newCount, feed) {
	var line;
	if(feed) {
		line = newCount + ( (newCount == DiFi_maxItems) ? "+" : "" ) + " new ";
		line += ( (newCount == 1) ? messagesInfo[type].S : messagesInfo[type].P ) + " (Feed)";
	}
	else {
		line = count + " " + ( (count == 1) ? messagesInfo[type].S : messagesInfo[type].P );
		if(newCount) line += " (" + newCount + ( (newCount == DiFi_maxItems) ? "+" : "" ) + " new)";
	}
	return line;
}

function DiFi_tooltipFull() {
	var title;
	var message_text = "";
	
	var title = "Last updated: " + getTimestamp() + " for " + DiFi_folders[DiFi_inboxID].name;
	
	for (var type in messagesInfo) if (DiFi_folders[DiFi_inboxID].counts[type] > 0) {
		message_text += "\n> " + DiFi_tooltipLine(type, DiFi_folders[DiFi_inboxID].counts[type], DiFi_folders[DiFi_inboxID].newCounts[type], false);
	}
	
	for(var id in DiFi_folders) if (DiFi_folders[id].type == "group"){
		var has_messages = false;
		for (var type in groupMessagesInfo)	if(DiFi_folders[id].counts[type] > 0 || DiFi_folders[id].newCounts[type]) has_messages = true;
		if(!has_messages) continue;
		
		message_text += "\n#"+DiFi_folders[id].name+":";
		
		for (var type in groupMessagesInfo) if (DiFi_folders[id].counts[type] > 0) {
			message_text += "\n> " + DiFi_tooltipLine(type, DiFi_folders[id].counts[type], DiFi_folders[id].newCounts[type], false);
		} else if (DiFi_folders[id].counts[type] == 0 && DiFi_folders[id].newCounts[type] > 0) { // Feed
			message_text += "\n> " + DiFi_tooltipLine(type, DiFi_folders[id].counts[type], DiFi_folders[id].newCounts[type], true);
		}
	}
	
/*	for (var type in messagesInfo)	if(DiFi_folders[DiFi_inboxID].counts[type] > 0){
		message_text += "\n" ;
		message_text += "> " + DiFi_folders[DiFi_inboxID].counts[type] + " ";
		message_text += (DiFi_folders[DiFi_inboxID].counts[type] == 1) ? messagesInfo[type].S : messagesInfo[type].P;
		if(DiFi_folders[DiFi_inboxID].newCounts[type]){
			message_text += " (" + DiFi_folders[DiFi_inboxID].newCounts[type] + ((DiFi_folders[DiFi_inboxID].newCounts[type] == DiFi_maxItems)?"+":"") + " new)";
		}
	}
	
	for(var id in DiFi_folders) if (DiFi_folders[id].type == "group"){
		var has_messages = false;
		for (var type in messagesInfo)	if(DiFi_folders[id].counts[type] > 0 || DiFi_folders[id].newCounts[type]) has_messages = true;
		if(!has_messages) continue;
		
		message_text += "\n" ;
		message_text += "#"+DiFi_folders[id].name+":";
		
		for (var type in messagesInfo)	if(DiFi_folders[id].counts[type] > 0){
			message_text += "\n";
			message_text += "> " + DiFi_folders[id].counts[type] + " ";
			message_text += (DiFi_folders[id].counts[type] == 1) ? messagesInfo[type].S : messagesInfo[type].P;
			if(DiFi_folders[id].newCounts[type]){
				message_text += " (" + DiFi_folders[id].newCounts[type] + ((DiFi_folders[id].newCounts[type] == DiFi_maxItems)?"+":"") + " new)";
			}
		} else if (DiFi_folders[id].counts[type] == 0 && DiFi_folders[id].newCounts[type] > 0) { // Feed
			message_text += "\n";
			message_text += "> " + DiFi_folders[id].newCounts[type] + " new ";
			message_text += (DiFi_folders[id].counts[type] == 1) ? messagesInfo[type].S : messagesInfo[type].P;
			message_text += " (Feed)";
		}
	}*/
	
	if (!message_text) message_text = "\n No Messages";
	
	title += message_text;
	
	return prepText(title);
}

function DiFi_fillAggregation(){
	for(var c in aggregateClasses){
		if(aggregateClasses[c].special && aggregateClasses[c].special == "group") { 
			for(var id in DiFi_folders) if (DiFi_folders[id].type == "group") {
				aggregateClasses[c].groups[id] = {"count" : 0, "newCount" : 0, "newCountApprox" : false};
				for(var t in aggregateClasses[c].types){
					aggregateClasses[c].groups[id].count += parseInt(DiFi_folders[id].counts[aggregateClasses[c].types[t]]);
					aggregateClasses[c].groups[id].newCount += parseInt(DiFi_folders[id].newCounts[aggregateClasses[c].types[t]]);
					if (DiFi_folders[id].newCounts[aggregateClasses[c].types[t]] == DiFi_maxItems) aggregateClasses[c].groups[id].newCountApprox = true;
				}
			}
		}
		else {
			aggregateClasses[c].count = 0;
			aggregateClasses[c].newCount = 0;
			aggregateClasses[c].newCountApprox = false;				
			for(var t in aggregateClasses[c].types){
				aggregateClasses[c].count += parseInt(DiFi_folders[DiFi_inboxID].counts[aggregateClasses[c].types[t]]);
				aggregateClasses[c].newCount += parseInt(DiFi_folders[DiFi_inboxID].newCounts[aggregateClasses[c].types[t]]);
				if (DiFi_folders[DiFi_inboxID].newCounts[aggregateClasses[c].types[t]] == DiFi_maxItems) aggregateClasses[c].newCountApprox = true;
			}
		}
	}
}

function DiFi_tooltipAggregateLine(type, newCount, feed) {
	var line;
	if(feed) {
		line = newCount + ( (newCount == DiFi_maxItems) ? "+" : "" ) + " new " + ( (newCount == 1) ? messagesInfo[type].S : messagesInfo[type].P ) + " (Feed)";
	}
	else {
		line = newCount + ( (newCount == DiFi_maxItems) ? "+" : "" ) + " new " + ( (newCount == 1) ? messagesInfo[type].S : messagesInfo[type].P );
	}
	return line;
}

function DiFi_tooltipAggregate() {
	var title = "Last updated: " + getTimestamp() + " for " + DiFi_folders[DiFi_inboxID].name;
	var message_text = "";
	
	for (var cl in aggregateClasses) {
		if(aggregateClasses[cl].special && aggregateClasses[cl].special == "group") { 
			for(var id in DiFi_folders) if (DiFi_folders[id].type == "group" && aggregateClasses[cl].groups[id].count + aggregateClasses[cl].groups[id].newCount > 0) {
				message_text += "\n\n" + "#" + DiFi_folders[id].name + ": ";
				message_text += aggregateClasses[cl].groups[id].count + " " + 
					( (aggregateClasses[cl].groups[id].count == 1) ? aggregateClasses[cl].S : aggregateClasses[cl].P );
				if(aggregateClasses[cl].groups[id].newCount){
					message_text += " (" + aggregateClasses[cl].groups[id].newCount + ( (aggregateClasses[cl].groups[id].newCountApprox)?"+":"" ) + " new)";
					for(var t in aggregateClasses[cl].types) if (DiFi_folders[id].newCounts[aggregateClasses[cl].types[t]]){
						message_text += "\n> " + 
							DiFi_tooltipAggregateLine(
								aggregateClasses[cl].types[t], 
								DiFi_folders[id].newCounts[aggregateClasses[cl].types[t]], 
								(DiFi_folders[id].counts[aggregateClasses[cl].types[t]] == 0)
							);
					}
				}				
			}
		}
		else if (aggregateClasses[cl].count + aggregateClasses[cl].newCount > 0) {
			if (aggregateClasses[cl].special && aggregateClasses[cl].special == "singleton") {
				message_text += "\n\n";
				message_text += aggregateClasses[cl].count + " " + ( (aggregateClasses[cl].count == 1) ? aggregateClasses[cl].S : aggregateClasses[cl].P );
				if(aggregateClasses[cl].newCount){
					message_text += " (" + aggregateClasses[cl].newCount + ( (aggregateClasses[cl].newCountApprox)?"+":"" ) + " new)";
				}
			}
			else {
				message_text += "\n\n";
				message_text += aggregateClasses[cl].count + " " + ( (aggregateClasses[cl].count == 1) ? aggregateClasses[cl].S : aggregateClasses[cl].P );
				if(aggregateClasses[cl].newCount){
					message_text += " (" + aggregateClasses[cl].newCount + ( (aggregateClasses[cl].newCountApprox)?"+":"" ) + " new)";
					for(var t in aggregateClasses[cl].types) if (DiFi_folders[DiFi_inboxID].newCounts[aggregateClasses[cl].types[t]]){
						message_text += "\n> " + 
							DiFi_tooltipAggregateLine(aggregateClasses[cl].types[t], DiFi_folders[DiFi_inboxID].newCounts[aggregateClasses[cl].types[t]], false);
					}
				}		
			}
		}
	}
	
/*	for (var type in messagesInfo)	if(DiFi_folders[DiFi_inboxID].counts[type] > 0){
		message_text += "\n" ;
		message_text += "> " + DiFi_folders[DiFi_inboxID].counts[type] + " ";
		message_text += (DiFi_folders[DiFi_inboxID].counts[type] == 1) ? messagesInfo[type].S : messagesInfo[type].P;
		if(DiFi_folders[DiFi_inboxID].newCounts[type]){
			message_text += " (" + DiFi_folders[DiFi_inboxID].newCounts[type] + ((DiFi_folders[DiFi_inboxID].newCounts[type] == DiFi_maxItems)?"+":"") + " new)";
		}
	}
	
	for(var id in DiFi_folders) if (DiFi_folders[id].type == "group"){
		var has_messages = false;
		for (var type in messagesInfo)	if(DiFi_folders[id].counts[type] > 0 || DiFi_folders[id].newCounts[type]) has_messages = true;
		if(!has_messages) continue;
		
		message_text += "\n" ;
		message_text += "#"+DiFi_folders[id].name+":";
		
		for (var type in messagesInfo)	if(DiFi_folders[id].counts[type] > 0){
			message_text += "\n";
			message_text += "> " + DiFi_folders[id].counts[type] + " ";
			message_text += (DiFi_folders[id].counts[type] == 1) ? messagesInfo[type].S : messagesInfo[type].P;
			if(DiFi_folders[id].newCounts[type]){
				message_text += " (" + DiFi_folders[id].newCounts[type] + ((DiFi_folders[id].newCounts[type] == DiFi_maxItems)?"+":"") + " new)";
			}
		} else if (DiFi_folders[id].counts[type] == 0 && DiFi_folders[id].newCounts[type] > 0) { // Feed
			message_text += "\n";
			message_text += "> " + DiFi_folders[id].newCounts[type] + " new ";
			message_text += (DiFi_folders[id].counts[type] == 1) ? messagesInfo[type].S : messagesInfo[type].P;
			message_text += " (Feed)";
		}
	}*/
	
	if (!message_text) message_text = "\n No Messages";
	
	title += message_text;
	
	return prepText(title);
}

// ----------------------------------------------------

var popupData = {state: "init"};

function DiFi_updatePopup() {
	popupData.state = "done";
	popupData.refreshing = false;
	popupData.lastUpdateAt = getTimestamp();
	
	popupData.folderInfo = new Object();
	for (var i in DiFi_folderInfo) popupData.folderInfo[i] = DiFi_folderInfo[i];
	
	popupData.folders = new Object();
	for (var i in DiFi_folders) popupData.folders[i] = DiFi_folders[i];
	
	popupData.aggregateClasses = new Object();
	for(var c in aggregateClasses) popupData.aggregateClasses[c] = aggregateClasses[c];
	
	popupData.totalCount = DiFi_totalCount;
	popupData.totalNewCount = DiFi_totalNewCount;
	
	var totalApprox = false;
	for(var c in aggregateClasses) totalApprox = totalApprox || aggregateClasses[c].newCountApprox;
	popupData.totalNewCountApprox = totalApprox;
	
	popupData.inboxID = DiFi_inboxID;

	chrome.extension.sendMessage({action : 'updatePopup', data : popupData});
	DiFi_updateBadge();
}

// ----------------------------------------------------

function DiFi_updateBadge() {
	var badgeText = DiFi_totalCount+'';
	
	chrome.browserAction.setIcon({path: "img/dan_logo2_19_crisp.png"});
	
	if(!DiFi_totalCount) {
		if (!DiFi_totalNewCount){
			chrome.browserAction.setBadgeBackgroundColor(COLOR_INACTIVE);
			if(Prefs.hideZero.get()) badgeText = '';
		}
		else { // THIS SHOULD ONLY HAPPEN IF ONLY FEED MESSAGES ARE PRESENT
			badgeText = DiFi_totalNewCount+'f';
		}
	}
	else if (DiFi_hasNew) {
		chrome.browserAction.setBadgeBackgroundColor(COLOR_DEBUG);
	}
	else {
		chrome.browserAction.setBadgeBackgroundColor(COLOR_ACTIVE);
	}
	
	chrome.browserAction.setBadgeText({text: prepText(badgeText)});
	
	if(DiFi_mustAlert) playSound(); 
	if(DiFi_mustPopup && Prefs.showToast.get()) DiFi_showDesktopNotification(); 
	
	DiFi_skipUpdate = false;
	
	if(DiFi_capturing){
		DiFi_mustCapture = false;
		DiFi_capture.timestamp = DiFi_highestTimestamp || epochTS();
		localStorage["captureData"] = JSON.stringify(DiFi_capture);
	}
}

function DiFi_showDesktopNotification() {
	var data = new Object();
	var dispatch = false;

	for (var type in messagesInfo) if(Prefs.MT(type).popup && (DiFi_folders[DiFi_inboxID].newCounts[type] > 0)){
		data[type] = {
			count: (
				DiFi_folders[DiFi_inboxID].newCounts[type] +
				((DiFi_folders[DiFi_inboxID].newCounts[type] == DiFi_maxItems)?"+":"")
			),
			ts: DiFi_folders[DiFi_inboxID].highestTimestamps[type],
			feed: false
		};
		dispatch = true;
	}
	
	data.groups = new Object();
	for(var id in DiFi_folderInfo){
		if(DiFi_folderInfo[id].type != "group") continue;
		
		var name = DiFi_folderInfo[id].name;
		data.groups[name] = new Object();
		data.groups[name].id = id;
		
		for (var type in groupMessagesInfo) if(Prefs.GMT(type).popup && (DiFi_folders[id].newCounts[type] > 0)){
			data.groups[name][type] = {
				count: (
					DiFi_folders[id].newCounts[type] +
					((DiFi_folders[id].newCounts[type] == DiFi_maxItems)?"+":"")
				),
				ts: DiFi_folders[id].highestTimestamps[type],
				feed: (DiFi_folders[id].counts[type] == 0 && DiFi_folders[id].newCounts[type] > 0)
			};
			dispatch = true;
		}		
	}
	
	if(dispatch) DN_notify(data);
}

function DiFi_seenInbox(){ // Assume user have seen inbox
	DiFi_timestamp = DiFi_highestTimestamp || epochTS();
	if(Prefs.rememberState.get()){localStorage.lastState_timestamp = DiFi_timestamp;}
	//DiFi_alertTimestamp = DiFi_highestTimestamp || epochTS();
	chrome.browserAction.setBadgeBackgroundColor(COLOR_INACTIVE);
}

//--------------------------------------------------------------------------------------------------

// function DiFi_dispatcher() {
	
// }

// chrome.extension.onRequest.addListener(DiFi_dispatcher);

//--------------------------------------------------------------------------------------------------

var DiFi_skipUpdate = false;
var DiFi_skipGuard = 0;

var DiFi_capture = new Object();
var DiFi_capturing = false;
var DiFi_mustCapture = false;

function DiFi_doEverything() {
	// DiFi_callChain([ ... ]); // Okay, that was a pretty idea.. R.I.P.
	
	if(DiFi_skipUpdate && DiFi_skipGuard < 5) {console.log("Request skipped at "+ getTimestamp()); DiFi_skipGuard++; return;}
	
	DiFi_skipUpdate = true;
	DiFi_skipGuard = 0;
	popupData.refreshing = true;
	
	DiFi_capturing = DiFi_mustCapture;
	if(DiFi_capturing) DiFi_capture.folderData = new Object();
	
	chrome.extension.sendMessage({action : 'updatePopup', data : popupData});
	
	DiFi_JSONrequest("?c[]=MessageCenter;get_folders&t=json", 0, DiFi_getInboxID);
}

//--------------------------------------------------------------------------------------------------

// Workaround for limitations of known DiFi methods

var dAMC_deviantInfo = {};

function dAMC_folderInfoRequest(){
	var xhr = new XMLHttpRequest();
	var abortTimerId = window.setTimeout(function() {
		xhr.abort();
		handleError({type: "TIMEOUT"});
	}, Prefs.timeoutInterval.get());

	xhr.onreadystatechange = function(){
		if (xhr.readyState != 4 || (xhr.status != 200 && xhr.status != 403))
			return;

		if (xhr.status == 403){ // doesn't really work anymore
			handleError({type: "LOGGED_OUT"});
			window.clearTimeout(abortTimerId);
			loggedOut = true;
			return;
		}

		loggedOut = false;

		if (xhr.responseText) {
			window.clearTimeout(abortTimerId);
		
			var result;
			
			var tmp = new String();
			tmp = xhr.responseText;
			
			try{
				//result = (/<a class=oh-l .*?\.deviantart\.com">.*?<\/span>(.*?) <img/.exec(xhr.responseText))[1];
				if(/deviantART.deviant\s*=\s*({.*?})/.test(tmp))
				{ // Found deviant's info block
					dAMC_deviantInfo = JSON.parse((/deviantART.deviant\s*=\s*({.*?})/.exec(tmp))[1]);
					if (dAMC_deviantInfo.username == undefined)
					{
						result = '???';
						console.error("dAMC: Unable to resolve username; failing gracefully"); 
					}
					result = dAMC_deviantInfo.symbol + dAMC_deviantInfo.username;
				}
				else
				{
					result = '???';
					console.error("dAMC: Unable to resolve username; failing gracefully"); 
				}
				
				DiFi_folderInfo = new Object();
				
				console.log("Username: '"+result+"'"); 
				DiFi_folderInfo[DiFi_inboxID] = {name: result, type: "inbox"};
				
				for(var i in DiFi_folders) if(DiFi_folders[i].type != "inbox"){
					if(((new RegExp('mcdata="\\\{(.*?'+i+'.*?)\\\}"','g')).exec(tmp)) && 
						/is_group\&quot\;\:true/.test(((new RegExp('mcdata="\\\{(.*?'+i+'.*?)\\\}"','g')).exec(tmp))[0]))
					{
						console.log("Folder: "+i+", is a group");
						DiFi_folderInfo[i] = {name: DiFi_folders[i].name, type: "group"};
					}
					else {
						console.log("Folder: "+i+", is not a group");
						DiFi_folderInfo[i] = {name: DiFi_folders[i].name, type: "folder"};	
					}
				}
				
				getFolderInfo(true);
			}
			catch(e){
				handleError({type: "PARSE_ERROR", raw: e.stack.replace(traceRegexp, '')});
				console.log(e.stack);
			}
			
			//callback(result);
		}
		else{return;} // Catches abort()
	}
	
	xhr.open("GET", getMessagesUrl(), true);
	
	// Paranoid?
	xhr.setRequestHeader("Cache-Control", "no-cache");
	xhr.setRequestHeader("Pragma", "no-cache");
	
	xhr.send(null);
}
