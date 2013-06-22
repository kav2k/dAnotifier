function DN_notify(data){
	DN_notificationData = data;
	
	DN_createNewNotification();
	
	return;
}

function DN_clear(){
	if(DN_currentNotification){
		DN_currentNotification.cancel();
		//DN_notificationStatus = "UNINIT";
		console.log("Notification reset");
	}
}

var DN_currentNotification;
var DN_notificationData;

function DN_createNewNotification(){
	DN_currentNotification = webkitNotifications.createHTMLNotification( chrome.extension.getURL('dn.html')	);

	DN_currentNotification.tag = "dANotifier";
	
	DN_currentNotification.show();
}

function DN_onEntryClick(type, e){
	var alt = (e.metaKey || e.ctrlKey || e.shiftKey || e.button == 1);

	chrome.extension.getBackgroundPage().goToMTUrl(type, alt);
	
	if(type.match(/^\d+$/)) {
		var elements = document.getElementById('DN_group-'+type).childNodes;
		for (var i in elements) {
			if (elements[i].className == "DN_entry") elements[i].className="DN_entry_seen";
		}
	}
	else document.getElementById('entry-'+type).className="DN_entry_seen";
	
	return false;
}

function DN_fillEntries(){
	DN_notificationData = chrome.extension.getBackgroundPage().DN_notificationData;
	
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

function DN_createDNEntry(args) {
	var element = document.createElement("div");
	element.className = 'DN_entry';
	element.id = 'entry-' + args.type;
	element.onclick = function(e) {DN_onEntryClick(args.type, e);};
	element.innerHTML += args.text;
	
	return element;
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