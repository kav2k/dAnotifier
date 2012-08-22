/** TOP LEVEL CODE **/

$(document).ready( function() {
	
	chrome.extension.onRequest.addListener( function (request) {
		if(request.action == "updatePopup") P_fill(request.data);
	});
	
	initPrefs();
	P_fill(chrome.extension.getBackgroundPage().popupData);

});

function P_fill(data) {
	
	$("#P_header").replaceWith(P_createHeader(data));
	
	if (data.aggregateClasses) { // We should have it after at least one successful update
		$("#P_container").replaceWith(P_createContainer(data));
	}
	
	$("#P_footer").replaceWith(P_createFooter(data));
	
}

/** VARIOUS CONTENT GENERATORS **/

/*	Content structure:

Header [P_createHeader]
> New messages subheader [P_createHeader]

Main container [P_createContainer]

> Agregate class container [P_createContainer]
>> Agregate class table/tbody [P_createContainer]
>>> Agregate class header [P_createClassHeader]
>>> Agregate class entry [P_createEntry]

> Group container [P_createContainer]
>> Group header [P_createContainer]
>> Group table/tbody [P_createContainer]
>>> Group entry [P_createGroupEntry]

Footer container [P_createFooter]
> Update spinner [P_createFooter]
> Update timestamp [P_createFooter]
> Update spinner [P_createFooter]

*/

/* Header */

function P_createHeader(data) {
	
	var header = $('<div class="header" id="P_header">');
	
	if(data.state == "init") {
		return header.append("Waiting for data…");
	}
	
	P_createMCLink()
		.text( 
			(data.totalCount || "No") + " message" + ((data.totalCount == 1) ? "" : "s")
		)
		.appendTo(header);
	
	var username = data.folders[data.inboxID].name;
	header.append(" for " + username.substring(0,1)); // User symbol
	header.append( P_createProfileLink( username.substring(1) ) ); // User profile
	
	if(data.totalNewCount > 0) {
	
		var new_header = $('<div class="subheader" id="P_new_header">');
		
		$('<span class="new_text" />')
			.text(
				data.totalNewCount + ((data.totalNewCountApprox) ? "+" : "") + 
				" new message" + ((data.totalNewCount == 1) ? "" : "s")
			)
			.appendTo(new_header);
		new_header.append(" | ");
		new_header.append(P_createMarkReadLink());		
		
		header.append(new_header);
	}
	
	return header;
}

function P_createProfileLink(username){
	return $("<a href='#' />")
		.text(username)
		.click( function(e) { P_openURL ( username + ".deviantart.com/" ); } );
}

function P_createMCLink(type){
	return $("<a href='#' />").click( 
		function(e) { P_openMC( type || 'all' ); return false; }
	);
}

function P_createMarkReadLink(type){
	return $('<a href="#" />')
		.text("Mark all as read")
		.click( function(e) { chrome.extension.sendRequest({'action' : 'seenInbox'}); P_forceUpdate(); } );
}

/* Main container */

function P_createContainer(data) {

	var container = $('<div />', {
		"class" : 'container',
		id : 'P_container'
	});
	
	var aggregateClasses = data.aggregateClasses;
	
	for (var cl in aggregateClasses) {
	
		if(aggregateClasses[cl].special && aggregateClasses[cl].special == "group") {
		
			for(var id in data.folders) if (data.folders[id].type == "group" && aggregateClasses[cl].groups[id].count + aggregateClasses[cl].groups[id].newCount > 0) {
			
				var group_name = data.folders[id].name;
				
				var group_container = $('<div />', {
					"class" : 'class_container',
					id : 'P_group-' + id
				});
				
				// Group header
				$('<div class="header"/>')
					.append("#")
					.append(P_createProfileLink(group_name))
					.append(":")
					.appendTo(group_container);
				
				var entries = $();
				
				for(var t in aggregateClasses[cl].types) if (data.folders[id].counts[aggregateClasses[cl].types[t]] + data.folders[id].newCounts[aggregateClasses[cl].types[t]] > 0){
					entries = entries.add(
						P_createGroupEntry(aggregateClasses[cl].types[t], data.folders[id], id)
					);
				}
				
				$('<table class="entry_container" />').append(entries).appendTo(group_container);
				
				container.append(group_container);
			}
		}
		
		else if (aggregateClasses[cl].count + aggregateClasses[cl].newCount > 0) {
		
			var singleton = (aggregateClasses[cl].special && aggregateClasses[cl].special == "singleton");
			
			var ac_container = $('<div class="class_container">');
				
				var entries = $();
				
				if (!singleton){
					entries = entries.add(
						P_createClassHeader(aggregateClasses[cl], cl)
					);
				}
								
				for(var t in aggregateClasses[cl].types) if (data.folders[data.inboxID].counts[aggregateClasses[cl].types[t]] > 0){
					entries = entries.add(
						P_createEntry(aggregateClasses[cl].types[t], data.folders[data.inboxID])
					);
				}
				
				$('<table class="entry_container" />').append(entries).appendTo(ac_container);
				
			container.append(ac_container);
		}
	}
	
	return container;
}

function P_createClassHeader(ac_data, ac) {
	var element = $('<td class="entry class_header">');
	element.click( function(e) { P_onEntryClick(ac, e); } );
	
	element.text( 
		ac_data.count + ' ' 
		+ ((ac_data.count == 1) ? ac_data.S : ac_data.P) 
	);
	
	if(ac_data.newCount) {
		var new_span = $('<span class="new_text">');
		new_span.text( ' (' +  ac_data.newCount + (ac_data.newCountApprox ? "+" : "")+ ' new)' );
		element.append(new_span);
	}
	
	return $('<tr>').append(element);
}

function P_createEntry(type, data) {
	var element = $('<td class="entry">', {id : 'entry-' +  type});
	element.click( function(e) { P_onEntryClick(type, e); } );
	
	element.text( 
		data.counts[type] + ' ' 
		+ ((data.counts[type] == 1) ? messagesInfo[type].S : messagesInfo[type].P)
	);
	
	if(data.newCounts[type]) {
		var new_span = $('<span class="new_text">');
		new_span.text( ' (' +  data.newCounts[type] + ((data.newCounts[type] == Prefs.maxItems.get())?'+':'') + ' new)' );
		element.append(new_span);
		element.addClass("has_new");
	}

	return $('<tr>').append(element);
}

function P_createGroupEntry(type, data, id) {
	id = id || 0;
	
	var element = $('<td class="entry">', {id : 'entry-' + id + '-' +  type});
	element.click( function(e) { P_onEntryClick(id, e); } );
	
	element.text( 
		data.counts[type] + ' ' 
		+ ((data.counts[type] == 1) ? messagesInfo[type].S : messagesInfo[type].P)
	);
	
	var new_span = $('<span class="new_text">');
	
	if(groupMessagesInfo[type].feed) {
		element.text(
			data.newCounts[type] + ((data.newCounts[type] == Prefs.maxItems.get())?'+':'') + ' ' 
			+ ((data.newCounts[type] == 1) ? messagesInfo[type].S : messagesInfo[type].P)
		);
		$('<span class="new_text">').text(" (Feed)").appendTo(element);
		element.addClass("has_new");
	} else {
		element.text(
			data.counts[type] + ' ' + ((data.counts[type] == 1) ? messagesInfo[type].S : messagesInfo[type].P)
		);
		if(data.newCounts[type]) {
			$('<span class="new_text">').text(
				' (' +  data.newCounts[type] + ((data.newCounts[type] == Prefs.maxItems.get())?'+':'') + ' new)'
			).appendTo(element);
		}
		element.addClass("has_new");
	}

	return $('<tr>').append(element);
}

function P_createFooter(data) {
	var footer = $('<div class="footer" id="P_footer">');
	
	$('<img src="img/loading.gif" class="spinner left">').appendTo(footer); // padding for symmetry, invisible
	
	if(!data.lastUpdateAt) { 	// Rare: not a single update finished yet
		footer.append("First update…");
	} else {					// Normal: we have last update time
		footer.append("Last updated: " + data.lastUpdateAt);
	}
	
	$('<img src="img/loading.gif" class="spinner right">')
		.css("visibility", (data.refreshing) ? 'visible' : 'hidden')
		.appendTo(footer);
	
	var footer_commands = $('<div class="footer">');
	
	footer_commands
		.append(
			$('<a href="#">').text("Options").click( function(e) { P_openOptions(); } )
		).append(" | ")
		.append(
			$('<a href="#">').text("Update now").click( function(e) { P_forceUpdate(); } )
		).append(" | ")
		.append(
			$('<a href="#">').text("Time machine!").click( function(e) { P_debugTimestamp(); } )
		);
		
	return footer.append(footer_commands);
}

/** UTILITY FUNCTIONS **/

function P_onEntryClick(type, e){
	var alt = (e.metaKey || e.ctrlKey || e.shiftKey || e.button == 1);

	//chrome.extension.getBackgroundPage().goToMTUrl(type, alt);
	P_openMC(type, alt);
	//chrome.extension.getBackgroundPage().DiFi_seenInbox();
	
	if(type.match(/^\d+$/)) {
		$('#P_group-'+type+' .entry').addClass("entry_seen");
	}
	else $('#entry-'+type).addClass("entry_seen");
	//this.className="P_entry_seen";
	
	return false;
}

function P_openMC(type, alt) {
	chrome.extension.sendRequest({ action : 'showMC', type : type, alt : (alt || false) });
}

function P_openURL(url) {
	url = (Prefs.useHTTPS.get() ? "https://" : "http://") + url.toLowerCase();
	chrome.extension.sendRequest({ action : 'openURL', url : url });
}

function P_openOptions() {
	chrome.extension.sendRequest({ action : 'openURL', url : chrome.extension.getURL('options.html') });
}

function P_debugTimestamp() {
	var ts = Math.round(new Date().getTime()/1000.0) - 2592000;
	chrome.extension.getBackgroundPage().DiFi_timestamp = ts;
	chrome.extension.getBackgroundPage().DiFi_alertTimestamp = ts;
	P_forceUpdate();
}

function P_forceUpdate() {
	chrome.extension.sendRequest({ action : 'updateNow'});
}