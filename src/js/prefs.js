/* global messagesInfo, groupMessagesInfo, aggregateClasses */
/* global wrapWarnMessage */
/* global Preference, IntValidator, GTValidatorMinutes, GTValidatorSeconds, BoolValidator, JSONFieldsValidator, EnumValidator */
/* exported Prefs */
var Prefs = {};

Prefs.add = function(args) {
  Prefs[args.key] = new Preference(args);
};

Prefs.foreach = function(fun) {
  for (let i in this) {
    if (Prefs[i] instanceof Preference) { // Is a Preference
      if (typeof fun === "function") {
        fun(Prefs[i]);
      } else if (typeof Prefs[i][fun] === "function") {
        Prefs[i][fun]();
      }
    }
  }
};

Prefs.init = function() {
  if (Prefs.ready) {
    Prefs.foreach("init");
    return;
  }

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
    key: "rememberState",
    name: "Remember state between browser sessions",
    def: true,
    validators: [BoolValidator]
  });

  for (let i in messagesInfo) {
    if (messagesInfo[i].pref) {
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
  }

  for (let i in groupMessagesInfo) {
    if (groupMessagesInfo[i].pref) {
      Prefs.add({
        key: groupMessagesInfo[i].pref,
        name: messagesInfo[i].P + ((groupMessagesInfo[i].feed) ? " feed" : ""),
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
  }

  Prefs.add({
    key: "hideRelnotes",
    name: "Hide release notes on update",
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
    key: "maxItems",
    name: "Maximum polled items per notification class",
    def: 20,
    validators: [IntValidator]
  });

  Prefs.add({
    key: "newlineMagic",
    name: "Use dirty XP tooltip trick",
    def: true,
    validators: [BoolValidator]
  });

  Prefs.add({
    key: "UIMode",
    name: "UI mode",
    def: "popup",
    fields: {
      popup: "New mode: Click on the button opens popup interface",
      tooltipOnly: "Old mode: Click on the button opens inbox, information only in the tooltip"
    },
    validators: [EnumValidator(["popup", "tooltipOnly"])]
  });

  Prefs.add({
    key: "tooltipMode",
    name: "Tooltip mode",
    def: "brief",
    fields: {
      full: "Full: list all notification classes",
      aggregated: "Aggregated: show new notifications, grouped by type",
      brief: "Brief: show only new notifications, abbreviated (like deviantAnywhere)"
    },
    validators: [EnumValidator(["full", "aggregated", "brief"])]
  });

  Prefs.add({
    key: "notifyPromoted",
    name: "Consider Promoted content new",
    def: true,
    validators: [BoolValidator]
  });

  Prefs.add({
    key: "toastMode",
    name: "Tooltip mode",
    def: "rich",
    fields: {
      basic: "Basic: text-only notifications (integrate with OS X Notifiaction Center)",
      rich: "Brief: \"new-style\" rich notifications (integrate with Chrome Notifications)"
    },
    validators: [EnumValidator(["basic", "rich"])]
  });

  Prefs.add({
    key: "MCReminder",
    name: "Remind about new items in the Message Center",
    def: true,
    validators: [BoolValidator]
  });

  Prefs.add({
    key: "MCHighlight",
    name: "Highlight recent notifications in the Message Center",
    def: true,
    validators: [BoolValidator]
  });

  Prefs.add({
    key: "badgeMode",
    name: "Counter mode",
    def: "newOnly",
    fields: {
      newOnly: "Display new notifications count only",
      all: "Display total number of notifications"
    },
    validators: [EnumValidator(["all", "newOnly"])]
  });

  Prefs.ready = true;
};

Prefs.MT = function(type) {
  return Prefs[messagesInfo[type].pref].get();
};

Prefs.GMT = function(type) {
  return Prefs[groupMessagesInfo[type].pref].get();
};

function DebugValidator(input) {
  if (!input) {
    return wrapWarnMessage("Warning: very advanced options for testing only!");
  } else {
    return wrapWarnMessage("You've been warned! The debug section is all the way down.");
  }
}

function PrefMessageEnabler(hc) {
  return function(checkmark) {
    switch (checkmark.field) {
      case "count": return !(hc.feed || false);
      case "watch": return hc.count.value;
      case "badge": return hc.watch.value && hc.count.value;
      case "audio": return hc.watch.value && hc.count.value;
      case "popup": return hc.watch.value && hc.count.value;
      default:      return true;
    }
  };
}

/* global HTMLControl */
Prefs.initHTML = function() {
  if (Prefs.HTMLready) { return; }

  HTMLControl.addInputFieldRow({
    pref: Prefs.refreshInterval,
    size: "30px",
    multiplier: 60000,
    comment: " (minutes, default: 1)",
    parent: document.getElementById("prefs-interval")
  });

  HTMLControl.addCheckmarkRow({
    pref: Prefs.playSound,
    images: HTMLControl.checkmarkImages,
    parent: document.getElementById("prefs-alert")
  });

  HTMLControl.addCheckmarkRow({
    pref: Prefs.showToast,
    images: HTMLControl.checkmarkImages,
    parent: document.getElementById("prefs-alert")
  });

  HTMLControl.addCheckmarkRow({
    pref: Prefs.rememberState,
    images: HTMLControl.checkmarkImages,
    parent: document.getElementById("prefs-advanced")
  });

  HTMLControl.addInputFieldRow({
    pref: Prefs.timeoutInterval,
    size: "30px",
    multiplier: 1000,
    comment: " (seconds, default: 20)",
    parent: document.getElementById("prefs-interval")
  });

  HTMLControl.addCheckArrayHeader({
    pref: Prefs.followNotices,
    parent: document.getElementById("prefs-array")
  });

  let parity = true;

  for (let i in aggregateClasses) {
    if (aggregateClasses[i].special == "group") { continue; }

    HTMLControl.addCheckArraySpan({
      pref: Prefs.followNotices,
      name: aggregateClasses[i].P,
      parent: document.getElementById("prefs-array")
    });

    for (let j in aggregateClasses[i].types) {
      if (messagesInfo[aggregateClasses[i].types[j]].pref) {
        parity = !parity;
        HTMLControl.addCheckArrayRow({
          pref: Prefs[messagesInfo[aggregateClasses[i].types[j]].pref],
          images: HTMLControl.checkmarkImages,
          parent: document.getElementById("prefs-array"),
          //parent: document.getElementById('prefs-array-'+i),
          enabler: PrefMessageEnabler,
          parity: (parity) ? "even" : "odd"
        });
      }
    }
  }

  HTMLControl.addCheckArrayHeader({
    pref: Prefs.followGroupNotices,
    parent: document.getElementById("prefs-group-array")
  });

  for (let i in groupMessagesInfo) {
    if (groupMessagesInfo[i].pref) {
      parity = !parity;
      HTMLControl.addCheckArrayRow({
        pref: Prefs[groupMessagesInfo[i].pref],
        images: HTMLControl.checkmarkImages,
        parent: document.getElementById("prefs-group-array"),
        //parent: document.getElementById('prefs-array-'+i),
        enabler: PrefMessageEnabler,
        parity: (parity) ? "even" : "odd"
      });
    }
  }

  HTMLControl.addCheckmarkRow({
    pref: Prefs.hideRelnotes,
    images: HTMLControl.checkmarkImages,
    //comment: " (will display a warning if unset)",
    parent: document.getElementById("prefs-advanced")
  });

  HTMLControl.addEnum({
    pref: Prefs.UIMode,
    images: HTMLControl.checkmarkImages,
    parent: document.getElementById("prefs-ui-mode")
  });

  HTMLControl.addEnum({
    pref: Prefs.tooltipMode,
    images: HTMLControl.checkmarkImages,
    parent: document.getElementById("prefs-tooltip-mode")
  });

  HTMLControl.addEnum({
    pref: Prefs.badgeMode,
    images: HTMLControl.checkmarkImages,
    parent: document.getElementById("prefs-counter-mode")
  });

  HTMLControl.addCheckmarkRow({
    pref: Prefs.MCReminder,
    images: HTMLControl.checkmarkImages,
    parent: document.getElementById("prefs-advanced")
  });

  HTMLControl.addCheckmarkRow({
    pref: Prefs.MCHighlight,
    images: HTMLControl.checkmarkImages,
    parent: document.getElementById("prefs-advanced")
  });

  HTMLControl.addCheckmarkRow({
    pref: Prefs.notifyPromoted,
    images: HTMLControl.checkmarkImages,
    parent: document.getElementById("prefs-advanced")
  });

  HTMLControl.addCheckmarkRow({
    pref: Prefs.debug,
    images: HTMLControl.checkmarkImages,
    parent: document.getElementById("prefs-advanced")
  });

  HTMLControl.addCheckmarkRow({
    pref: Prefs.useCapture,
    images: HTMLControl.checkmarkImages,
    parent: document.getElementById("prefs-debug")
  });

  HTMLControl.addCheckmarkRow({
    pref: Prefs.newlineMagic,
    images: HTMLControl.checkmarkImages,
    parent: document.getElementById("prefs-debug")
  });

  Prefs.foreach("initHTMLControl");
  Prefs.HTMLready = true;
};

Prefs.initHTML_relnotes = function() {
  if (Prefs.HTMLready) { return; }

  HTMLControl.addCheckmarkImmediateRow({
    pref: Prefs.hideRelnotes,
    images: HTMLControl.checkmarkImages,
    comment: " (you can unset this later in options)",
    parent: document.getElementById("prefs-relnotes")
  });

  Prefs.hideRelnotes.initHTMLControl();

  Prefs.HTMLready = true;
};
