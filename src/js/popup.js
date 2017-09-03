/* global Prefs, messagesInfo, groupMessagesInfo */
/* global errorCritical, errorText, copyTextToClipboard, goToUrl, getLoginUrl */

/** TOP LEVEL CODE **/

$(document).ready(function() {
  chrome.runtime.onMessage.addListener(function(request) {
    if (request.action == "updatePopup") {
      P_fill(request.data);
    }
  });

  Prefs.init();
  P_fill(chrome.extension.getBackgroundPage().popupData);
});

function P_fill(data) {
  $("#P_header").replaceWith(P_createHeader(data));
  $("#P_container").replaceWith(P_createContainer(data));
  $("#P_footer").replaceWith(P_createFooter(data));
}

/** VARIOUS CONTENT GENERATORS **/

/*  Content structure:

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

  if (data.error && data.error.type == "LOGGED_OUT") {
    header.append("Logged out");
  } else if (data.state == "init") {
    header.append("Waiting for data…");
  } else {
    P_createMCLink()
      .text(
        (data.totalCount || "No") + " notification" + ((data.totalCount == 1) ? "" : "s")
      )
      .appendTo(header);

    var username = data.folders[data.inboxID].name;
    header.append(" for " + username.substring(0,1)); // User symbol
    header.append(P_createProfileLink(username.substring(1))); // User profile

    if (data.totalNewCount > 0) {

      var new_header = $('<div class="subheader" id="P_new_header">');

      $('<span class="new_text" />')
        .text(
          data.totalNewCount + ((data.totalNewCountApprox) ? "+" : "") +
          " new notification" + ((data.totalNewCount == 1) ? "" : "s")
        )
        .appendTo(new_header);
      new_header.append(" | ");
      new_header.append(P_createMarkReadLink());

      header.append(new_header);
    }
  }

  if (data.error && data.error.type != "LOGGED_OUT") {
    var error_display = $("<div>");

    error_display.addClass(
      (errorCritical(data.error)) ? "error" : "warning"
    );

    error_display.append(errorText(data.error));

    if (data.error.raw) {
      var raw_display = $('<div class="raw">')
        .append($('<div class="raw_hint">Click to copy:</div>'))
        .append($("<div id='raw_data'>" + data.error.raw.replace(/\n\s*/g, "<br>") + "</div>"));

      raw_display.click(function() {
        copyTextToClipboard(data.error.raw);
      });

      error_display.append(raw_display);
    }

    header.append(error_display);
  }

  return header;
}

function P_createProfileLink(username) {
  return $("<a href='#' />")
    .text(username)
    .click(function() { P_openURL(username + ".deviantart.com/"); });
}

function P_createMCLink(type) {
  return $("<a href='#' />").click(
    function() {
      P_openMC(type || "all");
      return false;
    }
  );
}

function P_createMarkReadLink() {
  return $('<a href="#" />')
    .text("Mark all as read")
    .click(function() {
      chrome.runtime.sendMessage({action: "seenInbox"});
      chrome.runtime.sendMessage({action: "clearPopupNew"});
    });
}

/* Main container */

function P_createContainer(data) {

  var container = $("<div />", {
    class: "container",
    id: "P_container"
  });

  if (data.error && data.error.type == "LOGGED_OUT") {
    var login_button = $('<div class="login_button">')
      .text("Click here to log in")
      .click(function() {goToUrl(getLoginUrl());});

    return container.append(login_button);
  }

  if (!data.aggregateClasses) { return container; }

  var aggregateClasses = data.aggregateClasses;

  for (var aClass of aggregateClasses) {
    var entries;

    if (aClass.special && aClass.special == "group") {

      for (var id in data.folders) {
        if (data.folders[id].type == "group" && aClass.groups[id].count + aClass.groups[id].newCount > 0) {

          var group_name = data.folders[id].name;

          var group_container = $("<div />", {
            class: "class_container",
            id: "P_group-" + id
          });

          // Group header
          $('<div class="header"/>')
            .append("#")
            .append(P_createProfileLink(group_name))
            .append(":")
            .appendTo(group_container);

          entries = $();

          for (var t in aClass.types) {
            if (
              data.folders[id].counts[aClass.types[t]] + data.folders[id].newCounts[aClass.types[t]] > 0 &&
              !(data.skipNew && data.folders[id].counts[aClass.types[t]] === 0)
            ) {
              entries = entries.add(
                P_createGroupEntry(aClass.types[t], data.folders[id], id, data.skipNew)
              );
            }
          }

          $('<table class="entry_container" />').append(entries).appendTo(group_container);

          container.append(group_container);
        }
      }
    } else if (aClass.count + aClass.newCount > 0) {
      var singleton = (aClass.special && aClass.special == "singleton");

      var ac_container = $('<div class="class_container">');

      entries = $();

      if (!singleton) {
        entries = entries.add(
          P_createClassHeader(aClass, aClass.UP, data.skipNew)
        );
      }

      for (var type of aClass.types) {
        if (data.folders[data.inboxID].counts[type] > 0) {
          entries = entries.add(
            P_createEntry(type, data.folders[data.inboxID], data.skipNew)
          );
        }
      }

      $('<table class="entry_container" />').append(entries).appendTo(ac_container);

      container.append(ac_container);
    }
  }

  return container;
}

function P_createClassHeader(ac_data, ac, skip_new) {
  var element = $('<td class="entry class_header">');
  element.click(function(e) { P_onEntryClick(ac, e); });
  element.on("auxclick", function(e) { P_onEntryClickAux(ac, e); });

  element.text(
    ac_data.count + " " + ((ac_data.count == 1) ? ac_data.S : ac_data.P)
  );

  if (ac_data.newCount && !skip_new) {
    var new_span = $('<span class="new_text">');
    new_span.text(" (" +  ac_data.newCount + (ac_data.newCountApprox ? "+" : "") + " new)");
    element.append(new_span);
  }

  return $("<tr>").append(element);
}

function P_createEntry(type, data, skip_new) {
  var element = $('<td class="entry">', {id: "entry-" +  type});
  element.click(function(e) { P_onEntryClick(messagesInfo[type].UP, e); });
  element.on("auxclick", function(e) { P_onEntryClickAux(messagesInfo[type].UP, e); });

  element.text(
    data.counts[type] + " " +
    ((data.counts[type] == 1) ? messagesInfo[type].S : messagesInfo[type].P)
  );

  if (data.newCounts[type] && !skip_new) {
    var new_span = $('<span class="new_text">');
    new_span.text(" (" +  data.newCounts[type] + ((data.newCounts[type] == Prefs.maxItems.get()) ? "+" : "") + " new)");
    element.append(new_span);
    element.addClass("has_new");
  }

  return $("<tr>").append(element);
}

function P_createGroupEntry(type, data, id, skip_new) {
  id = id || 0;

  var element = $('<td class="entry">', {id: "entry-" + id + "-" +  type});
  element.click(function(e) { P_onEntryClick(id, e); });
  element.on("auxclick", function(e) { P_onEntryClickAux(id, e); });

  element.text(
    data.counts[type] + " " +
    ((data.counts[type] == 1) ? messagesInfo[type].S : messagesInfo[type].P)
  );

  if (groupMessagesInfo[type].feed && !skip_new) {
    element.text(
      data.newCounts[type] + ((data.newCounts[type] == Prefs.maxItems.get()) ? "+" : "") + " " +
      ((data.newCounts[type] == 1) ? messagesInfo[type].S : messagesInfo[type].P)
    );
    $('<span class="new_text">').text(" (Feed)").appendTo(element);
    element.addClass("has_new");
  } else {
    element.text(
      data.counts[type] + " " + ((data.counts[type] == 1) ? messagesInfo[type].S : messagesInfo[type].P)
    );
    if (data.newCounts[type] && !skip_new) {
      $('<span class="new_text">').text(
        " (" +  data.newCounts[type] + ((data.newCounts[type] == Prefs.maxItems.get()) ? "+" : "") + " new)"
      ).appendTo(element);
      element.addClass("has_new");
    }
  }

  return $("<tr>").append(element);
}

function P_createFooter(data) {
  var footer = $('<div class="footer" id="P_footer">');

  $('<img src="img/loading.gif" class="spinner left">').appendTo(footer); // padding for symmetry, invisible

  if (!data.lastUpdateAt) {  // Rare: not a single update finished yet
    footer.append("First update…");
  } else {          // Normal: we have last update time
    footer.append("Last updated: " + data.lastUpdateAt);
  }

  $('<img src="img/loading.gif" class="spinner right">')
    .css("visibility", (data.refreshing) ? "visible" : "hidden")
    .appendTo(footer);

  var footer_commands = $('<div class="footer">');

  footer_commands.append(
    $('<a href="#">').text("Options").click(() => { P_openOptions(); })
  ).append(" | ").append(
    $('<a href="#">').text("Update now").click(() => { P_forceUpdate(); })
  );

  if (Prefs.debug.get()) {
    footer_commands.append(" | ").append(
      $('<a href="#">').text("Time machine!").click(() => { P_debugTimestamp(); })
    );
  }

  footer.append(footer_commands);

  return footer;
}

/** UTILITY FUNCTIONS **/

function P_onEntryClick(type, e) {
  var alt = (e.metaKey || e.ctrlKey || e.shiftKey || e.button == 1);

  P_openMC(type, alt);

  if (type.match(/^\d+$/)) {
    $("#P_group-" + type + " .entry").addClass("entry_seen");
  } else {
    $("#entry-" + type).addClass("entry_seen");
  }

  return false;
}

function P_onEntryClickAux(type, e) {
  var alt = (e.metaKey || e.ctrlKey || e.shiftKey || e.button == 1);

  P_openMC(type, alt);

  if (type.match(/^\d+$/)) {
    $("#P_group-" + type + " .entry").addClass("entry_seen");
  } else {
    $("#entry-" + type).addClass("entry_seen");
  }

  return false;
}

function P_openMC(type, alt) {
  chrome.runtime.sendMessage({action: "showMC", type: type, alt: (alt || false)});
}

function P_openURL(url) {
  url = "https://" + url.toLowerCase();
  chrome.runtime.sendMessage({action: "openURL", url: url});
}

function P_openOptions() {
  chrome.runtime.sendMessage({action: "openURL", url: chrome.runtime.getURL("options.html")});
}

function P_debugTimestamp() {
  // 30 days back
  var ts = Math.round(new Date().getTime() / 1000.0) - 2592000;
  chrome.extension.getBackgroundPage().DiFi.timestamp = ts;
  chrome.extension.getBackgroundPage().DiFi.alertTimestamp = ts;
  P_forceUpdate();
}

function P_forceUpdate() {
  chrome.runtime.sendMessage({action: "updateNow"});
}
