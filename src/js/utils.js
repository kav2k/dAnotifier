/* global Prefs */
const traceRegexp = /chrome-extension:\/\/\w*\//g;

/* exported getTimestamp */
function getTimestamp() {
  var d = new Date();

  var pad = function(n) {return (n < 10) ? "0" + n : n;};

  return pad(d.getHours()) + ":" + pad(d.getMinutes()) + ":" + pad(d.getSeconds());
}

/* exported getExtTimestamp */
function getExtTimestamp(ts) {
  var d = new Date(ts * 1000);

  var pad = function(n) {return (n < 10) ? "0" + n : n;};
  var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  return (d.getDate() + " " + months[d.getMonth()] + ", " + d.getFullYear() + ", " + pad(d.getHours()) + ":" + pad(d.getMinutes()));
}

/* exported playSound */
function playSound() {
  try {
    if (!Prefs.playSound.get()) { return; }
    document.getElementById("notify_sound").currentTime = 0;
    document.getElementById("notify_sound").play();
  } catch (e) {
    console.log(e.stack.replace(traceRegexp, ""));
  }
}

/* exported messagesInfo */
var messagesInfo = {
  // Notices
  N: {
    S: "Hot Topic",
    P: "Hot Topics",
    pref: "followNotices",
    UP: "hottopics",
    A: "HT"
  },
  CA: {
    S: "Contest Announcement",
    P: "Contest Announcements",
    pref: "followContest",
    UP: "contests",
    A: "CA"
  },
  B: {
    S: "Bulletin",
    P: "Bulletins",
    pref: "followBulletins",
    UP: "bulletins",
    A: "B"
  },
  // deviantWATCH
  D: {
    S: "Deviation",
    P: "Deviations",
    pref: "followDeviations",
    UP: "deviations",
    A: "D"
  },
  GD: {
    S: "Group Deviation",
    P: "Group Deviations",
    pref: "followGroupDeviations",
    UP: "groupdeviations",
    A: "GD"
  },
  WC: {
    S: "Watched Critique",
    P: "Watched Critiques",
    pref: "followCritiques",
    UP: "critiques",
    A: "WC"
  },
  J: {
    S: "Journal",
    P: "Journals",
    pref: "followJournals",
    UP: "journals",
    A: "J"
  },
  F: {
    S: "Forum",
    P: "Forums",
    pref: "followForums",
    UP: "forums",
    A: "F"
  },
  P: {
    S: "Poll",
    P: "Polls",
    pref: "followPolls",
    UP: "polls",
    A: "P"
  },
  SU: {
    S: "Status Update",
    P: "Status Updates",
    pref: "followStatusUpdates",
    UP: "status",
    A: "SU"
  },
  WA: {
    S: "Miscellaneous",
    P: "Miscellaneous",
    pref: "followActivities",
    UP: "activities",
    A: "WA"
  },
  // Feedback
  CN: {
    S: "Critique Notice",
    P: "Critique Notices",
    pref: "followCritNotices",
    UP: "critiquesreceived",
    A: "CN"
  },
  C: {
    S: "Comment",
    P: "Comments",
    pref: "followComments",
    UP: "comments",
    feed: true,
    A: "C"
  },
  R: {
    S: "Reply",
    P: "Replies",
    pref: "followReplies",
    UP: "replies",
    A: "R"
  },
  A: {
    S: "Activity Message",
    P: "Activity Messages",
    pref: "followActivity",
    UP: "activity",
    feed: true,
    A: "A"
  },
  M: {
    S: "Mention",
    P: "Mentions",
    pref: "followMentions",
    UP: "mentions",
    A: "M"
  },
  // Correspondence
  CO: {
    S: "Correspondence Item",
    P: "Correspondence Items",
    pref: "followCorrespondence",
    UP: "correspondence",
    A: "CO"
  },
  // Notes
  UN: {
    S: "Note",
    P: "Notes",
    pref: "followNotes",
    UP: "notes",
    A: "N"
  }
};

/* exported groupMessagesInfo */
const groupMessagesInfo = {
  CO: {pref: "followGroupCorrespondence", feed: false},
  N: {pref: "followGroupNotices", feed: false},
  C: {pref: "followGroupComments", feed: true},
  A: {pref: "followGroupActivity", feed: true}
};

/* exported aggregateClasses */
const aggregateClasses = [
  {
    S: "Notice",
    P: "Notices",
    types: ["N", "CA", "B"],
    count: 0,
    newCount: 0,
    UP: "notices"
  }, {
    S: "Watch Notification",
    P: "Watch Notifications",
    types: ["D", "GD", "WC", "J", "F", "P", "SU", "WA"],
    count: 0,
    newCount: 0,
    UP: "deviantwatch"
  }, {
    S: "Feedback Notification",
    P: "Feedback Notifications",
    types: ["CN", "C", "R", "A", "M"],
    count: 0,
    newCount: 0,
    UP: "feedback"
  }, {
    S: "Correspondence Item",
    P: "Correspondence Items",
    special: "singleton",
    types: ["CO"],
    count: 0,
    newCount: 0,
    UP: "correspondence"
  }, {
    S: "Note",
    P: "Notes",
    special: "singleton",
    types: ["UN"],
    count: 0,
    newCount: 0,
    UP: "notes"
  }, {
    S: "Notification",
    P: "Notifications",
    special: "group",
    types: ["CO", "N", "C", "A"],
    groups: {},
    UP: ""
  }
];

/* exported prepText */
// Combined text preparation for the tooltip
function prepText(text) {
  text = text.replace("<br>","\n");

  if (Prefs.newlineMagic.get()) { text = newlineMagic(text); }

  return text;
}

// Breaks up long multiline text with \r characters
// Sadly, this is required for WinXP's tooltips
function newlineMagic(text) {
  var lines = text.split("\n");
  var result = lines.shift();
  var len = 0;

  for (var i in lines) {
    if (len + lines[i].length > 210) {
      result += "\r\n" + lines[i];
      len = 0;
    } else {
      result += "\n" + lines[i];
      len += lines[i].length + 1;
    }
  }

  return result;
}

// *** URL helper functions
/* exported getMessagesUrl, getLoginUrl */
function getMessagesUrl() {
  return "https://www.deviantart.com/notifications/";
}

function getLoginUrl() {
  return "https://www.deviantart.com/users/login";
}

// Compares url to targetUrl modulo #... or ?... at end
function isUrl(url, targetUrl, distinct) {
  url = stripUrl(url, distinct);
  targetUrl = stripUrl(targetUrl, distinct);

  if (url.indexOf(targetUrl) !== 0) {
    return false;
  }

  return url.length == targetUrl.length ||
         url[targetUrl.length] == "?" ||
         url[targetUrl.length] == "#";
}

function stripUrl(url, keepAnchor) {
  var result = url.split("#")[0];
  result = result.split("?")[0];

  if (keepAnchor && (url.indexOf("#") > -1)) {
    result += "#" + url.split("#").pop();
  }

  return result;
}

// *** URL opener
// goToUrl selects tab whose url satisfies isUrl(tab.url, getUrl())
// otherwise opens a new tab with getUrl()
function goToUrl(getUrl, distinct, background) {
  var bringUp = background ? false : true;

  function focusTab(tab) {
    if (bringUp) {
      chrome.windows.update(tab.windowId, {focused: true});
    }
  }

  chrome.tabs.query(
    {currentWindow: true},
    function(tabs) {
      var rtabs = tabs.reverse();
      for (var i in rtabs) {
        if (rtabs[i].url && isUrl(rtabs[i].url, getUrl, distinct)) {
          chrome.tabs.update(
            rtabs[i].id,
            {url: getUrl, active: bringUp},
            focusTab
          );
          return;
        }
      }
      chrome.tabs.create(
        {url: getUrl, active: bringUp},
        focusTab
      );
    }
  );
}

function messageClassURL(type) {
  if (type == "all") {
    return getMessagesUrl() + "?random=" + Math.ceil(10000 * Math.random());
  } else if (type.length) {
    return getMessagesUrl() + "?random=" + Math.ceil(10000 * Math.random()) + "#view=" + type;
  } else {
    return getMessagesUrl() + "?random=" + Math.ceil(10000 * Math.random()) + "#view=" + messagesInfo[type].UP;
  }
}

/* exported goToMTUrl */
function goToMTUrl(type, distinct, background) {
  goToUrl(messageClassURL(type), distinct, background);
}

/* exported handleOnClick */
function handleOnClick(id, func) {
  // Does not pass event argument
  document.getElementById(id).addEventListener("click", () => { func(); });
}

/* exported copyTextToClipboard */
function copyTextToClipboard(text) {
  var copyFrom = $("<textarea/>");
  copyFrom.text(text);
  $("body").append(copyFrom);
  copyFrom.select();
  document.execCommand("copy");
  copyFrom.remove();
}
