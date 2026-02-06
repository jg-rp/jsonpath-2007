/**
 * @typedef {object} JSONPathNode
 * @property {unknown} value
 * @property {Array<string|number>} location
 * @property {unknown} root
 */

/**
 * @typedef {object} JSONPathQuery
 * @property {Array<any>} segments
 */

/**
 * @typedef {typeof T[keyof typeof T]} TokenKind
 */

/**
 * Tokens are produced by the lexer and consumed by the parser, and publicly
 * accessible from instances of `JSONPathSyntaxError`.
 * @typedef {object} JSONPathToken
 * @property {TokenKind} kind
 * @property {string} value
 * @property {number} index
 */

/**
 * See section 2.4.1. of RFC 9535 - Type System for Function Expressions.
 * @typedef {"ValueType"|"LogicalType"|"NodesType"} FunctionType
 */

/**
 * @typedef {object} FunctionDefinition
 * @property {Array<FunctionType>} argTypes
 * @property {FunctionType} returnType
 * @property {function(...unknown):unknown} call
 */

/**
 * @typedef {Record<String,FunctionDefinition>} FunctionExtensions
 */

/**
 * @typedef {object} JSONPathOptions
 * @property {FunctionExtensions?} functionExtensions
 */

/**
 * Apply JSONPath expression `query` to `data`.
 * @param {string} query A JSONPath expression.
 * @param {object} data Target JSON-like data.
 * @param {JSONPathOptions} options Path parsing and resolution configuration.
 * @returns {Array<JSONPathNode>} An array of nodes found by applying `query` to `data`.
 */
function find(query, data, options) {
  return resolve(compile(query, options), data, options);
}

/**
 * Compile a JSONPath expression for repeated application to different data.
 * Use `JSONPath.resolve(compiledQuery, data)` to resolve an already compiled query.
 * @param {string} query A JSONPath expression.
 * @param {JSONPathOptions} options Path parsing and resolution configuration.
 * @returns {JSONPathQuery} A compiled query.
 */
function compile(query, options) {
  return parse(tokenize(query), query, options);
}

/**
 * Return a mapping of built-in function extension names to their
 * implementations.
 *
 * Update the returned object with custom function extensions and pass it to
 * `find`, `compile` or `resolve` as `options.functionExtensions`.
 *
 * @returns {FunctionExtensions}
 */
function standardFunctionExtensions() {
  return shallowCopy(FUNCTION_EXTENSIONS);
}

/**
 * @typedef {object} JSONPathAPI
 * @property {typeof find} find
 * @property {typeof compile} compile
 * @property {typeof resolve} resolve
 * @property {string} version
 * @property {typeof canonicalPath} canonicalPath
 * @property {typeof JSONPathError} JSONPathError
 * @property {typeof JSONPathSyntaxError} JSONPathSyntaxError
 * @property {typeof standardFunctionExtensions} standardFunctionExtensions
 */
var api = {
  find: find,
  compile: compile,
  resolve: resolve,
  canonicalPath: canonicalPath,
  version: "0.0.1",
  JSONPathError: JSONPathError,
  JSONPathSyntaxError: JSONPathSyntaxError,
  standardFunctionExtensions: standardFunctionExtensions
};
