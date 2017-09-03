/* global messagesInfo, groupMessagesInfo, goToMTUrl, onMessage */

chrome.notifications.onClicked.addListener(DN_RichOnClick);
chrome.notifications.onButtonClicked.addListener(DN_RichOnButtonClick);

/* exported DN_notify */
function DN_notify(data) {
  DN_notificationData = data;

  DN_RichNotify();
}

/* exported DN_clear */
function DN_clear() {
  chrome.notifications.getAll((notifications) => {
    for (let id in notifications) {
      chrome.notifications.clear(id);
    }
  });
}

var DN_notificationData;

function DN_RichNotify() {
  let entries = [];

  for (let type in messagesInfo) {
    if (DN_notificationData[type]) {
      entries.push(DN_TextEntry(type, DN_notificationData));
    }
  }
  if (entries.length) {
    chrome.notifications.clear("dANotifier");

    if (typeof browser !== "undefined") { // Assume Firefox
      chrome.notifications.create("dANotifier", {
        type: "basic",
        title: "New notifications for " + DN_notificationData.username,
        message: entries.join("\n"),
        iconUrl: chrome.runtime.getURL("img/dan_logo2_128_padded.png")
      });
    } else {
      chrome.notifications.create("dANotifier", {
        type: "basic",
        title: "New notifications for " + DN_notificationData.username,
        message: entries.join("\n"),
        priority: 1,
        iconUrl: chrome.runtime.getURL("img/dan_logo2_128_padded.png"),
        buttons: [{title: "Open all"}, {title: "Dismiss as read"}],
        isClickable: true
      });
    }
  }

  let timeout = 0;
  for (let group of DN_notificationData.groups) {
    const id = group.id;

    let has_new = false;
    let entries = [];

    for (let type in groupMessagesInfo) {
      if (group[type]) {
        has_new = true;
        entries.push(DN_TextEntry(type, group, id));
      }
    }

    if (has_new) {
      chrome.notifications.clear("dANotifier-" + id, function() {});

      if (typeof browser !== "undefined") { // Assume Firefox
        timeout += 100;
        setTimeout(FFCreateNotificationWorkaround(id, name, entries), timeout);
      } else {
        chrome.notifications.create("dANotifier-" + id, {
          type: "basic",
          title: "New notifications for #" + group.name,
          message: entries.join("\n"),
          priority: 1,
          iconUrl: chrome.runtime.getURL("img/dan_logo2_128_padded.png"),
          buttons: [{title: "Dismiss as read"}],
          isClickable: true
        });
      }
    }
  }
}

function FFCreateNotificationWorkaround(id, name, entries) {
  return function() {
    chrome.notifications.create("dANotifier-" + id, {
      type: "basic",
      title: "New notifications for #" + name,
      message: entries.join("\n"),
      iconUrl: chrome.runtime.getURL("img/dan_logo2_128_padded.png")
    });
  };
}

function DN_RichOnClick(id) {
  let group;
  if (/dANotifier-(\d+)/.exec(id)) {
    group = /dANotifier-(\d+)/.exec(id)[1];
  }

  goToMTUrl((group || "all"), true, false);
  chrome.notifications.clear(id);
}

function DN_RichOnButtonClick(id, button) {
  let group;
  if (/dANotifier-(\d+)/.exec(id)) {
    group = /dANotifier-(\d+)/.exec(id)[1];
  }

  if (!group) {
    switch (button) {
      case 0:
        for (let type in messagesInfo) {
          if (DN_notificationData[type]) {
            goToMTUrl(messagesInfo[type].UP, true);
          }
        }
        chrome.notifications.clear(id);
        break;
      case 1:
        onMessage({action: "seenInbox"});
        onMessage({action: "clearPopupNew"});
        break;
    }
  } else {
    onMessage({action: "seenInbox"});
    onMessage({action: "clearPopupNew"});
  }
}

function DN_TextEntry(type, data) {
  return data[type].count + " " +
         ((data[type].feed) ? "Feed " : "") +
         ((data[type].count == 1) ? messagesInfo[type].S : messagesInfo[type].P);
}
