/* global messagesInfo */

chrome.runtime.sendMessage({action: "seenInbox"});
chrome.runtime.sendMessage({action: "seenFolder", view: getView()});

function getView() {
  const match = location.hash.match(/view=([\w\d]+)/);
  if (match) {
    return match[1];
  } else {
    return undefined;
  }
}

function detectEclipse() {
  if (document.body.id == "deviantART-v7") {
    return false;
  } else {
    return true;
  }
}

$(document).ready(function() {
  const eclipse = detectEclipse();

  chrome.runtime.sendMessage({action: "detectEclipse", eclipse: eclipse});

  if (eclipse) return;

  chrome.runtime.sendMessage({action: "getMCReminder"}, function(response) {
    const target = document.querySelector(".messages-right");

    // TODO: Migrate to mutations-summary!
    let observer = new window.MutationObserver(
      function(mutations) {
        chrome.runtime.sendMessage({action: "seenFolder", view: getView()});
        if (response) {
          for (let mutation of mutations) {
            if (mutation.addedNodes.length) {
              // Fired when a new '.mczone' is added
              appendCounts(); return;
            }
          }
        }
      }
    );

    observer.observe(target, {childList: true});

    if (response) { appendCounts(); }
  });

  chrome.runtime.sendMessage({action: "getMCHighlight"}, function(response) {
    if (!response) { return; }

    injectColor();
  });
});

function appendCounts() {
  let headers = $(".mczone-title:not(.notifier-appended)");
  headers.each(function(i, hd) {
    function responseHandler(response) {
      if (response && response.count) {
        let span = $("<span>", {
          style: "color: #89A08E;",
          title: "since " + response.ts,
          text: " (" + response.count + ((response.count == 1) ? " item was" : " items were") + " new)"
        });
        $(hd).children("i:first-of-type").after(span);
        $(hd).addClass("notifier-appended");
      }
    }

    if (/%3A/.test(window.location.hash)) { return; } // We're in a stack
    for (let type in messagesInfo) {
      if (hd.textContent.indexOf(messagesInfo[type].P) >= 0 || hd.textContent.indexOf(messagesInfo[type].S) >= 0) {
        if (type == "WA" && hd.textContent.indexOf("Message") >= 0) { continue; }
        if (type == "D"  && hd.textContent.indexOf("Group") >= 0) { continue; }
        chrome.runtime.sendMessage(
          {
            action: "getLastNewCount",
            type: type,
            folder: ((/#view=(\d+)/.test(window.location.hash)) ? /#view=(\d+)/.exec(window.location.hash)[1] : undefined)
          },
          responseHandler
        );
      }
    }
  });
}

function injectColor() {
  injectScript("js/lib/mutation-summary.js", function() {
    injectScript("js/colorize.js");
  });
}

function injectScript(src, callback) {
  let s = document.createElement("script");
  s.src = chrome.runtime.getURL(src);
  s.onload = function() {
    this.parentNode.removeChild(this);
  };
  if (callback) { s.addEventListener("load", callback); }
  (document.head || document.documentElement).appendChild(s);
}
