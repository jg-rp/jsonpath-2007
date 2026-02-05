function JSONPathError(message, token, query, customName) {
  this.name = customName || "JSONPathError";

  this.message =
    token && query
      ? detailedMessage(this.name, message, token, query)
      : message || "JSONPath error";

  this.token = token;
  this.query = query;
  this.stack = new Error().stack;
}

JSONPathError.prototype = new Error();
JSONPathError.prototype.constructor = JSONPathError;

function detailedMessage(name, message, token, query) {
  if (!query || query.replace(/^\s+|\s+$/g, "").length === 0) {
    return "empty query";
  }

  var lines = query.slice(0, token.index).split(/\r\n?|\n/);
  var lineno = lines.length;
  var col = lines[lineno - 1].length;
  var pad = stringRepeat(" ", String(lineno).length);
  var pointer =
    stringRepeat(" ", col) + stringRepeat("^", token.value.length || 1);

  return [
    name + ": " + message,
    pad + " -> '" + query + "' " + lineno + ":" + col,
    pad + " |",
    lineno + " | " + query,
    pad + " | " + pointer + " " + message
  ].join("\n");
}

function JSONPathSyntaxError(message, token, query) {
  JSONPathError.call(this, message, token, query, "JSONPathSyntaxError");
}

JSONPathSyntaxError.prototype = new JSONPathError();
JSONPathSyntaxError.prototype.constructor = JSONPathSyntaxError;

function JSONPathTypeError(message, token, query) {
  JSONPathError.call(this, message, token, query, "JSONPathTypeError");
}

JSONPathTypeError.prototype = new JSONPathError();
JSONPathTypeError.prototype.constructor = JSONPathTypeError;

function JSONPathNameError(message, token, query) {
  JSONPathError.call(this, message, token, query, "JSONPathNameError");
}

JSONPathNameError.prototype = new JSONPathError();
JSONPathNameError.prototype.constructor = JSONPathNameError;

function stringRepeat(str, count) {
  var result = "";
  for (var i = 0; i < count; i++) {
    result += str;
  }
  return result;
}
