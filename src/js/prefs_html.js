/* global markDirty, save */
/* exported HTMLControl_checkmarkImages */
const HTMLControl_checkmarkImages = {
  on: "img/checkmark_active.svg",
  off: "img/checkmark_inactive.svg",
  disabled: "img/checkmark_disabled.svg"
};

function HTMLControl_checkmarkToggle() {
  if (!this.enabled) { return; }

  this.value = !(this.value);

  this.update();
  markDirty();
}

function HTMLControl_EnumToggle() {
  if (!this.enabled) { return; }

  if (this.value) {
    return;
  } else {
    for (var field in this.parentControl.fields) {
      this.parentControl[field].value = false;
    }
    this.value = true;
  }

  this.update();
  markDirty();
}

function HTMLControl_checkmarkImmediateToggle() {
  if (!this.enabled) { return; }

  this.value = !(this.value);

  this.update();
  save();
}

function HTMLControl_checkmarkUpdate() {
  this.enabled = this.enabler(this);
  if (!this.enabled) {
    this.src = this.images.disabled;
    this.alt = "disabled";
    this.style.cursor = "default";
  } else if (this.value) {
    this.src = this.images.on;
    this.alt = "checked";
    this.style.cursor = "pointer";
  } else {
    this.src = this.images.off;
    this.alt = "unchecked";
    this.style.cursor = "pointer";
  }
}

function HTMLControl_EnumUpdate(indirect) {
  if (!indirect) { // Broadcast update
    for (var field in this.parentControl.fields) {
      this.parentControl[field].update(true);
    }
    return;
  }

  this.enabled = this.enabler(this);
  if (!this.enabled) {
    this.src = this.images.disabled;
    this.alt = "disabled";
    this.style.cursor = "default";
  } else if (this.value) {
    this.src = this.images.on;
    this.alt = "checked";
    this.style.cursor = "pointer";
  } else {
    this.src = this.images.off;
    this.alt = "unchecked";
    this.style.cursor = "pointer";
  }
}

function HTMLControl_checkmarkArrayUpdate(indirect) {
  if (!indirect) { // Broadcast update
    for (var field in this.parentControl.fields) {
      this.parentControl[field].update(true);
    }
    return;
  }

  this.enabled = this.enabler(this);
  if (!this.enabled) {
    this.src = this.images.disabled;
    this.alt = "disabled";
    this.style.cursor = "default";
  } else if (this.value) {
    this.src = this.images.on;
    this.alt = "checked";
    this.style.cursor = "pointer";
  } else {
    this.src = this.images.off;
    this.alt = "unchecked";
    this.style.cursor = "pointer";
  }
}

/* exported HTMLControl_addInputFieldRow */
function HTMLControl_addInputFieldRow(args) {
  var HTML = "<tr><td>";
  HTML += '<input type="text" ' +
    'id="pref-' + args.pref.key + '">';
  HTML += "</td><td>";
  HTML += "<b>" + args.pref.name + "</b>";
  HTML += args.comment || "";
  HTML += '<span id="pref-' + args.pref.key + '-err"></span>';
  HTML += "</td></tr>";

  args.multiplier = args.multiplier || 1;

  $(HTML).appendTo(args.parent);
  if (args.size) {
    document.getElementById("pref-" + args.pref.key).style.width = args.size;
    document.getElementById("pref-" + args.pref.key).style.textAlign = "center";
  }

  args.pref.initHTMLControl = function() {
    this.HTMLControl = document.getElementById("pref-" + this.key);
    this.HTMLControl.get = function() { return (this.value * args.multiplier); };
    this.HTMLControl.set = function(value) { this.value = (value / args.multiplier); };
    this.saveHTML = function() {
      var result = this.set(this.HTMLControl.get());
      $(`#pref-${this.key}-err`).empty().append($(result.message));
    };

    this.HTMLControl.set(this.get());

    this.HTMLControl.oninput = markDirty;
  };
}

/* exported HTMLControl_addCheckmarkRow */
function HTMLControl_addCheckmarkRow(args) {

  var HTML = "<tr><td>";
  HTML += "<img " + 'id="pref-' + args.pref.key + '" class="checkmark">';
  HTML += "</td><td>";
  HTML += "<b>" + args.pref.name + "</b>";
  HTML += args.comment || "";
  HTML += '<span id="pref-' + args.pref.key + '-err"></span>';
  HTML += "</td></tr>";

  $(HTML).appendTo(args.parent);

  args.pref.initHTMLControl = function() {
    this.HTMLControl = document.getElementById("pref-" + this.key);
    this.HTMLControl.get = function() { return this.value; };
    this.HTMLControl.set = function(value) {
      this.value = value;
      this.update();
    };
    this.HTMLControl.enabler = args.enabler || (function() {return true;});
    this.HTMLControl.update = HTMLControl_checkmarkUpdate;
    this.HTMLControl.images = args.images;
    this.saveHTML = function() {
      var result = this.set(this.HTMLControl.get());
      $(`#pref-${this.key}-err`).empty().append($(result.message));
    };

    this.HTMLControl.set(this.get());

    this.HTMLControl.onclick = HTMLControl_checkmarkToggle;
  };
}

/* exported HTMLControl_addEnum */
function HTMLControl_addEnum(args) {
  var HTML = "";
  for (var field in args.pref.fields) {
    HTML += "<tr>";
    HTML += "<td><img " + 'id="pref-' + args.pref.key + "-" + field + '" class="checkmark"></td>';
    HTML += "<td><b>" + args.pref.fields[field] + "</b></td>";
    HTML += "</tr>";
  }

  $(HTML).appendTo(args.parent);

  args.pref.initHTMLControl = function() {
    this.HTMLControl = {};
    this.HTMLControl.fields = this.fields;

    for (var field in this.fields) {
      this.HTMLControl[field] = document.getElementById("pref-" + this.key + "-" + field);
      this.HTMLControl[field].enabler = (args.enabler) ? args.enabler(this.HTMLControl) : (function() {return true;});
      this.HTMLControl[field].images = args.images;
      this.HTMLControl[field].update = HTMLControl_EnumUpdate;
      this.HTMLControl[field].onclick = HTMLControl_EnumToggle;
      this.HTMLControl[field].field = field;
      this.HTMLControl[field].parentControl = this.HTMLControl;
    }

    this.HTMLControl.get = function() {
      for (var field in this.fields) {
        if (this[field].value) {
          return field;
        }
      }
      return null;
    };
    this.HTMLControl.set = function(value) {
      var field;
      for (field in this.fields) { this[field].value = (value == field); }
      for (field in this.fields) { this[field].update(true); }
    };

    this.saveHTML = function() {
      this.set(this.HTMLControl.get());
    };

    this.HTMLControl.set(this.get());
  };
}

/* exported HTMLControl_addCheckmarkImmediateRow */
function HTMLControl_addCheckmarkImmediateRow(args) {
  var HTML = "<tr><td>";
  HTML += "<img " + 'id="pref-' + args.pref.key + '" class="checkmark">';
  HTML += "</td><td>";
  HTML += "<b>" + args.pref.name + "</b>";
  HTML += args.comment || "";
  HTML += '<span id="pref-' + args.pref.key + '-err"></span>';
  HTML += "</td></tr>";

  $(HTML).appendTo(args.parent);

  args.pref.initHTMLControl = function() {
    this.HTMLControl = document.getElementById("pref-" + this.key);
    this.HTMLControl.get = function() { return this.value; };
    this.HTMLControl.set = function(value) {
      this.value = value;
      this.update();
    };
    this.HTMLControl.enabler = args.enabler || (function() { return true; });
    this.HTMLControl.update = HTMLControl_checkmarkUpdate;
    this.HTMLControl.images = args.images;
    this.saveHTML = function() {
      var result = this.set(this.HTMLControl.get());
      $(`#pref-${this.key}-err`).empty().append($(result.message));
    };

    this.HTMLControl.set(this.get());

    this.HTMLControl.onclick = HTMLControl_checkmarkImmediateToggle;
  };
}

/* exported HTMLControl_addCheckArrayHeader */
function HTMLControl_addCheckArrayHeader(args) {

  var HTML = "<tr><td></td>";
  for (var field in args.pref.fields) {
    HTML += "<td><b>" + args.pref.fields[field].name + "</b></td>";
  }
  HTML += "</tr>";

  $(HTML).appendTo(args.parent);
}

/* exported HTMLControl_addCheckArraySpan */
function HTMLControl_addCheckArraySpan(args) {
  var HTML = '<tr class="span"><td></td>';
  Object.keys(args.pref.fields).forEach(() => {HTML += "<td></td>";});
  HTML += "</tr>";

  $(HTML).appendTo(args.parent);
}

/* exported HTMLControl_addCheckArrayRow */
function HTMLControl_addCheckArrayRow(args) {

  var HTML = '<tr id="pref-' + args.pref.key + '" ';
  if (args.parity) { HTML += 'class="' + args.parity + '"'; }
  HTML += "><td>";
  HTML += "<b>" + args.pref.name + "</b>";
  HTML += '<span id="pref-' + args.pref.key + '-err"></span></td>';
  for (var field in args.pref.fields) {
    HTML += "<td><img " + 'id="pref-' + args.pref.key + "-" + field + '" class="checkmark"></td>';
  }
  HTML += "</tr>";

  $(HTML).appendTo(args.parent);

  args.pref.initHTMLControl = function() {

    this.HTMLControl = {};
    this.HTMLControl.fields = this.fields;

    for (var field in this.fields) {
      this.HTMLControl[field] = document.getElementById("pref-" + this.key + "-" + field);
      this.HTMLControl[field].enabler = (args.enabler) ? args.enabler(this.HTMLControl) : (function() {return true;});
      this.HTMLControl[field].images = args.images;
      this.HTMLControl[field].update = HTMLControl_checkmarkArrayUpdate;
      this.HTMLControl[field].onclick = HTMLControl_checkmarkToggle;
      this.HTMLControl[field].field = field;
      this.HTMLControl[field].parentControl = this.HTMLControl;
    }

    this.HTMLControl.feed = this.feed || false;

    this.HTMLControl.get = function() {
      var result = {};
      for (var field in this.fields) { result[field] = this[field].value; }
      return result;
    };
    this.HTMLControl.set = function(value) {
      var field;
      for (field in this.fields) { this[field].value = value[field]; }
      for (field in this.fields) { this[field].update(); }
    };

    this.saveHTML = function() {
      var result = this.set(this.HTMLControl.get());
      $(`#pref-${this.key}-err`).empty().append($(result.message));
    };

    this.HTMLControl.set(this.get());
  };
}
