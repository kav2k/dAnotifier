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
	return $('<a href="#" />', {
		text: "Mark all as read"
	}).click(
		function(e) { chrome.extension.sendRequest({'action' : 'seenInbox'}); P_forceUpdate(); }
	);
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
		
//		else if (aggregateClasses[cl].special && aggregateClasses[cl].special == "singleton") {
//			
//		}
		
		else if (aggregateClasses[cl].count + aggregateClasses[cl].newCount > 0) {
		
			var singleton = (aggregateClasses[cl].special && aggregateClasses[cl].special == "singleton");
			
			var ac_container = $('<div class="class_container">');
			
			

				var ac_table = document.createElement('table');
					ac_table.className = 'entry_container';
					var ac_tbody = document.createElement('tbody');
					ac_table.appendChild(ac_tbody);

				
				/*var ac_table = document.createElement('entry');
					ac_table.className = 'entry';
				ac_container.appendChild(ac_table);*/
				
				if (!singleton){	
					ac_tbody.appendChild(
						P_createClassHeader(aggregateClasses[cl], cl)
					);
				}
								
				for(var t in aggregateClasses[cl].types) if (data.folders[data.inboxID].counts[aggregateClasses[cl].types[t]] > 0){
					ac_tbody.appendChild(
						P_createEntry(aggregateClasses[cl].types[t], data.folders[data.inboxID])
					);
				}
				ac_container.append(ac_table);
				
			container.append(ac_container);
				/*
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
						for(var t in aggregateClasses[cl].types) if (data.folders[DiFi_inboxID].newCounts[aggregateClasses[cl].types[t]]){
							message_text += "\n> " + 
								DiFi_tooltipAggregateLine(aggregateClasses[cl].types[t], data.folders[DiFi_inboxID].newCounts[aggregateClasses[cl].types[t]], false);
						}
					}		
				}*/
		}
	}
	
	return container;
}

function P_createClassHeader(ac_data, ac) {
	var row = document.createElement("tr");
			
		var element = document.createElement("td");
			element.className = 'entry class_header';
			//element.id = 'entry-' +  type;
			element.onclick = function(e) {P_onEntryClick(ac, e);};
	
		var text = ac_data.count + ' ' + ((ac_data.count == 1) ? ac_data.S : ac_data.P);
		element.appendChild(document.createTextNode(text));
		
		if(ac_data.newCount) {
			var new_span = document.createElement("span");
				new_span.className = 'new_text';
				new_span.innerText = ' (' +  ac_data.newCount + (ac_data.newCountApprox ? "+" : "")+ ' new)';
				/*((data.newCounts[type] == Prefs.maxItems.get())?'+':'')*/ 
			//element.className += ' has_new';
			element.appendChild(new_span);
		}
			
	row.appendChild(element);
	return row;
}

function P_createEntry(type, data) {
	var row = document.createElement("tr");
			
		var element = document.createElement("td");
			element.className = 'entry';
			element.id = 'entry-' +  type;
			element.onclick = function(e) {P_onEntryClick(type, e);};
			
		//var content = document.createElement("div");
		
		var text = data.counts[type] + ' ' + ((data.counts[type] == 1) ? messagesInfo[type].S : messagesInfo[type].P);
	
		//content.appendChild(document.createTextNode());
		
		element.appendChild(document.createTextNode(text));
		
		if(data.newCounts[type]) {
			var new_span = document.createElement("span");
				new_span.className = 'new_text';
				new_span.innerText = ' (' +  data.newCounts[type] + ((data.newCounts[type] == Prefs.maxItems.get())?'+':'') + ' new)'
				
			element.appendChild(new_span);
			element.className += ' has_new';
		}
			
	row.appendChild(element);
	return row;
}

function P_createGroupEntry(type, data, id) {
	id = id || 0;

	var row = document.createElement("tr");
			
		var element = document.createElement("td");
			element.className = 'entry';
			element.id = 'entry-' + id + '-' +  type;
			element.onclick = function(e) {P_onEntryClick(id, e);};
	
		var text;
		
		var new_span = document.createElement("span");
			new_span.className = 'new_text';
		
		if(groupMessagesInfo[type].feed) {
			text = data.newCounts[type] + ((data.newCounts[type] == Prefs.maxItems.get())?'+':'') + ' ' + ((data.newCounts[type] == 1) ? messagesInfo[type].S : messagesInfo[type].P) 
			new_span.innerText = ' (Feed)';
			element.className += ' has_new';
		} else {
			text = data.counts[type] + ' ' + ((data.counts[type] == 1) ? messagesInfo[type].S : messagesInfo[type].P);
			if(data.newCounts[type]) {
				new_span.innerText = ' (' +  data.newCounts[type] + ((data.newCounts[type] == Prefs.maxItems.get())?'+':'') + ' new)';
				element.className += ' has_new';
			}
		}
	
		element.appendChild(document.createTextNode(text));
		element.appendChild(new_span);
	
	row.appendChild(element);
	return row;
}

function P_createFooter(data) {
	var footer = document.createElement('div');
		footer.className = 'footer';
		footer.id = 'P_footer';
	
	img = document.createElement('img'); // padding
		img.src = 'img/loading.gif';
		//img.style.display = 'inline';
		//img.style.height = '10px';
		img.style.position = 'relative';
		img.style.top = '2px';
		img.style.left = '-4px';
		img.style.padding = 0;
		img.style.margin = 0;
		img.style.visibility = 'hidden';
	footer.appendChild(img);
	
	if(!data.lastUpdateAt) { 	// Rare: not a single update finished yet
		footer.appendChild(document.createTextNode("First update…"));
	}	
	else {						// Normal: we have last update time
		footer.appendChild(document.createTextNode("Last updated: " + data.lastUpdateAt));
	}
	
	img = document.createElement('img');
		img.src = 'img/loading.gif';
		//img.style.display = 'inline';
		//img.style.height = '10px';
		img.style.position = 'relative';
		img.style.top = '2px';
		img.style.left = '4px';
		img.style.padding = 0;
		img.style.margin = 0;
		img.style.visibility = (data.refreshing) ? 'visible' : 'hidden';
	footer.appendChild(img);
	//}
	
	var footer_commands = document.createElement('div');
		footer_commands.className = 'footer';
		
		var options_link = 	document.createElement("a");
			options_link.href = "#";
			options_link.onclick = function(e) { P_openOptions(); };
			options_link.innerText = "Options";
		
		footer_commands.appendChild(options_link);
		
		footer_commands.appendChild(document.createTextNode(" | "));
		
		var forceUpdate_link = 	document.createElement("a");
			forceUpdate_link.href = "#";
			forceUpdate_link.onclick = function(e) { P_forceUpdate(); };
			forceUpdate_link.innerText = "Update now";
		
		footer_commands.appendChild(forceUpdate_link);
		
		footer_commands.appendChild(document.createTextNode(" | "));
		
		var debugTimestamp_link = 	document.createElement("a");
			debugTimestamp_link.href = "#";
			debugTimestamp_link.onclick = function(e) { P_debugTimestamp(); };
			debugTimestamp_link.innerText = "Time machine!";
		
		footer_commands.appendChild(debugTimestamp_link);
	
	footer.appendChild(footer_commands);
	
	return footer;
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