/* global Prefs, handleError, loggedOut:true, DN_notify, COLOR_DEBUG, COLOR_ACTIVE, COLOR_INACTIVE */
/* global getMessagesUrl, traceRegexp, getTimestamp, getExtTimestamp, prepText, playSound */
/* global messagesInfo, groupMessagesInfo, aggregateClasses */
/* exported loggedOut */
function DiFi_baseURL() {
  return "https://www.deviantart.com/global/difi.php";
}

function DiFi_JSONrequest(request, id, callback) {

  if (Prefs.useCapture.get()) {
    if (localStorage.captureData) {
      var capture = JSON.parse(localStorage.captureData);
      if (capture.folderData[id]) {
        callback(id, capture.folderData[id]);
        return;
      }
    }
    console.warn("No capture data for id=" + id);
  }

  var xhr = new XMLHttpRequest();

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

        for (var call of result.DiFi.response.calls) {
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

      if (DiFi_capturing) { DiFi_capture.folderData[id] = result; }
      callback(id, result);
    } catch (e) {
      handleError({type: "PARSE_ERROR", raw: e.stack.replace(traceRegexp, "")});
      console.log(e.stack);
    }
  };

  xhr.open("GET", DiFi_baseURL() + request, true);

  // Paranoid?
  xhr.setRequestHeader("Cache-Control", "no-cache");
  xhr.setRequestHeader("Pragma", "no-cache");

  xhr.send(null);
}

var DiFi_inboxID;
var DiFi_folders;
var DiFi_folderInfo = {};

function DiFi_getInboxID(id, result) {
  try {
    if (result.DiFi.status != "SUCCESS") { throw Error("DiFi: folder request failed"); }

    var found = false;
    DiFi_folders = {};

    for (var folder of result.DiFi.response.calls[0].response.content) {
      if (folder.is_inbox) {
        DiFi_inboxID = folder.folderid;
        found = true;
        DiFi_folders[folder.folderid] = {type: "inbox", name: "?"};
      } else {
        DiFi_folders[folder.folderid] = {type: "?", name: folder.title};
      }
    }

    if (!found) { throw Error("DiFi: inbox ID missing"); }

    getFolderInfo(false);
  } catch (e) {
    handleError({type: "INTERNAL_ERROR", raw: e.stack.replace(traceRegexp, "")});
    console.log(e.stack);
    return false;
  }
}

// --------------------------------------------------------------

var DiFi_foldersToCount;

function getFolderInfo(giveUp) {
  DiFi_foldersToCount = [];

  try {
    if (Prefs.useCapture.get()) {
      if (localStorage.captureData) {
        var capture = JSON.parse(localStorage.captureData);
        DiFi_folderInfo = capture.folderInfo;
      } else {
        console.warn("No capture folderInfo data");
      }
    }

    for (var i in DiFi_folders) {
      if (!DiFi_folderInfo[i]) {
        if (!giveUp) {
          dAMC_folderInfoRequest();
          return;
        } else {
          throw Error("dAMC: folderInfo can't be retrieved (" + i + ")");
        }
      } else {
        for (var j in DiFi_folderInfo[i]) {
          DiFi_folders[i][j] = DiFi_folderInfo[i][j];
        }
      }
      DiFi_foldersToCount.push(i);
    }

    if (DiFi_capturing) {
      DiFi_capture.folderInfo = DiFi_folderInfo;
      DiFi_capture.inboxID = DiFi_inboxID;
    }

    DiFi_countBegin();
  } catch (e) {
    handleError({type: "INTERNAL_ERROR", raw: e.stack.replace(traceRegexp, "")});
    console.log(e.stack);
    return false;
  }
}

// --------------------------------------------------------------

var DiFi_types = Object.keys(messagesInfo);
var DiFi_groupTypes = Object.keys(groupMessagesInfo).filter(key => !groupMessagesInfo[key].feed);
var DiFi_groupFeedTypes = Object.keys(groupMessagesInfo).filter(key => groupMessagesInfo[key].feed);

function DiFi_requestSuffix(type, start, max) {
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
}

var DiFi_maxItems = 20;

var DiFi_totalCount = 0;
var DiFi_totalNewCount = 0;
var DiFi_lastTotalCount = 0;
var DiFi_totalNewCountApprox = false;
var DiFi_hasNew = false;
var DiFi_mustAlert = false;
var DiFi_mustPopup = false;

var DiFi_timestamp = 0;
var DiFi_alertTimestamp = 0;

var DiFi_highestTimestamp = 0;

function DiFi_countBegin() {
  DiFi_totalCount = 0;
  DiFi_totalNewCount = 0;

  DiFi_hasNew = false;
  DiFi_mustAlert = false;
  DiFi_mustPopup = false;

  DiFi_countNext();
}

function DiFi_countNext() {
  function zeroObject() {
    var obj = {};
    for (var key of DiFi_types) {
      obj[key] = 0;
    }
    return obj;
  }

  if (DiFi_foldersToCount.length) {
    var id = DiFi_foldersToCount.shift();
    DiFi_folders[id].counts = zeroObject();
    DiFi_folders[id].newCounts = zeroObject();
    DiFi_folders[id].highestTimestamps = zeroObject();
    switch (DiFi_folders[id].type) {
      case "inbox":
        DiFi_JSONrequest(DiFi_allMessagesRequest(id), id, DiFi_countMessages);
        return;
      case "group":
        DiFi_JSONrequest(DiFi_groupMessagesRequest(id), id, DiFi_countGroupMessages);
        return;
      default:
        DiFi_countNext();
    }
  } else {
    DiFi_countEnd();
  }
}

var DiFi_lastNewCounts = {};

function DiFi_countEnd() {
  DiFi_timestamp = DiFi_timestamp || epochTS(); // 1st time it's skipped, next time works normally
  DiFi_alertTimestamp = DiFi_highestTimestamp || epochTS(); // Only alert once

  DiFi_lastTotalCount = DiFi_totalCount;

  if (DiFi_totalNewCount) {
    DiFi_lastNewCounts = {};
    DiFi_lastNewCounts.ts = getExtTimestamp(DiFi_timestamp);
    DiFi_lastNewCounts.folders = {};
    for (var i in DiFi_folders) {
      DiFi_lastNewCounts.folders[i] = {};
      for (var j in DiFi_folders[i].newCounts) {
        DiFi_lastNewCounts.folders[i][j] = DiFi_folders[i].newCounts[j];
      }
    }
  }

  DiFi_fillAggregation();

  if (Prefs.rememberState.get()) {
    localStorage.lastState_lastTotalCount = DiFi_lastTotalCount;
    localStorage.lastState_timestamp = DiFi_timestamp;
    localStorage.lastState_alertTimestamp = DiFi_alertTimestamp;
    localStorage.lastState_lastTotalNewCount = DiFi_totalNewCount;
    localStorage.lastState_lastTotalNewCountApprox = DiFi_totalNewCountApprox;
  }

  DiFi_updateTooltip();
}

/* exported DiFi_getLastNewCount */
function DiFi_getLastNewCount(request) {
  var folder = request.folder || DiFi_inboxID || undefined;
  if (folder) {
    if (DiFi_lastNewCounts.folders[folder][request.type]) {
      let boundedCount;
      if (DiFi_lastNewCounts.folders[folder][request.type] == DiFi_maxItems) {
        boundedCount = DiFi_maxItems + "+";
      } else {
        boundedCount = DiFi_lastNewCounts.folders[folder][request.type];
      }
      return {
        count: boundedCount,
        ts: DiFi_lastNewCounts.ts
      };
    } else { return {error: true}; }
  } else { return {error: true}; }
}

function DiFi_allMessagesRequest(folderID) {
  var queryStr = "?";
  for (var type in DiFi_types) /*if(Prefs.MT(DiFi_types[type]).count)*/ {
    queryStr += "c[]=MessageCenter;get_views;" + folderID + DiFi_requestSuffix(DiFi_types[type], 0, DiFi_maxItems);
  }
  queryStr += "t=json";
  return queryStr;
}

function DiFi_groupMessagesRequest(folderID) {
  var queryStr = "?";
  var type;
  for (type in DiFi_groupTypes) /*if(Prefs.MT(DiFi_groupTypes[type]).count)*/ {
    queryStr += "c[]=MessageCenter;get_views;" + folderID + DiFi_requestSuffix(DiFi_groupTypes[type], 0, DiFi_maxItems);
  }
  for (type in DiFi_groupFeedTypes) /*if(Prefs.MT(DiFi_groupTypes[type]).count)*/ {
    queryStr += "c[]=MessageCenter;get_views;" + folderID + DiFi_requestSuffix(DiFi_groupFeedTypes[type], 0, DiFi_maxItems);
  }
  queryStr += "t=json";
  return queryStr;
}

function DiFi_countMessages(id, result) {
  try {
    var type;

    if (result.DiFi.status != "SUCCESS") { throw Error("DiFi: message request failed"); }

    for (type in DiFi_types) {
      if (Prefs.MT(DiFi_types[type]).count) {
        DiFi_totalCount += parseInt(DiFi_folders[id].counts[DiFi_types[type]] = result.DiFi.response.calls[type].response.content[0].result.matches);
      }
    }

    if (DiFi_timestamp) { // gotta count new messages
      for (type in DiFi_types) {
        if (Prefs.MT(DiFi_types[type]).count && Prefs.MT(DiFi_types[type]).watch) {
          DiFi_parseNew(id, DiFi_types[type], result.DiFi.response.calls[type].response.content[0].result);
        }
      }
    }

    DiFi_countNext();
  } catch (e) {
    handleError({type: "INTERNAL_ERROR", raw: e.stack.replace(traceRegexp, "")});
    console.log(e.stack);
    return false;
  }
}

function epochTS() {
  return Math.round(new Date().getTime() / 1000.0);
}

function DiFi_compareWho(who, username) {
  var match = who.match(/.*<a.*>(.+)<\/a>/);
  if (match) {
    return (match[1] == username);
  } else {
    return false;
  }
}

function DiFi_parseNew(id, type, result, group) { // Assumes (DiFi_alertTimestamp >= DiFi_timestamp)
  DiFi_folders[id].newCounts[type] = 0;

  var pref = (group) ? Prefs.GMT : Prefs.MT;

  for (var i = 0; i < result.count; i++) {
    DiFi_highestTimestamp = (result.hits[i].ts > DiFi_highestTimestamp) ? result.hits[i].ts : DiFi_highestTimestamp;
    DiFi_folders[id].highestTimestamps[type] =
      (result.hits[i].ts > DiFi_folders[id].highestTimestamps[type]) ? result.hits[i].ts : DiFi_folders[id].highestTimestamps[type];
    if (result.hits[i].ts <= DiFi_timestamp) { break; }

    if (result.hits[i].who && DiFi_compareWho(result.hits[i].who, DiFi_folders[DiFi_inboxID].name.substring(1))) { continue; }
    if (result.hits[i].app && result.hits[i].app == "Promoted" && !Prefs.notifyPromoted.get()) { continue; }

    DiFi_folders[id].newCounts[type]++;
    DiFi_totalNewCount++;
    if (pref(type).badge) { DiFi_hasNew = true; }
    if (result.hits[i].ts > DiFi_alertTimestamp && pref(type).audio) { DiFi_mustAlert = true; }
    if (result.hits[i].ts > DiFi_alertTimestamp && pref(type).popup) { DiFi_mustPopup = true; }
  }
}

function DiFi_countGroupMessages(id, result) {
  try {
    var type;

    if (result.DiFi.status != "SUCCESS") { throw Error("DiFi: message request failed"); }

    for (type in DiFi_groupTypes) {
      if (Prefs.GMT(DiFi_groupTypes[type]).count) {
        DiFi_totalCount += parseInt(
          DiFi_folders[id].counts[DiFi_groupTypes[type]] = result.DiFi.response.calls[type].response.content[0].result.matches
        );
      }
    }

    if (DiFi_timestamp) { // gotta count new messages
      for (type in DiFi_groupTypes) {
        if (Prefs.GMT(DiFi_groupTypes[type]).count && Prefs.GMT(DiFi_groupTypes[type]).watch) {
          DiFi_parseNew(id, DiFi_groupTypes[type],
            result.DiFi.response.calls[type].response.content[0].result, true);
        }
      }
      for (type in DiFi_groupFeedTypes) {
        if (Prefs.GMT(DiFi_groupFeedTypes[type]).count && Prefs.GMT(DiFi_groupFeedTypes[type]).watch) {
          DiFi_parseNew(id, DiFi_groupFeedTypes[type],
            result.DiFi.response.calls[parseInt(type) + DiFi_groupTypes.length].response.content[0].result, true);
        }
      }
    }

    DiFi_countNext();
  } catch (e) {
    handleError({type: "INTERNAL_ERROR", raw: e.stack.replace(traceRegexp, "")});
    console.log(e.stack);
    return false;
  }
}

function DiFi_updateTooltip() {
  var title;

  switch (Prefs.tooltipMode.get()) {
    case "full":
      title = DiFi_tooltipFull();
      break;
    case "aggregated":
      title = DiFi_tooltipAggregate();
      break;
    case "brief":
      title = DiFi_tooltipBrief();
      break;
  }

  chrome.browserAction.setTitle({title: title});

  DiFi_updatePopup();
}

function DiFi_tooltipLine(type, count, newCount, feed) {
  var line;
  if (feed) {
    line = newCount + ((newCount == DiFi_maxItems) ? "+" : "") + " new ";
    line += ((newCount == 1) ? messagesInfo[type].S : messagesInfo[type].P) + " (Feed)";
  } else {
    line = count + " " + ((count == 1) ? messagesInfo[type].S : messagesInfo[type].P);
    if (newCount) {
      line += " (" + newCount + ((newCount == DiFi_maxItems) ? "+" : "") + " new)";
    }
  }
  return line;
}

function DiFi_tooltipBrief() {
  var message_text = "";
  var newline = true;
  var type;

  var title = "Last updated: " + getTimestamp() + " for " + DiFi_folders[DiFi_inboxID].name;

  for (type in messagesInfo) {
    if (DiFi_folders[DiFi_inboxID].newCounts[type] > 0) {
      message_text +=
        ((newline) ? "\n" : " ") +
        DiFi_folders[DiFi_inboxID].newCounts[type] +
        ((DiFi_folders[DiFi_inboxID].newCounts[type] == DiFi_maxItems) ? "+" : "") +
        messagesInfo[type].A;
      newline = false;
    }
  }

  for (var id in DiFi_folders) {
    if (DiFi_folders[id].type == "group") {
      var has_messages = false;
      for (type in groupMessagesInfo) {
        if (DiFi_folders[id].newCounts[type]) { has_messages = true; }
      }
      if (!has_messages) { continue; }

      message_text += "\n#" + DiFi_folders[id].name + ":";

      for (type in groupMessagesInfo) {
        if (DiFi_folders[id].newCounts[type] > 0) {
          message_text += " " +
            DiFi_folders[id].newCounts[type] +
            ((DiFi_folders[id].newCounts[type] == DiFi_maxItems) ? "+" : "") +
            messagesInfo[type].A;
        }
      }
    }
  }

  if (!message_text) { message_text = "\nNo new notifications"; }

  title += message_text;

  return prepText(title);
}

function DiFi_tooltipFull() {
  var message_text = "";
  var type;

  var title = "Last updated: " + getTimestamp() + " for " + DiFi_folders[DiFi_inboxID].name;

  for (type in messagesInfo) {
    if (DiFi_folders[DiFi_inboxID].counts[type] > 0) {
      message_text += "\n> " + DiFi_tooltipLine(type, DiFi_folders[DiFi_inboxID].counts[type], DiFi_folders[DiFi_inboxID].newCounts[type], false);
    }
  }

  for (var id in DiFi_folders) {
    if (DiFi_folders[id].type == "group") {
      var has_messages = false;
      for (type in groupMessagesInfo) {
        if (DiFi_folders[id].counts[type] > 0 || DiFi_folders[id].newCounts[type]) { has_messages = true; }
      }
      if (!has_messages) { continue; }

      message_text += "\n#" + DiFi_folders[id].name + ":";

      for (type in groupMessagesInfo) {
        if (DiFi_folders[id].counts[type] > 0) {
          message_text += "\n> " + DiFi_tooltipLine(type, DiFi_folders[id].counts[type], DiFi_folders[id].newCounts[type], false);
        } else if (DiFi_folders[id].counts[type] === 0 && DiFi_folders[id].newCounts[type] > 0) { // Feed
          message_text += "\n> " + DiFi_tooltipLine(type, DiFi_folders[id].counts[type], DiFi_folders[id].newCounts[type], true);
        }
      }
    }
  }

  if (!message_text) { message_text = "\n No Notifications"; }

  title += message_text;

  return prepText(title);
}

function DiFi_fillAggregation() {
  var aClass;
  var type;

  for (aClass of aggregateClasses) {
    if (aClass.special && aClass.special == "group") {
      for (var id in DiFi_folders) {
        if (DiFi_folders[id].type == "group") {
          aClass.groups[id] = {count: 0, newCount: 0, newCountApprox: false};
          for (type of aClass.types) {
            aClass.groups[id].count += parseInt(DiFi_folders[id].counts[type]);
            aClass.groups[id].newCount += parseInt(DiFi_folders[id].newCounts[type]);
            if (DiFi_folders[id].newCounts[type] == DiFi_maxItems) { aClass.groups[id].newCountApprox = true; }
          }
        }
      }
    } else {
      aClass.count = 0;
      aClass.newCount = 0;
      aClass.newCountApprox = false;
      for (type of aClass.types) {
        aClass.count += parseInt(DiFi_folders[DiFi_inboxID].counts[type]);
        aClass.newCount += parseInt(DiFi_folders[DiFi_inboxID].newCounts[type]);
        if (DiFi_folders[DiFi_inboxID].newCounts[type] == DiFi_maxItems) { aClass.newCountApprox = true; }
      }
    }
  }

  var totalApprox = false;
  for (aClass of aggregateClasses) { totalApprox = totalApprox || aClass.newCountApprox; }
  DiFi_totalNewCountApprox = totalApprox;
}

function DiFi_tooltipAggregateLine(type, newCount, feed) {
  var line;
  if (feed) {
    line = newCount +
           ((newCount == DiFi_maxItems) ? "+" : "") +
           " new " +
           ((newCount == 1) ? messagesInfo[type].S : messagesInfo[type].P) +
           " (Feed)";
  } else {
    line = newCount +
           ((newCount == DiFi_maxItems) ? "+" : "") +
           " new " +
           ((newCount == 1) ? messagesInfo[type].S : messagesInfo[type].P);
  }
  return line;
}

function DiFi_tooltipAggregate() {
  var title = "Last updated: " + getTimestamp() + " for " + DiFi_folders[DiFi_inboxID].name;
  var message_text = "";
  var type;

  for (var aClass of aggregateClasses) {
    if (aClass.special && aClass.special == "group") {
      for (var id in DiFi_folders) {
        if (DiFi_folders[id].type == "group" && aClass.groups[id].count + aClass.groups[id].newCount > 0) {
          message_text += "\n\n" + "#" + DiFi_folders[id].name + ": ";
          message_text += aClass.groups[id].count + " " +
                          ((aClass.groups[id].count == 1) ? aClass.S : aClass.P);
          if (aClass.groups[id].newCount) {
            message_text += " (" +
                            aClass.groups[id].newCount +
                            ((aClass.groups[id].newCountApprox) ? "+" : "") +
                            " new)";
            for (type of aClass.types) {
              if (DiFi_folders[id].newCounts[type]) {
                message_text += "\n> " +
                  DiFi_tooltipAggregateLine(
                    type,
                    DiFi_folders[id].newCounts[type],
                    (DiFi_folders[id].counts[type] === 0)
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
          for (type of aClass.types) {
            if (DiFi_folders[DiFi_inboxID].newCounts[type]) {
              message_text += "\n> " +
                DiFi_tooltipAggregateLine(type, DiFi_folders[DiFi_inboxID].newCounts[type], false);
            }
          }
        }
      }
    }
  }

  if (!message_text) { message_text = "\n No Notifications"; }

  title += message_text;

  return prepText(title);
}

// ----------------------------------------------------

var popupData = {state: "init"};

function DiFi_updatePopup() {
  var i;

  popupData.state = "done";
  popupData.refreshing = false;
  delete popupData.error;
  popupData.skipNew = false;

  popupData.lastUpdateAt = getTimestamp();

  popupData.folderInfo = {};
  for (i in DiFi_folderInfo) { popupData.folderInfo[i] = DiFi_folderInfo[i]; }

  popupData.folders = {};
  for (i in DiFi_folders) { popupData.folders[i] = DiFi_folders[i]; }

  popupData.aggregateClasses = aggregateClasses.slice();

  popupData.totalCount = DiFi_totalCount;
  popupData.totalNewCount = DiFi_totalNewCount;
  popupData.totalNewCountApprox = DiFi_totalNewCountApprox;

  popupData.inboxID = DiFi_inboxID;

  chrome.runtime.sendMessage({action: "updatePopup", data: popupData});
  DiFi_updateBadge();
}

/* exported DiFi_clearPopupNew */
function DiFi_clearPopupNew() {
  popupData.totalNewCount = 0;
  popupData.skipNew = true;
}

// ----------------------------------------------------

function DiFi_updateBadge() {
  chrome.browserAction.setIcon({path: "img/dan_logo2_19_crisp.png"});
  var badgeText = "";

  switch (Prefs.badgeMode.get()) {
    case "all":
      if (DiFi_totalCount) {
        badgeText = DiFi_totalCount + "";
      } else if (DiFi_totalNewCount) {
        badgeText = DiFi_totalNewCount + "f"; // Feed messages ONLY
      } else {
        badgeText = "";
      }

      if (DiFi_hasNew) {
        chrome.browserAction.setBadgeBackgroundColor(COLOR_DEBUG);
      } else {
        chrome.browserAction.setBadgeBackgroundColor(COLOR_ACTIVE);
      }

      break;

    case "newOnly":

      if (DiFi_totalNewCount) {
        chrome.browserAction.setBadgeBackgroundColor(COLOR_DEBUG);
        badgeText = DiFi_totalNewCount + ((DiFi_totalNewCountApprox) ? "+" : "");
      } else {
        chrome.browserAction.setBadgeBackgroundColor(COLOR_ACTIVE);
        badgeText = "";
      }

      break;
  }

  chrome.browserAction.setBadgeText({text: prepText(badgeText)});

  if (DiFi_mustAlert) { playSound(); }
  if (DiFi_mustPopup && Prefs.showToast.get()) { DiFi_showDesktopNotification(); }

  DiFi_skipUpdate = false;

  if (DiFi_capturing) {
    DiFi_mustCapture = false;
    DiFi_capture.timestamp = DiFi_highestTimestamp || epochTS();
    localStorage.captureData = JSON.stringify(DiFi_capture);
  }
}

function DiFi_showDesktopNotification() {
  var data = {};
  var dispatch = false;
  var type;

  for (type in messagesInfo) {
    if (Prefs.MT(type).popup && (DiFi_folders[DiFi_inboxID].newCounts[type] > 0)) {
      data[type] = {
        count: (
          DiFi_folders[DiFi_inboxID].newCounts[type] +
          ((DiFi_folders[DiFi_inboxID].newCounts[type] == DiFi_maxItems) ? "+" : "")
        ),
        ts: DiFi_folders[DiFi_inboxID].highestTimestamps[type],
        feed: false
      };
      dispatch = true;
    }
  }

  data.groups = {};
  for (var id in DiFi_folders) {
    if (DiFi_folderInfo[id].type != "group") { continue; }

    var name = DiFi_folderInfo[id].name;
    data.groups[name] = {};
    data.groups[name].id = id;

    for (type in groupMessagesInfo) {
      if (Prefs.GMT(type).popup && (DiFi_folders[id].newCounts[type] > 0)) {
        data.groups[name][type] = {
          count: (
            DiFi_folders[id].newCounts[type] +
            ((DiFi_folders[id].newCounts[type] == DiFi_maxItems) ? "+" : "")
          ),
          ts: DiFi_folders[id].highestTimestamps[type],
          feed: (DiFi_folders[id].counts[type] === 0 && DiFi_folders[id].newCounts[type] > 0)
        };
        dispatch = true;
      }
    }
  }

  if (dispatch) { DN_notify(data); }
}

/* exported DiFi_seenInbox */
function DiFi_seenInbox() { // Assume user have seen inbox
  DiFi_timestamp = DiFi_highestTimestamp || epochTS();
  if (Prefs.rememberState.get()) { localStorage.lastState_timestamp = DiFi_timestamp; }
  chrome.browserAction.setBadgeBackgroundColor(COLOR_INACTIVE);
}

var DiFi_skipUpdate = false;
var DiFi_skipGuard = 0;

var DiFi_capture = {};
var DiFi_capturing = false;
var DiFi_mustCapture = false;

/* exported DiFi_doEverything */
function DiFi_doEverything() {
  if (DiFi_skipUpdate && DiFi_skipGuard < 5) {
    console.log("Request skipped at " + getTimestamp());
    DiFi_skipGuard++;
    return;
  }

  DiFi_skipUpdate = true;
  DiFi_skipGuard = 0;
  popupData.refreshing = true;

  DiFi_capturing = DiFi_mustCapture;
  if (DiFi_capturing) { DiFi_capture.folderData = {}; }

  chrome.runtime.sendMessage({action: "updatePopup", data: popupData});

  DiFi_JSONrequest("?c[]=MessageCenter;get_folders&t=json", 0, DiFi_getInboxID);
}

//--------------------------------------------------------------------------------------------------

// Workaround for limitations of known DiFi methods

var dAMC_deviantInfo = {};

function dAMC_folderInfoRequest() {
  var xhr = new XMLHttpRequest();

  xhr.timeout = Prefs.timeoutInterval.get();
  xhr.ontimeout = function() {
    handleError({type: "TIMEOUT"});
  };

  xhr.onload = function() {
    loggedOut = false;

    var username;

    try {
      if (/deviantART.deviant\s*=\s*({.*?})/.test(xhr.responseText)) { // Found deviant's info block
        dAMC_deviantInfo = JSON.parse((/deviantART.deviant\s*=\s*({.*?})/.exec(xhr.responseText))[1]);
        if (!dAMC_deviantInfo.username) {
          username = "???";
          console.error("dAMC: Unable to resolve username; failing gracefully");
        }
        username = dAMC_deviantInfo.symbol + dAMC_deviantInfo.username;
      } else {
        username = "???";
        console.error("dAMC: Unable to resolve username; failing gracefully");
      }

      DiFi_folderInfo = {};

      console.log("Username: '" + username + "'");
      DiFi_folderInfo[DiFi_inboxID] = {name: username, type: "inbox"};

      for (var i in DiFi_folders) {
        if (DiFi_folders[i].type != "inbox") {
          if (
            ((new RegExp('mcdata="\\{(.*?' + i + '.*?)\\}"', "g")).exec(xhr.responseText)) &&
            /is_group&quot;:true/.test(((new RegExp('mcdata="\\{(.*?' + i + '.*?)\\}"', "g")).exec(xhr.responseText))[0])
          ) {
            console.log("Folder: " + i + ", is a group");
            DiFi_folderInfo[i] = {name: DiFi_folders[i].name, type: "group"};
          } else {
            console.log("Folder: " + i + ", is not a group");
            DiFi_folderInfo[i] = {name: DiFi_folders[i].name, type: "folder"};
          }
        }
      }

      getFolderInfo(true);
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
}
