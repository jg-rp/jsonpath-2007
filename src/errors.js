/**
 * The base class for all JSONPath errors.
 * @param {string=} message
 * @param {JSONPathToken=} token
 * @param {string=} query
 * @param {string=} customName
 */
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
    pad + " | " + pointer + " " + message,
  ].join("\n");
}

/**
 * An error caused by a JSONPath expression syntax error.
 * @param {string=} message
 * @param {JSONPathToken=} token
 * @param {string=} query
 */
function JSONPathSyntaxError(message, token, query) {
  JSONPathError.call(this, message, token, query, "JSONPathSyntaxError");
}

JSONPathSyntaxError.prototype = new JSONPathError();
// @ts-ignore
JSONPathSyntaxError.prototype.constructor = JSONPathSyntaxError;
