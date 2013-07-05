chrome.extension.sendMessage({'action' : 'seenInbox'});

$(document).ready( function() {
	appendCounts();
	
	var target = document.querySelector('.messages-right');
	
	var observer = new window.WebKitMutationObserver(
	  function(mutations) {
	    for(var i in mutations){
	    	for(var j=0; j<mutations[i].addedNodes.length; j++){
	    		// Fired when a new '.mczone' is added
	    		appendCounts(); return;
	    	}	
	    }
	  }
	);
	
	observer.observe(target, {childList : true});
});

var re = /#view=(\d+)/;

function appendCounts(){
	var headers = $(".mczone-title:not(.notifier-appended)");
	headers.each( function (i, hd){
		if(/%3A/.test(window.location.hash)) { return; } // We're in a stack
		for(var j in messagesInfo){
			if(hd.textContent.indexOf(messagesInfo[j].P) >= 0 || hd.textContent.indexOf(messagesInfo[j].S) >= 0) {
				if(j == "WA" && hd.textContent.indexOf("Message") >= 0) { continue; }
				chrome.extension.sendMessage({
						'action' : 'getLastNewCount', 
						'type' : j, 
						'folder' : ( (re.test(window.location.hash)) ? re.exec(window.location.hash)[1] : undefined )
					}, function(response){
					if(response && response.count){
						var span = $("<span>", {
							style	: 'color: #aa0000;',
							text	: " (" + response.count + " new items since " + response.ts + ")"
						});
						$(hd).append(span);
						$(hd).addClass("notifier-appended");						
					}					
				});
			}
		}
	});
}

/*$(document).ready( function() {
	var headers = $(".mczone-title");
	for(var hd in headers) {
		
	}
	headers.append(" (Ololo!)");
});*/