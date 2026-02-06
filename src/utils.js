var isArray = function (obj) {
  return Object.prototype.toString.call(obj) === "[object Array]";
};

function isPlainObject(value) {
  return typeof value === "object" && value !== null && !isArray(value);
}

function isString(value) {
  return typeof value === "string";
}

function isNumber(value) {
  return typeof value === "number";
}

function stringRepeat(str, count) {
  var result = "";
  for (var i = 0; i < count; i++) {
    result += str;
  }
  return result;
}

function shallowCopy(obj) {
  var copy = {};
  for (var key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      copy[key] = obj[key];
    }
  }
  return copy;
}

function deepEquals(a, b) {
  if (a === b) {
    return true;
  }

  if (isArray(a)) {
    if (isArray(b)) {
      if (a.length !== b.length) {
        return false;
      }
      for (var i = 0; i < a.length; i++) {
        if (!deepEquals(a[i], b[i])) {
          return false;
        }
      }
      return true;
    }
    return false;
  } else if (isPlainObject(a) && isPlainObject(b)) {
    var keysA = Object.keys(a);
    var keysB = Object.keys(b);

    if (keysA.length !== keysB.length) {
      return false;
    }

    for (var i = 0, len = keysA.length; i < len; i++) {
      var key = keysA[i];
      if (!deepEquals(a[key], b[key])) {
        return false;
      }
    }

    return true;
  }

  return false;
}
