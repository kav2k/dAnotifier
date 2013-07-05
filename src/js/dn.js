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
				chrome.extension.sendMessage({'action' : 'seenInbox'});
				chrome.extension.sendMessage({'action' : 'clearPopupNew'});
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