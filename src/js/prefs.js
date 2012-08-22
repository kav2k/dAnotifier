 var Prefs = new Object();
 
 Prefs.add = function (args) {
	Prefs[args.key] = new Preference(args);
 }
 
 Prefs.foreach = function (fun) {
	for(var i in this) { 
		if(Prefs[i].key) { // Is a Preference
			if(typeof(fun) == "function") fun(Prefs[i]);
			else if(typeof(Prefs[i][fun]) == "function") Prefs[i][fun]();
		}
	};
 }
 
 function initPrefs(){
	if(localStorage.showZero != undefined) convertPrefs();
	
	if(Prefs.ready) { Prefs.foreach('init'); return;}
	
	Prefs.add({
		key: "refreshInterval", 
		name: "Refresh interval", 
		def: 60000,
		validators: [IntValidator, GTValidatorMinutes(6000)]
	});
	
	Prefs.add({
		key: "timeoutInterval", 
		name: "Timeout interval", 
		def: 20000,
		validators: [IntValidator, GTValidatorSeconds(1000)]
	});
	
	Prefs.add({
		key: "playSound", 
		name: "Enable sound alerts", 
		def: true, 
		validators: [BoolValidator]
	});
	
	Prefs.add({
		key: "showToast", 
		name: "Enable desktop notifications", 
		def: true, 
		validators: [BoolValidator]
	});
	
	Prefs.add({
		key: "hideZero", 
		name: "Hide badge when the count is 0", 
		def: true, 
		validators: [BoolValidator]
	});
	
	Prefs.add({
		key: "rememberState", 
		name: "Remember state between browser sessions", 
		def: true, 
		validators: [BoolValidator]
	});
	
	for(i in messagesInfo) if(messagesInfo[i].pref) {
		Prefs.add({
			key: messagesInfo[i].pref, 
			name: messagesInfo[i].P,
			def: {count: true, watch: true, badge: true, audio: true, popup: true}, 
			fields: {
				count: {name: "Watch", validators: [BoolValidator]},
				watch: {name: "Track new", validators: [BoolValidator]},
				badge: {name: "Badge alert", validators: [BoolValidator]},
				audio: {name: "Sound alert", validators: [BoolValidator]},
				popup: {name: "Desktop notification", validators: [BoolValidator]},
			},
			validators: [JSONFieldsValidator]
		});	
	}
	
	for(i in groupMessagesInfo) if(groupMessagesInfo[i].pref) {
		Prefs.add({
			key: groupMessagesInfo[i].pref, 
			name: messagesInfo[i].P + ((groupMessagesInfo[i].feed)?' feed':''),
			def: {count: true, watch: true, badge: true, audio: true, popup: true}, 
			fields: {
				count: {name: "Watch", validators: [BoolValidator]},
				watch: {name: "Track new", validators: [BoolValidator]},
				badge: {name: "Badge alert", validators: [BoolValidator]},
				audio: {name: "Sound alert", validators: [BoolValidator]},
				popup: {name: "Desktop notification", validators: [BoolValidator]},
			},
			validators: [JSONFieldsValidator]
		});	
		Prefs[groupMessagesInfo[i].pref].feed = groupMessagesInfo[i].feed;
	}
	
	/*Prefs.add({
		key: "fools", 
		name: "Fools!",
		def: false, 
		validators: [BoolValidator]
	});*/
	
	Prefs.add({
		key: "hideRelnotes", 
		name: "Do not show release notes on update",
		def: false, 
		validators: [BoolValidator]
	});
	
	Prefs.add({
		key: "aggregateTooltip", 
		name: "Use aggregated tooltip",
		def: false, 
		validators: [BoolValidator]
	});
	
	Prefs.add({
		key: "useHTTPS", 
		name: "Use HTTPS (use ONLY if dA is URL-blocked)",
		def: false, 
		validators: [BoolValidator]
	});
	
	Prefs.add({
		key: "debug", 
		name: "Show debug controls",
		def: false, 
		validators: [BoolValidator, DebugValidator]
	});
	
	Prefs.add({
		key: "useCapture", 
		name: "Debug: use captured DiFi data",
		def: false, 
		validators: [BoolValidator]
	});
	
	Prefs.add({
		key: "disablePopup", 
		name: "Disable popup interface (click opens Message Center directly)",
		def: false, 
		validators: [BoolValidator, DisableTooltipValidator]
	});
	
	Prefs.add({
		key: "maxItems", 
		name: "Maximum polled items per message class", 
		def: 20,
		validators: [IntValidator]
	});
	
	Prefs.add({
		key: "newlineMagic", 
		name: "Use dirty XP tooltip trick", 
		def: true,
		validators: [BoolValidator]
	});
	
	Prefs.ready = true;
}

Prefs.MT = function (type) {
	return Prefs[messagesInfo[type].pref].get();
}

Prefs.GMT = function (type) {
	return Prefs[groupMessagesInfo[type].pref].get();
}

var DepressedValidator = function(input) { 
	if(input == true) return wrapPassMessage();
	else return wrapWarnMessage("Warning: negative values are depressing!");
}; 

var DisableTooltipValidator = function(input) { 
	if(input == false) return wrapPassMessage();
	else return wrapWarnMessage("Warning: tooltip-only display may be broken!");
};

var DebugValidator = function(input) { 
	if(input == false) return wrapWarnMessage("Warning: very advanced options for testing only!");
	else return wrapWarnMessage("You've been warned! The debug section is all the way down.");
}; 

var PrefMessageEnabler = function(hc) {
	return function(checkmark) {
		for (var cm in hc.fields){
			switch(checkmark.field){
				case "count": return !(hc.feed || false);
				case "watch": return hc["count"].value;
				case "badge": return hc["watch"].value && hc["count"].value;
				case "audio": return hc["watch"].value && hc["count"].value;
				case "popup": return hc["watch"].value && hc["count"].value;
				default: return true;
			}
		}
	}
}
 
 function convertPrefs(){
  localStorage.refreshInterval = (parseInt(localStorage.refreshInterval)) ? JSON.stringify(parseInt(localStorage.refreshInterval)) : JSON.stringify(300000);
  localStorage.timeoutInterval = (parseInt(localStorage.timeoutInterval)) ? JSON.stringify(parseInt(localStorage.timeoutInterval)) : JSON.stringify(10000);
	localStorage.hideZero = (localStorage.showZero) ? JSON.stringify((localStorage.showZero == 'yes')) : JSON.stringify(true);
	localStorage.removeItem('showZero');
	localStorage.playSound = (localStorage.playSound) ? JSON.stringify((localStorage.playSound == 'yes')) : JSON.stringify(true);
	localStorage.rememberState = (localStorage.rememberState) ? JSON.stringify((localStorage.rememberState == 'yes')) : JSON.stringify(true);
	localStorage.prefsVersion = '"6.0"';
 }
 
function initPrefsHTML(){
	if(Prefs.HTMLready) { return;}
	
	HTMLControl_addInputFieldRow({
		pref: Prefs.refreshInterval, 
		size: "30px",
		multiplier: 60000,
		comment: " (minutes, default: 1)",
		parent: document.getElementById('prefs-interval')
	});
	
	HTMLControl_addCheckmarkRow({
		pref: Prefs.playSound,
		images: HTMLControl_checkmarkImages,
		parent: document.getElementById('prefs-alert')
	});
	
	HTMLControl_addCheckmarkRow({
		pref: Prefs.showToast,
		images: HTMLControl_checkmarkImages,
		parent: document.getElementById('prefs-alert')
	});
	
	HTMLControl_addCheckmarkRow({
		pref: Prefs.rememberState,
		images: HTMLControl_checkmarkImages,
		parent: document.getElementById('prefs-advanced')
	});
	
	HTMLControl_addInputFieldRow({
		pref: Prefs.timeoutInterval, 
		size: "30px",
		multiplier: 1000,
		comment: " (seconds, default: 20)",
		parent: document.getElementById('prefs-interval')
	});
	
	HTMLControl_addCheckmarkRow({
		pref: Prefs.hideZero,
		images: HTMLControl_checkmarkImages,
		parent: document.getElementById('prefs-advanced')
	});
	
	HTMLControl_addCheckArrayHeader({
		pref: Prefs.followNotices,
		parent: document.getElementById('prefs-array')
	});
	
	var parity = true;
	for(i in aggregateClasses){ 
		if(aggregateClasses[i].special == "group") continue;
		
		HTMLControl_addCheckArraySpan({
			pref: Prefs.followNotices,
			name: aggregateClasses[i].P,
			parent: document.getElementById('prefs-array')
		});
		
//		document.getElementById('prefs-array').innerHTML += '<tbody id="prefs-array-'+i+'">'
		
		for(j in aggregateClasses[i].types)
			if(messagesInfo[aggregateClasses[i].types[j]].pref) {
				parity = !parity;
				HTMLControl_addCheckArrayRow({
					pref: Prefs[messagesInfo[aggregateClasses[i].types[j]].pref],
					images: HTMLControl_checkmarkImages,
					parent: document.getElementById('prefs-array'),
					//parent: document.getElementById('prefs-array-'+i),
					enabler: PrefMessageEnabler,
					parity: (parity)?"even":"odd"
			});
		}
	}
	
	HTMLControl_addCheckArrayHeader({
		pref: Prefs.followGroupNotices,
		parent: document.getElementById('prefs-group-array')
	});
	
	for(i in groupMessagesInfo)
		if(groupMessagesInfo[i].pref) {
			parity = !parity;
			HTMLControl_addCheckArrayRow({
				pref: Prefs[groupMessagesInfo[i].pref],
				images: HTMLControl_checkmarkImages,
				parent: document.getElementById('prefs-group-array'),
				//parent: document.getElementById('prefs-array-'+i),
				enabler: PrefMessageEnabler,
				parity: (parity)?"even":"odd"
			});
	}
	
	HTMLControl_addCheckmarkRow({
		pref: Prefs.hideRelnotes,
		images: HTMLControl_checkmarkImages,
		//comment: " (will display a warning if unset)",
		parent: document.getElementById('prefs-advanced')
	});
	
	HTMLControl_addCheckmarkRow({
		pref: Prefs.aggregateTooltip,
		images: HTMLControl_checkmarkImages,
		parent: document.getElementById('prefs-tooltip')
	});
	
	HTMLControl_addCheckmarkRow({
		pref: Prefs.useHTTPS,
		images: HTMLControl_checkmarkImages,
		parent: document.getElementById('prefs-advanced')
	});
	
	HTMLControl_addCheckmarkRow({
		pref: Prefs.disablePopup,
		images: HTMLControl_checkmarkImages,
		parent: document.getElementById('prefs-tooltip')
	});
	
	HTMLControl_addCheckmarkRow({
		pref: Prefs.debug,
		images: HTMLControl_checkmarkImages,
		parent: document.getElementById('prefs-advanced')
	});
	
	HTMLControl_addCheckmarkRow({
		pref: Prefs.useCapture,
		images: HTMLControl_checkmarkImages,
		parent: document.getElementById('prefs-debug')
	});
	
	HTMLControl_addCheckmarkRow({
		pref: Prefs.newlineMagic,
		images: HTMLControl_checkmarkImages,
		parent: document.getElementById('prefs-debug')
	});
 
	Prefs.foreach('initHTMLControl');
	Prefs.HTMLready = true;
}
 
function initPrefsHTML_relnotes(){
	if(Prefs.HTMLready) { return;}

	HTMLControl_addCheckmarkImmediateRow({
		pref: Prefs.hideRelnotes,
		images: HTMLControl_checkmarkImages,
		comment: " (you can unset this later in options)",
		parent: document.getElementById('prefs-relnotes')
	});	
	
	Prefs.hideRelnotes.initHTMLControl();
	
	Prefs.HTMLready = true;
}
 
