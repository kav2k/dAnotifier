if(chrome.notifications) {
	chrome.notifications.onClicked.addListener(DN_RichOnClick);
	chrome.notifications.onButtonClicked.addListener(DN_RichOnButtonClick);
}

function DN_notify(data) {
	DN_notificationData = data;
	
	DN_createNewNotification();
	
	return;
}

function DN_clear() {
	if(DN_currentNotification) {
		DN_currentNotification.cancel();
		//DN_notificationStatus = "UNINIT";
		console.log("Notification reset");
	}
	if(chrome.notifications) {
		chrome.notifications.clear("dANotifier");
		for(var id in DiFi_folders)	{
			chrome.notifications.clear("dANotifier-" + id);
		}
	}
}

var DN_currentNotification;
var DN_notificationData;

function DN_createNewNotification(){
	switch(Prefs.toastMode.get()){
		case "rich":
			DN_RichNotify();
			break;
		case "basic":
			// break; // Purposeful
		default:
			console.error("Notification type "+Prefs.toastMode.get()+" is unsupported!");
			break;
	}
}

function DN_RichNotify(){
	var entries = new Array();
	
	for(var type in messagesInfo) if(DN_notificationData[type]){
		entries.push(DN_TextEntry(type, DN_notificationData));
	}
	if(entries.length) {
		chrome.notifications.clear("dANotifier", function(){});
		chrome.notifications.create("dANotifier", {
			type: "basic",
			title: "New notifications for " + DiFi_folders[DiFi_inboxID].name,
			message: entries.join("\n"),
			priority: 1,
			iconUrl: chrome.runtime.getURL("img/dan_logo2_128_padded.png"),
			buttons: [{title: "Open all"}, {title: "Dismiss as read"}],
			isClickable: true
		}, function(){console.log(chrome.runtime.lastError);});
	}
	
	for (var name in DN_notificationData.groups) {
		var id = DN_notificationData.groups[name].id;		
		var has_new = false;
		entries = new Array();
		
		for(var type in groupMessagesInfo) if(DN_notificationData.groups[name][type]) {
			has_new = true;
			entries.push(DN_TextEntry(type, DN_notificationData.groups[name], id));
		}
		if(has_new) {
			chrome.notifications.clear("dANotifier-"+id, function(){});
			chrome.notifications.create("dANotifier-"+id, {
				type: "basic",
				title: "New notifications for #" + DiFi_folders[id].name,
				message: entries.join("\n"),
				priority: 1,
				iconUrl: chrome.runtime.getURL("img/dan_logo2_128_padded.png"),
				buttons: [{title: "Dismiss as read"}],
				isClickable: true
			}, function(){console.log(chrome.runtime.lastError);});
		}
	}
}

function DN_RichOnClick(id){
	var group;
	if(/dANotifier-(\d+)/.exec(id)){
		group = /dANotifier-(\d+)/.exec(id)[1];
	}	

	goToMTUrl((group || 'all'), true, false);
	chrome.notifications.clear(id, function(){});
}

function DN_RichOnButtonClick(id, button){
	var group;
	if(/dANotifier-(\d+)/.exec(id)){
		group = /dANotifier-(\d+)/.exec(id)[1];
	}
	
	if(!group) {
		switch(button){
			case 0:
				for(var type in messagesInfo) if(DN_notificationData[type]){
					goToMTUrl(messagesInfo[type].UP, true);
				}
				chrome.notifications.clear(id, function(){});
				break;
			case 1:
				chrome.runtime.sendMessage({'action' : 'seenInbox'});
				chrome.runtime.sendMessage({'action' : 'clearPopupNew'});
				break;
		}
	} else {
		chrome.runtime.sendMessage({'action' : 'seenInbox'});
		chrome.runtime.sendMessage({'action' : 'clearPopupNew'});
	}
}

function DN_TextEntry(type, data, id){
	return data[type].count + ' ' + ((data[type].feed)?'Feed ':'') + ((data[type].count == 1) ? messagesInfo[type].S : messagesInfo[type].P);
}