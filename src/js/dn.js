function DN_notify(data){
	DN_notificationData = data;
	if(DN_notificationStatus == "UNINIT") DN_createNewNotification();
	if(DN_notificationStatus == "QUEUED") DN_currentNotification.show();
	if(DN_notificationStatus == "SHOWN") {
		chrome.extension.getViews({type:"notification"}).forEach(function(win) {
			win.DN_updateEntries();
		});
		console.log("Notification updated");
	}
	return;
}

var DN_currentNotification;
var DN_notificationStatus = "UNINIT"; // FIXME Status debug cleanup 
var DN_notificationData;

function DN_createNewNotification(){
	DN_currentNotification = webkitNotifications.createHTMLNotification( chrome.extension.getURL('dn.html')	);
	DN_notificationStatus - "INIT"; console.log("Notification created");
	DN_currentNotification.ondisplay = function() { 
		DN_notificationStatus = "SHOWN"; 
		console.log("Notification shown"); 
	};
    DN_currentNotification.onclose = function() { DN_notificationStatus = "UNINIT"; console.log("Notification closed"); };
	
	DN_notificationStatus = "QUEUED"; console.log("Notification queued");
}

function DN_onEntryClick(type, e){
	var alt = (e.metaKey || e.ctrlKey || e.shiftKey || e.button == 1);

	chrome.extension.getBackgroundPage().goToMTUrl(type, alt);
	//chrome.extension.getBackgroundPage().DiFi_seenInbox();
	
	if(type.match(/^\d+$/)) {
		var elements = document.getElementById('DN_group-'+type).childNodes;
		for (var i in elements) {
			if (elements[i].className == "DN_entry") elements[i].className="DN_entry_seen";
		}
	}
	else document.getElementById('entry-'+type).className="DN_entry_seen";
	//this.className="DN_entry_seen";
	
	return false;
}

function DN_fillEntries(){
	DN_notificationData = chrome.extension.getBackgroundPage().DN_notificationData;
	
	//username =
	for(var type in messagesInfo) if(DN_notificationData[type]){
		document.getElementById('DN_inbox').appendChild(DN_createDNEntry(DN_fillEntry(type, DN_notificationData)));
	}
	
	for (var name in DN_notificationData.groups) {
		var id = DN_notificationData.groups[name].id;
		var container = document.getElementById('DN_container').appendChild(DN_createDNGroupContainer(id));
		
		var header_created = false;
		
		for(var type in groupMessagesInfo) if(DN_notificationData.groups[name][type]) {
			if(!header_created){
				container.appendChild(DN_createDNGroupHeader({id: id, name: name}));
				header_created = true;
			}
			
			container.appendChild(DN_createDNGroupEntry(DN_fillEntry(type, DN_notificationData.groups[name], id)));
		}
	}
}

function DN_fillEntry(type, data, id){
	return {
		id: id || 0,
		type: type, 
		text: data[type].count + ' ' + ((data[type].feed)?'Feed ':'') + ((data[type].count == 1) ? messagesInfo[type].S : messagesInfo[type].P)
	};
}

function DN_updateEntries(){
	//document.getElementById('DN_container').innerHTML = "";
	//DN_fillEntries();
	var newData = chrome.extension.getBackgroundPage().DN_notificationData;
	for (var type in messagesInfo) if(newData[type]) {
		var element = document.getElementById('entry-' + type);
		if(element) 
		{ // We already have this entry, maybe we need to update it
			if(DN_notificationData[type].ts < newData[type].ts){ // It really contains new data, we need to update
				document.getElementById('DN_inbox').replaceChild(
					DN_createDNEntry(DN_fillEntry(type, newData)),
					element
				);
			}
		}
		else { // We have to add a new entry
			document.getElementById('DN_inbox').appendChild(DN_createDNEntry(DN_fillEntry(type, newData)));
		}
		DN_notificationData[type] = newData[type];
	}
	
	for (var name in DN_notificationData.groups) {
		var id = DN_notificationData.groups[name].id;
		
		
		var container = document.getElementById('DN_group-'+id);
		if(!container) container = document.getElementById('DN_container').appendChild(DN_createDNGroupContainer(id));
		
		var header_created = document.getElementById('header-'+id);
		
		for(var type in groupMessagesInfo) if(newData.groups[name][type]) {
			if(!header_created){
				container.appendChild(DN_createDNGroupHeader({id: id, name: name}));
				header_created = true;
			}
			
			var element = document.getElementById('entry-' + id + '-' + type);		
			if(element) {
				if(DN_notificationData.groups[name][type].ts < newData.groups[name][type].ts){ // It really contains new data, we need to update
					container.replaceChild(
						DN_createDNGroupEntry(DN_fillEntry(type, newData.groups[name], id)),
						element
					);
				}				
			}
			else {
				container.appendChild(DN_createDNGroupEntry(DN_fillEntry(type, newData.groups[name], id)));
			}
			
			DN_notificationData.groups[name][type] = newData.groups[name][type];
		}
	}
}

function DN_createDNEntry(args) {
	var element = document.createElement("div");
	element.className = 'DN_entry';
	element.id = 'entry-' + args.type;
	element.onclick = function(e) {DN_onEntryClick(args.type, e);};
	element.innerHTML += args.text;
	
	return element;
	
	//document.getElementById('DN_container').innerHTML += HTML;
	
	//Entry.Element = document.getElementById('entry-' + args.type);
	
	/*args.pref.initHTMLControl = function() {
		this.HTMLControl = document.getElementById('pref-' + this.key);
		this.HTMLControl.get = function () { return (this.value * args.multiplier); }
		this.HTMLControl.set = function (value) { this.value = (value / args.multiplier); }
		this.saveHTML = function () {
			var result=this.set(this.HTMLControl.get());
			document.getElementById('pref-' + this.key + '-err').innerHTML = result.message;
		}
		
		this.HTMLControl.set(this.get());
		
		this.HTMLControl.oninput=markDirty;
	}*/
}

function DN_createDNGroupContainer(id) {
	var element = document.createElement("div");
	element.id = 'DN_group-' + id;
	
	return element;
}

function DN_createDNGroupHeader(args) {
	var element = document.createElement("div");
	element.className = 'header';
	element.id = 'header-' + args.id;
	element.innerHTML = '#' + args.name;
	
	return element;
}

function DN_createDNGroupEntry(args) {
	var element = document.createElement("div");
	element.className = 'DN_entry';
	element.id = 'entry-' + args.id + '-' +  args.type;
	element.onclick = function(e) {DN_onEntryClick(args.id, e);};
	element.innerHTML += args.text;
	
	return element;
}