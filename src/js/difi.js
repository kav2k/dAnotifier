/* global Prefs, handleError, loggedOut:true, DN_notify, COLOR_DEBUG, COLOR_ACTIVE, COLOR_INACTIVE */
/* global getMessagesUrl, traceRegexp, getTimestamp, getExtTimestamp, prepText, playSound */
/* global messagesInfo, groupMessagesInfo, aggregateClasses */
/* exported loggedOut */

var DiFi = {
  inboxID: "",
  folders: {},
  folderInfo: {},
  deviantInfo: {},

  types: Object.keys(messagesInfo),
  groupTypes: Object.keys(groupMessagesInfo).filter(key => !groupMessagesInfo[key].feed),
  groupFeedTypes: Object.keys(groupMessagesInfo).filter(key => groupMessagesInfo[key].feed),

  maxItems: 20,

  foldersToCount: [],

  totalCount: 0,
  totalNewCount: 0,
  totalNewCountApprox: false,

  lastTotalCount: 0,
  lastNewCounts: {},

  timestamp: 0,
  alertTimestamp: 0,
  highestTimestamp: 0,

  hasNew: false,
  mustAlert: false,
  mustPopup: false,

  skipUpdate: false,
  skipGuard: 0,

  capture: {},
  capturing: false,
  mustCapture: false
};

DiFi.baseURL = function() {
  return "https://www.deviantart.com/global/difi.php";
};

DiFi.JSONrequest = function(request, id, callback) {
  if (Prefs.useCapture.get()) {
    if (localStorage.captureData) {
      const capture = JSON.parse(localStorage.captureData);
      if (capture.folderData[id]) {
        callback(id, capture.folderData[id]);
        return;
      }
    }
    console.warn("No capture data for id=" + id);
  }

  let xhr = new XMLHttpRequest();

  xhr.responseType = "json";

  xhr.timeout = Prefs.timeoutInterval.get();
  xhr.ontimeout = function() {
    handleError({type: "TIMEOUT"});
  };

  xhr.onload = function() {
    try {
      loggedOut = false;
      let result;

      if (xhr.response) {
        result = xhr.response;

        if (result.DiFi.status == "FAIL" && result.DiFi.response.error == "500 Server Error") {
          console.log("DEBUG: Outer hiccup");
          handleError({type: "SERVER_ERROR"});
          return;
        }

        if (
          result.DiFi.response &&
          result.DiFi.response.calls[0].response.content.error &&
          result.DiFi.response.calls[0].response.content.error.code == "ERR_DIFI_ACCESS_DENIED"
        ) {
          handleError({type: "LOGGED_OUT"});
          loggedOut = true;
          return;
        }

        for (let call of result.DiFi.response.calls) {
          if (
            call.response.status == "FAIL" &&
            call.response.content.error == "500 Server Error"
          ) {
            console.log("DEBUG: Inner hiccup");
            handleError({type: "SERVER_ERROR"});
            return;
          }
        }
      } else {
        throw 'No data';
      }

      if (DiFi.capturing) { DiFi.capture.folderData[id] = result; }
      callback(id, result);
    } catch (e) {
      handleError({type: "PARSE_ERROR", raw: e.stack.replace(traceRegexp, "")});
      console.log(e.stack);
    }
  };

  xhr.open("GET", DiFi.baseURL() + request, true);

  // Paranoid?
  xhr.setRequestHeader("Cache-Control", "no-cache");
  xhr.setRequestHeader("Pragma", "no-cache");

  xhr.send(null);
};

DiFi.getInboxID = function(id, result) {
  try {
    if (result.DiFi.status != "SUCCESS") { throw Error("DiFi: folder request failed"); }

    let found = false;
    DiFi.folders = {};

    for (let folder of result.DiFi.response.calls[0].response.content) {
      if (folder.is_inbox) {
        DiFi.inboxID = folder.folderid;
        found = true;
        DiFi.folders[folder.folderid] = {type: "inbox", name: "?"};
      } else {
        DiFi.folders[folder.folderid] = {type: "?", name: folder.title};
      }
    }

    if (!found) { throw Error("DiFi: inbox ID missing"); }

    DiFi.getFolderInfo(false);
  } catch (e) {
    handleError({type: "INTERNAL_ERROR", raw: e.stack.replace(traceRegexp, "")});
    console.log(e.stack);
    return false;
  }
};

// --------------------------------------------------------------

DiFi.getFolderInfo = function(giveUp) {
  DiFi.foldersToCount = [];

  try {
    if (Prefs.useCapture.get()) {
      if (localStorage.captureData) {
        const capture = JSON.parse(localStorage.captureData);
        DiFi.folderInfo = capture.folderInfo;
      } else {
        console.warn("No capture folderInfo data");
      }
    }

    for (let id in DiFi.folders) {
      if (!DiFi.folderInfo[id]) {
        if (!giveUp) {
          DiFi.folderInfoRequest();
          return;
        } else {
          throw Error("dAMC: folderInfo can't be retrieved (" + id + ")");
        }
      } else {
        Object.assign(DiFi.folders[id], DiFi.folderInfo[id]);
      }
      DiFi.foldersToCount.push(id);
    }

    if (DiFi.capturing) {
      DiFi.capture.folderInfo = DiFi.folderInfo;
      DiFi.capture.inboxID = DiFi.inboxID;
    }

    DiFi.countBegin();
  } catch (e) {
    handleError({type: "INTERNAL_ERROR", raw: e.stack.replace(traceRegexp, "")});
    console.log(e.stack);
    return false;
  }
};

// --------------------------------------------------------------

DiFi.requestSuffix = function(type, start, max) {
  switch (type) {
    case "C" : return ",oq:fb_comments:" + start + ":" + max + ":f&";
    case "R" : return ",oq:fb_replies:" + start + ":" + max + ":f&";
    case "UN": return ",oq:notes_unread:" + start + ":" + max + ":f&";
    case "N" : return ",oq:notices:" + start + ":" + max + ":f&";
    case "CA": return ",oq:contests:" + start + ":" + max + ":f&";
    case "A" : return ",oq:fb_activity:" + start + ":" + max + ":f&";
    case "CN": return ",oq:fb_critiques:" + start + ":" + max + ":f&";
    case "CO": return ",oq:correspondence:" + start + ":" + max + ":f&";
    case "D" : return ",oq:devwatch:" + start + ":" + max + ":f:tg=deviations&";
    case "GD": return ",oq:devwatch:" + start + ":" + max + ":f:tg=groupdeviations&";
    case "J" : return ",oq:devwatch:" + start + ":" + max + ":f:tg=journals&";
    case "WC": return ",oq:devwatch:" + start + ":" + max + ":f:tg=critiques&";
    case "P" : return ",oq:devwatch:" + start + ":" + max + ":f:tg=polls&";
    case "B" : return ",oq:bulletins:" + start + ":" + max + ":f&";
    case "F" : return ",oq:devwatch:" + start + ":" + max + ":f:tg=forums&";
    case "SU" : return ",oq:devwatch:" + start + ":" + max + ":f:tg=status&";
    case "WA": return ",oq:devwatch:" + start + ":" + max + ":f:tg=activities&";
    case "M" : return ",oq:fb_mentions:" + start + ":" + max + ":f&";
  }
};

DiFi.countBegin = function() {
  DiFi.totalCount = 0;
  DiFi.totalNewCount = 0;

  DiFi.hasNew = false;
  DiFi.mustAlert = false;
  DiFi.mustPopup = false;

  DiFi.countNext();
};

DiFi.countNext = function() {
  function zeroObject() {
    let obj = {};
    for (let type of DiFi.types) {
      obj[type] = 0;
    }
    return obj;
  }

  if (DiFi.foldersToCount.length) {
    const id = DiFi.foldersToCount.shift();
    DiFi.folders[id].counts = zeroObject();
    DiFi.folders[id].newCounts = zeroObject();
    DiFi.folders[id].highestTimestamps = zeroObject();
    switch (DiFi.folders[id].type) {
      case "inbox":
        DiFi.JSONrequest(DiFi.allMessagesRequest(id), id, DiFi.countMessages);
        return;
      case "group":
        DiFi.JSONrequest(DiFi.groupMessagesRequest(id), id, DiFi.countGroupMessages);
        return;
      default:
        DiFi.countNext();
    }
  } else {
    DiFi.countEnd();
  }
};

DiFi.countEnd = function() {
  DiFi.timestamp = DiFi.timestamp || epochTS(); // 1st time it's skipped, next time works normally
  DiFi.alertTimestamp = DiFi.highestTimestamp || epochTS(); // Only alert once

  DiFi.lastTotalCount = DiFi.totalCount;

  if (DiFi.totalNewCount) {
    DiFi.lastNewCounts = {};
    DiFi.lastNewCounts.ts = getExtTimestamp(DiFi.timestamp);
    DiFi.lastNewCounts.folders = {};
    for (let id in DiFi.folders) {
      DiFi.lastNewCounts.folders[id] = Object.assign({}, DiFi.folders[id].newCounts);
    }
  }

  DiFi.fillAggregation();

  if (Prefs.rememberState.get()) {
    localStorage.lastState_lastTotalCount = DiFi.lastTotalCount;
    localStorage.lastState_timestamp = DiFi.timestamp;
    localStorage.lastState_alertTimestamp = DiFi.alertTimestamp;
    localStorage.lastState_lastTotalNewCount = DiFi.totalNewCount;
    localStorage.lastState_lastTotalNewCountApprox = DiFi.totalNewCountApprox;
  }

  DiFi.updateTooltip();
};

DiFi.getLastNewCount = function(request) {
  const folder = request.folder || DiFi.inboxID || undefined;
  if (folder) {
    if (DiFi.lastNewCounts.folders[folder][request.type]) {
      let boundedCount;
      if (DiFi.lastNewCounts.folders[folder][request.type] == DiFi.maxItems) {
        boundedCount = DiFi.maxItems + "+";
      } else {
        boundedCount = DiFi.lastNewCounts.folders[folder][request.type];
      }
      return {
        count: boundedCount,
        ts: DiFi.lastNewCounts.ts
      };
    } else { return {error: true}; }
  } else { return {error: true}; }
};

DiFi.allMessagesRequest = function(folderID) {
  let queryStr = "?";
  for (let type of DiFi.types) /*if(Prefs.MT(DiFi.types[type]).count)*/ {
    queryStr += "c[]=MessageCenter;get_views;" + folderID + DiFi.requestSuffix(type, 0, DiFi.maxItems);
  }
  queryStr += "t=json";
  return queryStr;
};

DiFi.groupMessagesRequest = function(folderID) {
  let queryStr = "?";
  for (let type of DiFi.groupTypes) /*if(Prefs.MT(DiFi.groupTypes[type]).count)*/ {
    queryStr += "c[]=MessageCenter;get_views;" + folderID + DiFi.requestSuffix(type, 0, DiFi.maxItems);
  }
  for (let type of DiFi.groupFeedTypes) /*if(Prefs.MT(DiFi.groupTypes[type]).count)*/ {
    queryStr += "c[]=MessageCenter;get_views;" + folderID + DiFi.requestSuffix(type, 0, DiFi.maxItems);
  }
  queryStr += "t=json";
  return queryStr;
};

DiFi.countMessages = function(id, result) {
  try {
    if (result.DiFi.status != "SUCCESS") { throw Error("DiFi: message request failed"); }

    DiFi.types.forEach((type, index) => {
      if (Prefs.MT(type).count) {
        DiFi.totalCount += parseInt(DiFi.folders[id].counts[type] = result.DiFi.response.calls[index].response.content[0].result.matches);
      }
    });

    if (DiFi.timestamp) { // gotta count new messages
      DiFi.types.forEach((type, index) => {
        if (Prefs.MT(type).count && Prefs.MT(type).watch) {
          DiFi.parseNew(id, type, result.DiFi.response.calls[index].response.content[0].result);
        }
      });
    }

    DiFi.countNext();
  } catch (e) {
    handleError({type: "INTERNAL_ERROR", raw: e.stack.replace(traceRegexp, "")});
    console.log(e.stack);
    return false;
  }
};

function epochTS() {
  return Math.round(new Date().getTime() / 1000.0);
}

DiFi.compareWho = function(who, username) {
  const match = who.match(/.*<a.*>(.+)<\/a>/);
  if (match) {
    return (match[1] == username);
  } else {
    return false;
  }
};

DiFi.parseNew = function(id, type, result, group) { // Assumes (DiFi.alertTimestamp >= DiFi.timestamp)
  DiFi.folders[id].newCounts[type] = 0;

  const pref = (group) ? Prefs.GMT : Prefs.MT;

  for (let i = 0; i < result.count; i++) {
    DiFi.highestTimestamp = (result.hits[i].ts > DiFi.highestTimestamp) ? result.hits[i].ts : DiFi.highestTimestamp;
    DiFi.folders[id].highestTimestamps[type] =
      (result.hits[i].ts > DiFi.folders[id].highestTimestamps[type]) ? result.hits[i].ts : DiFi.folders[id].highestTimestamps[type];
    if (result.hits[i].ts <= DiFi.timestamp) { break; }

    if (result.hits[i].who && DiFi.compareWho(result.hits[i].who, DiFi.folders[DiFi.inboxID].name.substring(1))) { continue; }
    if (result.hits[i].app && result.hits[i].app == "Promoted" && !Prefs.notifyPromoted.get()) { continue; }

    DiFi.folders[id].newCounts[type]++;
    DiFi.totalNewCount++;
    if (pref(type).badge) { DiFi.hasNew = true; }
    if (result.hits[i].ts > DiFi.alertTimestamp && pref(type).audio) { DiFi.mustAlert = true; }
    if (result.hits[i].ts > DiFi.alertTimestamp && pref(type).popup) { DiFi.mustPopup = true; }
  }
};

DiFi.countGroupMessages = function(id, result) {
  try {
    if (result.DiFi.status != "SUCCESS") { throw Error("DiFi: message request failed"); }

    DiFi.groupTypes.forEach((type, index) => {
      if (Prefs.GMT(type).count) {
        DiFi.totalCount += parseInt(
          DiFi.folders[id].counts[type] = result.DiFi.response.calls[index].response.content[0].result.matches
        );
      }
    });

    if (DiFi.timestamp) { // gotta count new messages
      DiFi.groupTypes.forEach((type, index) => {
        if (Prefs.GMT(type).count && Prefs.GMT(type).watch) {
          DiFi.parseNew(id, type, result.DiFi.response.calls[index].response.content[0].result, true);
        }
      });
      DiFi.groupFeedTypes.forEach((type, index) => {
        if (Prefs.GMT(type).count && Prefs.GMT(type).watch) {
          DiFi.parseNew(id, type, result.DiFi.response.calls[DiFi.groupTypes.length + index].response.content[0].result, true);
        }
      });
    }

    DiFi.countNext();
  } catch (e) {
    handleError({type: "INTERNAL_ERROR", raw: e.stack.replace(traceRegexp, "")});
    console.log(e.stack);
    return false;
  }
};

DiFi.updateTooltip = function() {
  let title;

  switch (Prefs.tooltipMode.get()) {
    case "full":
      title = DiFi.tooltipFull();
      break;
    case "aggregated":
      title = DiFi.tooltipAggregate();
      break;
    case "brief":
      title = DiFi.tooltipBrief();
      break;
  }

  chrome.browserAction.setTitle({title: title});

  DiFi.updatePopup();
};

DiFi.tooltipLine = function(type, count, newCount, feed) {
  let line;
  if (feed) {
    line = newCount + ((newCount == DiFi.maxItems) ? "+" : "") + " new ";
    line += ((newCount == 1) ? messagesInfo[type].S : messagesInfo[type].P) + " (Feed)";
  } else {
    line = count + " " + ((count == 1) ? messagesInfo[type].S : messagesInfo[type].P);
    if (newCount) {
      line += " (" + newCount + ((newCount == DiFi.maxItems) ? "+" : "") + " new)";
    }
  }
  return line;
};

DiFi.tooltipBrief = function() {
  const title = "Last updated: " + getTimestamp() + " for " + DiFi.folders[DiFi.inboxID].name;
  let message_text = "";
  let newline = true;

  for (let type in messagesInfo) {
    if (DiFi.folders[DiFi.inboxID].newCounts[type] > 0) {
      message_text +=
        ((newline) ? "\n" : " ") +
        DiFi.folders[DiFi.inboxID].newCounts[type] +
        ((DiFi.folders[DiFi.inboxID].newCounts[type] == DiFi.maxItems) ? "+" : "") +
        messagesInfo[type].A;
      newline = false;
    }
  }

  for (let id in DiFi.folders) {
    if (DiFi.folders[id].type == "group") {
      let has_messages = false;
      for (let type in groupMessagesInfo) {
        if (DiFi.folders[id].newCounts[type]) { has_messages = true; }
      }
      if (!has_messages) { continue; }

      message_text += "\n#" + DiFi.folders[id].name + ":";

      for (let type in groupMessagesInfo) {
        if (DiFi.folders[id].newCounts[type] > 0) {
          message_text += " " +
            DiFi.folders[id].newCounts[type] +
            ((DiFi.folders[id].newCounts[type] == DiFi.maxItems) ? "+" : "") +
            messagesInfo[type].A;
        }
      }
    }
  }

  if (!message_text) { message_text = "\nNo new notifications"; }

  message_text = title + message_text;

  return prepText(message_text);
};

DiFi.tooltipFull = function() {
  const title = "Last updated: " + getTimestamp() + " for " + DiFi.folders[DiFi.inboxID].name;
  let message_text = "";

  for (let type in messagesInfo) {
    if (DiFi.folders[DiFi.inboxID].counts[type] > 0) {
      message_text += "\n> " + DiFi.tooltipLine(type, DiFi.folders[DiFi.inboxID].counts[type], DiFi.folders[DiFi.inboxID].newCounts[type], false);
    }
  }

  for (let id in DiFi.folders) {
    if (DiFi.folders[id].type == "group") {
      let has_messages = false;
      for (let type in groupMessagesInfo) {
        if (DiFi.folders[id].counts[type] > 0 || DiFi.folders[id].newCounts[type]) { has_messages = true; }
      }
      if (!has_messages) { continue; }

      message_text += "\n#" + DiFi.folders[id].name + ":";

      for (let type in groupMessagesInfo) {
        if (DiFi.folders[id].counts[type] > 0) {
          message_text += "\n> " + DiFi.tooltipLine(type, DiFi.folders[id].counts[type], DiFi.folders[id].newCounts[type], false);
        } else if (DiFi.folders[id].counts[type] === 0 && DiFi.folders[id].newCounts[type] > 0) { // Feed
          message_text += "\n> " + DiFi.tooltipLine(type, DiFi.folders[id].counts[type], DiFi.folders[id].newCounts[type], true);
        }
      }
    }
  }

  if (!message_text) { message_text = "\n No Notifications"; }

  message_text = title + message_text;

  return prepText(message_text);
};

DiFi.fillAggregation = function() {
  for (let aClass of aggregateClasses) {
    if (aClass.special && aClass.special == "group") {
      for (let id in DiFi.folders) {
        if (DiFi.folders[id].type == "group") {
          aClass.groups[id] = {count: 0, newCount: 0, newCountApprox: false};
          for (let type of aClass.types) {
            aClass.groups[id].count += parseInt(DiFi.folders[id].counts[type]);
            aClass.groups[id].newCount += parseInt(DiFi.folders[id].newCounts[type]);
            if (DiFi.folders[id].newCounts[type] == DiFi.maxItems) { aClass.groups[id].newCountApprox = true; }
          }
        }
      }
    } else {
      aClass.count = 0;
      aClass.newCount = 0;
      aClass.newCountApprox = false;
      for (let type of aClass.types) {
        aClass.count += parseInt(DiFi.folders[DiFi.inboxID].counts[type]);
        aClass.newCount += parseInt(DiFi.folders[DiFi.inboxID].newCounts[type]);
        if (DiFi.folders[DiFi.inboxID].newCounts[type] == DiFi.maxItems) { aClass.newCountApprox = true; }
      }
    }
  }

  let totalApprox = false;
  for (let aClass of aggregateClasses) { totalApprox = totalApprox || aClass.newCountApprox; }
  DiFi.totalNewCountApprox = totalApprox;
};

DiFi.tooltipAggregateLine = function(type, newCount, feed) {
  if (feed) {
    return newCount +
           ((newCount == DiFi.maxItems) ? "+" : "") +
           " new " +
           ((newCount == 1) ? messagesInfo[type].S : messagesInfo[type].P) +
           " (Feed)";
  } else {
    return newCount +
           ((newCount == DiFi.maxItems) ? "+" : "") +
           " new " +
           ((newCount == 1) ? messagesInfo[type].S : messagesInfo[type].P);
  }
};

DiFi.tooltipAggregate = function() {
  const title = "Last updated: " + getTimestamp() + " for " + DiFi.folders[DiFi.inboxID].name;
  let message_text = "";

  for (let aClass of aggregateClasses) {
    if (aClass.special && aClass.special == "group") {
      for (let id in DiFi.folders) {
        if (DiFi.folders[id].type == "group" && aClass.groups[id].count + aClass.groups[id].newCount > 0) {
          message_text += "\n\n" + "#" + DiFi.folders[id].name + ": ";
          message_text += aClass.groups[id].count + " " +
                          ((aClass.groups[id].count == 1) ? aClass.S : aClass.P);
          if (aClass.groups[id].newCount) {
            message_text += " (" +
                            aClass.groups[id].newCount +
                            ((aClass.groups[id].newCountApprox) ? "+" : "") +
                            " new)";
            for (let type of aClass.types) {
              if (DiFi.folders[id].newCounts[type]) {
                message_text += "\n> " +
                  DiFi.tooltipAggregateLine(
                    type,
                    DiFi.folders[id].newCounts[type],
                    (DiFi.folders[id].counts[type] === 0)
                  );
              }
            }
          }
        }
      }
    } else if (aClass.count + aClass.newCount > 0) {
      if (aClass.special && aClass.special == "singleton") {
        message_text += "\n\n";
        message_text += aClass.count + " " + ((aClass.count == 1) ? aClass.S : aClass.P);
        if (aClass.newCount) {
          message_text += " (" + aClass.newCount + ((aClass.newCountApprox) ? "+" : "") + " new)";
        }
      } else {
        message_text += "\n\n";
        message_text += aClass.count + " " + ((aClass.count == 1) ? aClass.S : aClass.P);
        if (aClass.newCount) {
          message_text += " (" + aClass.newCount + ((aClass.newCountApprox) ? "+" : "") + " new)";
          for (let type of aClass.types) {
            if (DiFi.folders[DiFi.inboxID].newCounts[type]) {
              message_text += "\n> " +
                DiFi.tooltipAggregateLine(type, DiFi.folders[DiFi.inboxID].newCounts[type], false);
            }
          }
        }
      }
    }
  }

  if (!message_text) { message_text = "\n No Notifications"; }

  message_text += title + message_text;

  return prepText(message_text);
};

// ----------------------------------------------------

var popupData = {state: "init"};

DiFi.updatePopup = function() {
  popupData.state = "done";
  popupData.refreshing = false;
  delete popupData.error;
  popupData.skipNew = false;

  popupData.lastUpdateAt = getTimestamp();

  popupData.folderInfo = Object.assign({}, DiFi.folderInfo);
  popupData.folders = Object.assign({}, DiFi.folders);

  popupData.aggregateClasses = aggregateClasses.slice();

  popupData.totalCount = DiFi.totalCount;
  popupData.totalNewCount = DiFi.totalNewCount;
  popupData.totalNewCountApprox = DiFi.totalNewCountApprox;

  popupData.inboxID = DiFi.inboxID;

  chrome.runtime.sendMessage({action: "updatePopup", data: popupData});
  DiFi.updateBadge();
};

DiFi.clearPopupNew = function() {
  popupData.totalNewCount = 0;
  popupData.skipNew = true;
};

// ----------------------------------------------------

DiFi.updateBadge = function() {
  chrome.browserAction.setIcon({path: "img/dan_logo2_19_crisp.png"});
  let badgeText = "";

  switch (Prefs.badgeMode.get()) {
    case "all":
      if (DiFi.totalCount) {
        badgeText = DiFi.totalCount + "";
      } else if (DiFi.totalNewCount) {
        badgeText = DiFi.totalNewCount + "f"; // Feed messages ONLY
      } else {
        badgeText = "";
      }

      if (DiFi.hasNew) {
        chrome.browserAction.setBadgeBackgroundColor(COLOR_DEBUG);
      } else {
        chrome.browserAction.setBadgeBackgroundColor(COLOR_ACTIVE);
      }

      break;

    case "newOnly":

      if (DiFi.totalNewCount) {
        chrome.browserAction.setBadgeBackgroundColor(COLOR_DEBUG);
        badgeText = DiFi.totalNewCount + ((DiFi.totalNewCountApprox) ? "+" : "");
      } else {
        chrome.browserAction.setBadgeBackgroundColor(COLOR_ACTIVE);
        badgeText = "";
      }

      break;
  }

  chrome.browserAction.setBadgeText({text: prepText(badgeText)});

  if (DiFi.mustAlert) { playSound(); }
  if (DiFi.mustPopup && Prefs.showToast.get()) { DiFi.showDesktopNotification(); }

  DiFi.skipUpdate = false;

  if (DiFi.capturing) {
    DiFi.mustCapture = false;
    DiFi.capture.timestamp = DiFi.highestTimestamp || epochTS();
    localStorage.captureData = JSON.stringify(DiFi.capture);
  }
};

DiFi.showDesktopNotification = function() {
  let data = {
    username: DiFi.folders[DiFi.inboxID].name
  };
  let dispatch = false;

  for (let type in messagesInfo) {
    if (Prefs.MT(type).popup && (DiFi.folders[DiFi.inboxID].newCounts[type] > 0)) {
      data[type] = {
        count: (
          DiFi.folders[DiFi.inboxID].newCounts[type] +
          ((DiFi.folders[DiFi.inboxID].newCounts[type] == DiFi.maxItems) ? "+" : "")
        ),
        ts: DiFi.folders[DiFi.inboxID].highestTimestamps[type],
        feed: false
      };
      dispatch = true;
    }
  }

  data.groups = [];
  for (let id in DiFi.folders) {
    if (DiFi.folderInfo[id].type != "group") { continue; }

    let group = {
      id: id,
      name: DiFi.folderInfo[id].name
    };

    for (let type in groupMessagesInfo) {
      if (Prefs.GMT(type).popup && (DiFi.folders[id].newCounts[type] > 0)) {
        group[type] = {
          count: (
            DiFi.folders[id].newCounts[type] +
            ((DiFi.folders[id].newCounts[type] == DiFi.maxItems) ? "+" : "")
          ),
          ts: DiFi.folders[id].highestTimestamps[type],
          feed: (DiFi.folders[id].counts[type] === 0 && DiFi.folders[id].newCounts[type] > 0)
        };
        dispatch = true;
      }
    }

    data.groups.push(group);
  }

  if (dispatch) { DN_notify(data); }
};

DiFi.seenInbox = function() { // Assume user have seen inbox
  DiFi.timestamp = DiFi.highestTimestamp || epochTS();
  if (Prefs.rememberState.get()) { localStorage.lastState_timestamp = DiFi.timestamp; }
  chrome.browserAction.setBadgeBackgroundColor(COLOR_INACTIVE);
};

DiFi.doEverything = function() {
  if (DiFi.skipUpdate && DiFi.skipGuard < 5) {
    console.log("Request skipped at " + getTimestamp());
    DiFi.skipGuard++;
    return;
  }

  DiFi.skipUpdate = true;
  DiFi.skipGuard = 0;
  popupData.refreshing = true;

  DiFi.capturing = DiFi.mustCapture;
  if (DiFi.capturing) { DiFi.capture.folderData = {}; }

  chrome.runtime.sendMessage({action: "updatePopup", data: popupData});

  DiFi.JSONrequest("?c[]=MessageCenter;get_folders&t=json", 0, DiFi.getInboxID);
};

//--------------------------------------------------------------------------------------------------

// Workaround for limitations of known DiFi methods
DiFi.folderInfoRequest = function() {
  let xhr = new XMLHttpRequest();

  xhr.timeout = Prefs.timeoutInterval.get();
  xhr.ontimeout = function() {
    handleError({type: "TIMEOUT"});
  };

  xhr.onload = function() {
    loggedOut = false;

    let username;

    try {
      if (/deviantART.deviant\s*=\s*({.*?})/.test(xhr.responseText)) { // Found deviant's info block
        DiFi.deviantInfo = JSON.parse((/deviantART.deviant\s*=\s*({.*?})/.exec(xhr.responseText))[1]);
        if (!DiFi.deviantInfo.username) {
          username = "???";
          console.error("dAMC: Unable to resolve username; failing gracefully");
        }
        username = DiFi.deviantInfo.symbol + DiFi.deviantInfo.username;
      } else {
        username = "???";
        console.error("dAMC: Unable to resolve username; failing gracefully");
      }

      DiFi.folderInfo = {};

      console.log("Username: '" + username + "'");
      DiFi.folderInfo[DiFi.inboxID] = {name: username, type: "inbox"};

      for (let id in DiFi.folders) {
        if (DiFi.folders[id].type != "inbox") {
          if (
            ((new RegExp('mcdata="\\{(.*?' + id + '.*?)\\}"', "g")).exec(xhr.responseText)) &&
            /is_group&quot;:true/.test(((new RegExp('mcdata="\\{(.*?' + id + '.*?)\\}"', "g")).exec(xhr.responseText))[0])
          ) {
            console.log("Folder: " + id + ", is a group");
            DiFi.folderInfo[id] = {name: DiFi.folders[id].name, type: "group"};
          } else {
            console.log("Folder: " + id + ", is not a group");
            DiFi.folderInfo[id] = {name: DiFi.folders[id].name, type: "folder"};
          }
        }
      }

      DiFi.getFolderInfo(true);
    } catch (e) {
      handleError({type: "PARSE_ERROR", raw: e.stack.replace(traceRegexp, "")});
      console.log(e.stack);
    }
  };

  xhr.open("GET", getMessagesUrl(), true);

  // Paranoid?
  xhr.setRequestHeader("Cache-Control", "no-cache");
  xhr.setRequestHeader("Pragma", "no-cache");

  xhr.send(null);
};
