/* global DiFi */
function pad(n) {
  return (n < 10) ? "0" + n : n;
}

/* exported getTimestamp */
function getTimestamp() {
  const d = new Date();

  return pad(d.getHours()) + ":" + pad(d.getMinutes()) + ":" + pad(d.getSeconds());
}

/* exported getExtTimestamp */
function getExtTimestamp(ts) {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const d = new Date(ts * 1000);

  return (d.getDate() + " " + months[d.getMonth()] + ", " + d.getFullYear() + ", " + pad(d.getHours()) + ":" + pad(d.getMinutes()));
}

/* exported playSound */
function playSound() {
  document.getElementById("notify_sound").currentTime = 0;
  document.getElementById("notify_sound").play();
}

/* exported messagesInfo */
const messagesInfo = {
  // Notices
  N: {
    S: "Hot Topic",
    P: "Hot Topics",
    pref: "followNotices",
    UP: "hottopics",
    A: "HT",
    EP: "feedback"
  },
  CA: {
    S: "Contest Announcement",
    P: "Contest Announcements",
    pref: "followContest",
    UP: "contests",
    A: "CA",
    EP: "feedback"
  },
  B: {
    S: "Bulletin",
    P: "Bulletins",
    pref: "followBulletins",
    UP: "bulletins",
    A: "B",
    EP: "feedback"
  },
  // deviantWATCH
  D: {
    S: "Deviation",
    P: "Deviations",
    pref: "followDeviations",
    UP: "deviations",
    A: "D",
    EP: "watch/deviations"
  },
  GD: {
    S: "Group Deviation",
    P: "Group Deviations",
    pref: "followGroupDeviations",
    UP: "groupdeviations",
    A: "GD",
    EP: "watch/groupdeviations"
  },
  WC: {
    S: "Watched Critique",
    P: "Watched Critiques",
    pref: "followCritiques",
    UP: "critiques",
    A: "WC",
    EP: "watch"
  },
  J: {
    S: "Journal",
    P: "Journals",
    pref: "followJournals",
    UP: "journals",
    A: "J",
    EP: "watch/journals"
  },
  F: {
    S: "Forum",
    P: "Forums",
    pref: "followForums",
    UP: "forums",
    A: "F",
    EP: "watch/forums"
  },
  P: {
    S: "Poll",
    P: "Polls",
    pref: "followPolls",
    UP: "polls",
    A: "P",
    EP: "watch/polls"
  },
  SU: {
    S: "Status Update",
    P: "Status Updates",
    pref: "followStatusUpdates",
    UP: "status",
    A: "SU",
    EP: "watch/status"
  },
  WA: {
    S: "Miscellaneous",
    P: "Miscellaneous",
    pref: "followActivities",
    UP: "activities",
    A: "WA",
    EP: "watch/miscellaneous"
  },
  // Feedback
  CN: {
    S: "Critique Notice",
    P: "Critique Notices",
    pref: "followCritNotices",
    UP: "critiquesreceived",
    A: "CN",
    EP: "feedback"
  },
  C: {
    S: "Comment",
    P: "Comments",
    pref: "followComments",
    UP: "comments",
    feed: true,
    A: "C",
    EP: "feedback/comments"
  },
  R: {
    S: "Reply",
    P: "Replies",
    pref: "followReplies",
    UP: "replies",
    A: "R",
    EP: "feedback/replies"
  },
  A: {
    S: "Activity Message",
    P: "Activity Messages",
    pref: "followActivity",
    UP: "activity",
    feed: true,
    A: "A",
    EP: "feedback/activity"
  },
  M: {
    S: "Mention",
    P: "Mentions",
    pref: "followMentions",
    UP: "mentions",
    A: "M",
    EP: "feedback/mentions"
  },
  // Correspondence
  CO: {
    S: "Correspondence Item",
    P: "Correspondence Items",
    pref: "followCorrespondence",
    UP: "correspondence",
    A: "CO",
    EP: "feedback/correspondence"
  },
  // Notes
  UN: {
    S: "Note",
    P: "Notes",
    pref: "followNotes",
    UP: "notes",
    A: "N",
    EP: "notes/"
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
    UP: "notices",
    EP: "feedback"
  }, {
    S: "Watch Notification",
    P: "Watch Notifications",
    types: ["D", "GD", "WC", "J", "F", "P", "SU", "WA"],
    count: 0,
    newCount: 0,
    UP: "deviantwatch",
    EP: "watch"
  }, {
    S: "Feedback Notification",
    P: "Feedback Notifications",
    types: ["CN", "C", "R", "A", "M"],
    count: 0,
    newCount: 0,
    UP: "feedback",
    EP: "feedback"
  }, {
    S: "Correspondence Item",
    P: "Correspondence Items",
    special: "singleton",
    types: ["CO"],
    count: 0,
    newCount: 0,
    UP: "correspondence",
    EP: "feedback/correspondence"
  }, {
    S: "Note",
    P: "Notes",
    special: "singleton",
    types: ["UN"],
    count: 0,
    newCount: 0,
    UP: "notes",
    EP: "notes"
  }, {
    S: "Notification",
    P: "Notifications",
    special: "group",
    types: ["CO", "N", "C", "A"],
    groups: {},
    UP: "",
    EP: ""
  }
];

/* exported prepText */
// Combined text preparation for the tooltip
function prepText(text) {
  text = text.replace("<br>","\n");

  return text;
}

// *** URL helper functions
/* exported getMessagesUrl, getNotificationsUrl, getLoginUrl */
function getMessagesUrl() {
  return "https://www.deviantart.com/notifications/";
}

function getNotificationsUrl() {
  return "https://www.deviantart.com/notifications/feedback/";
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
  let result = url.split("#")[0];
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
  const bringUp = background ? false : true;

  function focusTab(tab) {
    if (bringUp) {
      chrome.windows.update(tab.windowId, {focused: true});
    }
  }

  chrome.tabs.query(
    {currentWindow: true},
    function(tabs) {
      for (let tab of tabs.reverse()) {
        if (tab.url && isUrl(tab.url, getUrl, distinct)) {
          chrome.tabs.update(
            tab.id,
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
  }
}

function messageClassURLEclipse(type) {
  if (type == "all") {
    return getMessagesUrl() + "?random=" + Math.ceil(10000 * Math.random());
  } else if (parseInt(type)) { // URL fragment
    return getMessagesUrl() + "feedback" + "?folder=" + DiFi.folderInfo[type].userId + "&random=" + Math.ceil(10000 * Math.random());
  } else { // Group ID
    return getMessagesUrl() + type + "?random=" + Math.ceil(10000 * Math.random());
  }
}

/* exported goToMTUrl */
function goToMTUrl(type, distinct, background, eclipse) {
  if (eclipse) {
    goToUrl(messageClassURLEclipse(type), distinct, background);
  } else {
    goToUrl(messageClassURL(type), distinct, background);
  }
}

/* exported handleOnClick */
function handleOnClick(id, func) {
  // Does not pass event argument
  document.getElementById(id).addEventListener("click", () => { func(); });
}

/* exported copyTextToClipboard */
function copyTextToClipboard(text) {
  let copyFrom = $("<textarea/>");
  copyFrom.text(text);
  $("body").append(copyFrom);
  copyFrom.select();
  document.execCommand("copy");
  copyFrom.remove();
}
