export function find(query, data) {
  return resolve(compile(query), data);
}

export function compile(query) {
  return parse(tokenize(query));
}
