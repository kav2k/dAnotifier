// prefs.js
//
// Hopefully here will lie a framework for dealing with options, and dynamically populate the options page with them
//
// (c) Alexander Kashev, 2010

// A function to construct a new Preference object
//// args:
// key (string): key under which the preference will be stored in localStorage
// name (string): user-friendly name for use in errors/warnings
// unpacker (function: string -> object): function to decode localStorage-saved version
// packer (function: object -> string): function to encode preference for storage
// validators (array of functions): array of validator functions (see below)
// def (object): default value assigned to the preference if in is uninitialized, reset to default or fails validation with no fallback
//// Note: assumes that the default value passes validation

function Preference(args) {
  this.key = args.key;
  this.name = args.name;
  this.pack = args.packer || JSON_Packer;
  this.unpack = args.unpacker || JSON_Unpacker;
  this.def = args.def;
  this.fields = args.fields || {key: {name: args.name, validators: []}};

  this.validators = [];
  if (args.validators) {
    for (var i in args.validators) {
      this.validators.push(args.validators[i]);
    }
  }

  this.validate = function(input) { // Check candidate value with all registered validators
    var messages = "";
    var status = "PASS";
    for (var i in this.validators) {
      var result = (this.validators[i])(input, this);
      messages += result.message;
      if (result.status == "FAIL") {
        status = "FAIL";
        break;
      } else if (result.status == "WARN") {
        status = ((status == "FAIL") ? "FAIL" : "WARN");
      }
    }
    return {status: status, message: messages};
  };

  this.reset = function() { // Revert to default
    this.value = this.def;
    localStorage[this.key] = this.pack(this.value);
  };

  this.init = function() { // Load saved value or revert to default
    if (localStorage[this.key] === undefined) { // No value saved
      console.log("[Prefs] No value for " + this.name + " in localStorage[" + this.key + "], using default '" + this.def + "'");
      this.reset();
    } else { // We've got something in localStorage
      var result = this.validate(this.unpack(localStorage[this.key]));

      if (result.status == "FAIL") {  // Validation faliure on saved value
        console.warn(result.message);
        console.warn("[Prefs] Saved value for " + this.name + " in localStorage[" + this.key + "] failed validation! Using default '" + this.def + "'");
        this.reset();
      } else { // All is well
        this.value = this.unpack(localStorage[this.key]);
      }
    }
  };

  this.set = function(input) {
    var result = this.validate(input);

    if (result.status == "FAIL") {
      console.warn(result.message);
      console.warn("[Prefs] New value '" + input + "' for '" + this.name + "' failed validation! Keeping current '" + this.value + "'");
    } else {
      this.value = input;
      localStorage[this.key] = this.pack(this.value);
    }
    return result;
  };

  this.get = function() {
    this.init();
    return this.value;
  };

  this.init();
}

// Standard packers/unpackers

var JSON_Packer = function(input) { return JSON.stringify(input); };
var JSON_Unpacker = function(input) { return JSON.parse(input); };

// Messages' wrappers

var wrapPassMessage = function() {
  return {
    status: "PASS",
    message: ""
  };
};

var wrapWarnMessage = function(text) {
  return {
    status: "WARN",
    message: '<span class="pref-warn">' + text + "</span>"
  };
};

var wrapFailMessage = function(text) {
  return {
    status: "FAIL",
    message: '<span class="pref-fail">' + text + "</span>"
  };
};

//// Standard validators

var NonEmptyValidator = function(input) {
  if (input) {
    wrapPassMessage();
  } else {
    return wrapFailMessage("Must be non-empty");
  }
};

// Type

var IntValidator = function(input) {
  if (isFinite(input) && (input == Math.round(input))) {
    return wrapPassMessage();
  } else {
    return wrapFailMessage("Must be an integer");
  }
};

var FloatValidator = function(input) {
  if (isFinite(input)) {
    return wrapPassMessage();
  } else {
    return wrapFailMessage("Must be a number");
  }
};

var StringValidator = function(input) { return wrapPassMessage(); };

var ArrayValidator = function(input) { return wrapPassMessage(); };

var JSONFieldsValidator = function(input, pref) {
  var messages = "";
  var status = "PASS";

  for (var i in pref.fields) {
    if (input[i] === undefined) {
      wrapFailMessage("Wrong JSON structure (user should never see this!)");
    }
    for (var j in pref.fields.validators) {
      var result = (this.fields[i].validators[j])(input[i], pref);
      messages += result.message;
      if (result.status == "FAIL") {
        status = "FAIL";
        break;
      } else if (result.status == "WARN") {
        status = ((status == "FAIL") ? "FAIL" : "WARN");
      }
    }
  }

  if (status == "FAIL") {
    return wrapFailMessage(messages);
  } else if (status == "WARN") {
    return wrapWarnMessage(messages);
  } else {
    return wrapPassMessage();
  }
};

var BoolValidator = function(input) {
  if (typeof(input) == "boolean") {
    return wrapPassMessage();
  } else {
    return wrapFailMessage("Must be a boolean value (user should never see this!)");
  }
};

// Comparison

var PositiveValidator = function(input) {
  if (input <= 0) {
    return wrapFailMessage("Must be positive");
  } else {
    return wrapPassMessage();
  }
};

var GTValidator = function(min) {
  return function(input) {
    if (input < min) {
      return wrapFailMessage("Must be no less than " + min);
    } else {
      return wrapPassMessage();
    }
  };
};

var LTValidator = function(max) {
  return function(input) {
    if (input > max) {
      return wrapFailMessage("Must be no more than " + max);
    } else {
      return wrapPassMessage();
    }
  };
};

var BetweenValidator = function(min, max) {
  return function(input) {
    if ((input > max) || (input < min)) {
      return wrapFailMessage("Must be between " + min + " and " + max);
    } else {
      return wrapPassMessage();
    }
  };
};

function EnumValidator(values) {
  return function(input) {
    if (values.indexOf(input) > -1) { return wrapPassMessage(); }
    return wrapFailMessage("Value not in possible values");
  };
}

// Special time comparisons (incomplete)
// Differ only in error messages

var GTValidatorSeconds = function(min) {
  return function(input) {
    if (input < min) {
      return wrapFailMessage("Must be no less than " + min / 1000 + " second(s)");
    } else {
      return wrapPassMessage();
    }
  };
};

var GTValidatorMinutes = function(min) {
  return function(input) {
    if (input < min) {
      return wrapFailMessage("Must be no less than " + min / 60000 + " minute(s)");
    } else {
      return wrapPassMessage();
    }
  };
};
