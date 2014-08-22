if(chrome.notifications){
	chrome.notifications.onClicked.addListener(DN_RichOnClick);
	chrome.notifications.onButtonClicked.addListener(DN_RichOnButtonClick);
}

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
	if(chrome.notifications){
		chrome.notifications.clear("dANotifier", function(){});
		for(var id in DiFi_folders)	{
			chrome.notifications.clear("dANotifier-" + id, function(){});
		}
	}
}

var DN_currentNotification;
var DN_notificationData;

function DN_createNewNotification(){
	switch(Prefs.toastMode.get()){
		case "html":
			DN_HTMLNotify();
			break;
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

function DN_HTMLNotify(){
	DN_currentNotification = webkitNotifications.createHTMLNotification( chrome.runtime.getURL('dn.html')	);
	DN_currentNotification.tag = "dANotifier";
	DN_currentNotification.show();	
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
			title: "New messages for " + DiFi_folders[DiFi_inboxID].name,
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
				title: "New messages for #" + DiFi_folders[id].name,
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
					goToMTUrl(type, true);
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

function DN_onEntryClick(type, e){
	var alt = (e.metaKey || e.ctrlKey || e.shiftKey || e.button == 1);

	chrome.extension.getBackgroundPage().goToMTUrl(type, alt);
	
	if(type.match(/^\d+$/)) {
		$('#DN_group-'+type+' .DN_entry').addClass("DN_entry_seen");
	}
	else $('#entry-'+type).addClass("DN_entry_seen");
	
	return false;
}

function DN_createMarkReadLink(){
	return $('<a>', {
		href : "#",
		text : "Dismiss as read",
		on	 : {
			click : function(e) { 
				chrome.runtime.sendMessage({'action' : 'seenInbox'});
				chrome.runtime.sendMessage({'action' : 'clearPopupNew'});
			}
		}
	});
}

function DN_createOpenAllLink(){
	return $('<a>', {
		href : "#",
		text : "Open all",
		on	 : {
			click : function(e) { 
				for(var type in messagesInfo) if(DN_notificationData[type]){
					chrome.extension.getBackgroundPage().goToMTUrl(type, true);
				}

				for (var name in DN_notificationData.groups) {
					for(var type in groupMessagesInfo) if(DN_notificationData.groups[name][type]) {
						chrome.extension.getBackgroundPage().goToMTUrl(DN_notificationData.groups[name].id, true);
						break;	
					}
				}
				window.close();
				//$('.DN_entry').addClass("DN_entry_seen");
			}
		}
	});	

}



function DN_fillEntries(){
	DN_notificationData = chrome.extension.getBackgroundPage().DN_notificationData;
	
	$("#DN_header").append(DN_createOpenAllLink()).append(" | ").append(DN_createMarkReadLink());
	
	var entries = $();
	for(var type in messagesInfo) if(DN_notificationData[type]){
		entries = entries.add(DN_createDNEntry(DN_fillEntry(type, DN_notificationData)));
	}
	$('<table class="entry_container" />').append(entries).appendTo('#DN_inbox');
	
	for (var name in DN_notificationData.groups) {
		var id = DN_notificationData.groups[name].id;
		var container = DN_createDNGroupContainer(id).appendTo("#DN_container");
		
		var header_created = false;
		entries = $();
		
		for(var type in groupMessagesInfo) if(DN_notificationData.groups[name][type]) {
			if(!header_created){
				container.append(DN_createDNGroupHeader({id: id, name: name}));
				header_created = true;
			}
			entries = entries.add(DN_createDNGroupEntry(DN_fillEntry(type, DN_notificationData.groups[name], id)));
		}
		if(header_created) {
			$('<table class="entry_container" />').append(entries).appendTo(container);
		}
	}
	
	// Accomodate for the scrollbar, if any
    if ($("body").height() > $(window).height()) {
        $(".entry").css("width", "90%");
    }
}

function DN_fillEntry(type, data, id){
	return {
		id: id || 0,
		type: type, 
		text: data[type].count + ' ' + ((data[type].feed)?'Feed ':'') + ((data[type].count == 1) ? messagesInfo[type].S : messagesInfo[type].P)
	};
}

function DN_TextEntry(type, data, id){
	return data[type].count + ' ' + ((data[type].feed)?'Feed ':'') + ((data[type].count == 1) ? messagesInfo[type].S : messagesInfo[type].P);
}

function DN_createDNEntry(args) {
	var element = $('<td>', {
		'class' : 'DN_entry',
		id 		: 'entry-' +  args.type,
		text 	: args.text,
		on 		: { click : function(e) { DN_onEntryClick(args.type, e); } }
	});

	return $('<tr>').append(element);
}

function DN_createDNGroupContainer(id) {
	return $("<div>", {
		id : 'DN_group-' + id
	});
}

function DN_createDNGroupHeader(args) {
	return $('<div>', {
		'class'	: 'header',
		id		: 'header-' + args.id,
		text	: '#' + args.name
	});
}

function DN_createDNGroupEntry(args) {
	var element = $('<td>', {
		'class' : 'DN_entry',
		id 		: 'entry-' + args.id + '-' +  args.type,
		text 	: args.text,
		on 		: { click : function(e) { DN_onEntryClick(args.id, e); } }
	});

	return $('<tr>').append(element);
}