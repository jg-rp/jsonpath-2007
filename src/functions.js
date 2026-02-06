var CountFunctionExtension = {
  argTypes: ["NodesType"],
  returnType: "ValueType",
  call: function (nodeList) {
    return nodeList.nodes.length;
  }
};

var LengthFunctionExtension = {
  argTypes: ["ValueType"],
  returnType: "ValueType",
  call: function (value) {
    if (value === NOTHING) return NOTHING;
    if (isArray(value) || isString(value)) return value.length;
    if (isPlainObject(value)) return Object.keys(value).length;
    return NOTHING;
  }
};

// TODO: store this on the filter context and set `this` to filter context?
var matchRegexCache = createLRUCache(64);

var MatchFunctionExtension = {
  argTypes: ["ValueType", "ValueType"],
  returnType: "LogicalType",
  call: function (value, pattern) {
    if (!isString(value) || !isString(pattern)) {
      return false;
    }

    var re = matchRegexCache.get(pattern);
    if (re) {
      return re.test(value);
    }

    try {
      re = new RegExp(fullMatch(pattern), "u");
      matchRegexCache.set(pattern, re);
    } catch (error) {
      return false;
    }

    return re.test(value);
  }
};

var searchRegexCache = createLRUCache(64);

var SearchFunctionExtension = {
  argTypes: ["ValueType", "ValueType"],
  returnType: "LogicalType",
  call: function (value, pattern) {
    if (!isString(value) || !isString(pattern)) {
      return false;
    }

    var re = searchRegexCache.get(pattern);
    if (re) {
      return !!value.match(re);
    }

    try {
      re = new RegExp(mapRegexp(pattern), "u");
      searchRegexCache.set(pattern, re);
    } catch (error) {
      return false;
    }

    return !!value.match(re);
  }
};

var ValueFunctionExtension = {
  argTypes: ["NodesType"],
  returnType: "ValueType",
  call: function (nodeList) {
    if (nodeList.nodes.length === 1) return nodeList.nodes[0].value;
    return NOTHING;
  }
};

function mapRegexp(pattern) {
  var escaped = false;
  var charClass = false;
  var parts = [];
  var ch = "";
  for (var i = 0, len = pattern.length; i < len; i++) {
    ch = pattern[i];

    if (escaped) {
      parts.push(ch);
      escaped = false;
      continue;
    }

    switch (ch) {
      case ".":
        if (!charClass) {
          parts.push("(?:(?![\r\n])\\P{Cs}|\\p{Cs}\\p{Cs})");
        } else {
          parts.push(ch);
        }
        break;
      case "\\":
        escaped = true;
        parts.push(ch);
        break;
      case "[":
        charClass = true;
        parts.push(ch);
        break;
      case "]":
        charClass = false;
        parts.push(ch);
        break;
      default:
        parts.push(ch);
        break;
    }
  }
  return parts.join("");
}

function fullMatch(pattern) {
  var parts = [];
  var explicitCaret = pattern.startsWith("^");
  var explicitDollar = pattern.endsWith("$");
  if (!explicitCaret && !explicitDollar) parts.push("^(?:");
  parts.push(mapRegexp(pattern));
  if (!explicitCaret && !explicitDollar) parts.push(")$");
  return parts.join("");
}

var FUNCTION_EXTENSIONS = {
  count: CountFunctionExtension,
  length: LengthFunctionExtension,
  match: MatchFunctionExtension,
  search: SearchFunctionExtension,
  value: ValueFunctionExtension
};
