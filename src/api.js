// TODO: function extensions and types
var api = {
  find: find,
  compile: compile,
  resolve: _resolve,
  canonicalPath: canonicalPath,
  version: "0.0.1"
};

function find(query, data) {
  return resolve(compile(query), data);
}

function compile(query) {
  return parse(tokenize(query));
}

// XXX:
function _resolve(query, data) {
  return resolve(query, data);
}
