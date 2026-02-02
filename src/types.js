import { Token } from "./token";

/**
 * @typedef {object} JSONPathNode
 * @property {unknown} value
 * @property {Array<string|number>} location
 * @property {unknown} root
 */

/**
 * @typedef {object} JSONPathQuery
 * @property {Array<Segment>} segments
 */

/**
 * @typedef {object} ChildSegment
 * @property {"ChildSegment"} kind
 * @property {Token} token
 * @property {Array<Selector>} selectors
 */

/**
 * @typedef {object} DescendantSegment
 * @property {"DescendantSegment"} kind
 * @property {Token} token
 * @property {Array<Selector>} selectors
 */

/**
 * @typedef {ChildSegment|DescendantSegment} Segment
 */

/**
 * @typedef {object} NameSelector
 * @property {"NameSelector"} kind
 * @property {Token} token
 * @property {string} name
 */

/**
 * @typedef {object} IndexSelector
 * @property {"IndexSelector"} kind
 * @property {Token} token
 * @property {number} index
 */

/**
 * @typedef {object} SliceSelector
 * @property {"SliceSelector"} kind
 * @property {Token} token
 * @property {number|undefined} start
 * @property {number|undefined} stop
 * @property {number|undefined} step
 */

/**
 * @typedef {object} WildcardSelector
 * @property {"WildcardSelector"} kind
 * @property {Token} token
 */

/**
 * @typedef {object} FilterSelector
 * @property {"FilterSelector"} kind
 * @property {Token} token
 * @property {Expression} expression
 */

/**
 * @typedef {NameSelector|IndexSelector|SliceSelector|WildcardSelector|FilterSelector} Selector
 */

/**
 * @typedef {object} NullLiteral
 * @property {"NullLiteral"} kind
 * @property {Token} token
 */

/**
 * @typedef {object} BooleanLiteral
 * @property {"BooleanLiteral"} kind
 * @property {Token} token
 * @property {boolean} value
 */

/**
 * @typedef {object} StringLiteral
 * @property {"StringLiteral"} kind
 * @property {Token} token
 * @property {string} value
 */

/**
 * @typedef {object} NumberLiteral
 * @property {"NumberLiteral"} kind
 * @property {Token} token
 * @property {number} value
 */

/**
 * @typedef {object} LogicalNot
 * @property {"LogicalNot"} kind
 * @property {Token} token
 * @property {Expression} expression
 */

/**
 * @typedef {object} LogicalAnd
 * @property {"LogicalAnd"} kind
 * @property {Token} token
 * @property {Expression} left
 * @property {Expression} right
 */

/**
 * @typedef {object} LogicalOr
 * @property {"LogicalOr"} kind
 * @property {Token} token
 * @property {Expression} left
 * @property {Expression} right
 */

/**
 * @typedef {object} LT
 * @property {"LT"} kind
 * @property {Token} token
 * @property {Expression} left
 * @property {Expression} right
 */

/**
 * @typedef {object} LE
 * @property {"LE"} kind
 * @property {Token} token
 * @property {Expression} left
 * @property {Expression} right
 */

/**
 * @typedef {object} GT
 * @property {"GT"} kind
 * @property {Token} token
 * @property {Expression} left
 * @property {Expression} right
 */

/**
 * @typedef {object} GE
 * @property {"GE"} kind
 * @property {Token} token
 * @property {Expression} left
 * @property {Expression} right
 */

/**
 * @typedef {object} EQ
 * @property {"EQ"} kind
 * @property {Token} token
 * @property {Expression} left
 * @property {Expression} right
 */

/**
 * @typedef {object} NE
 * @property {"NE"} kind
 * @property {Token} token
 * @property {Expression} left
 * @property {Expression} right
 */

/**
 * @typedef {object} AbsoluteQuery
 * @property {"AbsoluteQuery"} kind
 * @property {Token} token
 * @property {JSONPathQuery} query
 */

/**
 * @typedef {object} RelativeQuery
 * @property {"RelativeQuery"} kind
 * @property {Token} token
 * @property {JSONPathQuery} query
 */

/**
 * @typedef {object} FunctionExtension
 * @property {"FunctionExtension"} kind
 * @property {Token} token
 * @property {string} name
 * @property {Array<Expression>} args
 */

/**
 * @typedef {NullLiteral|BooleanLiteral|StringLiteral|NumberLiteral|LogicalNot|LogicalAnd|LogicalOr|AbsoluteQuery|RelativeQuery|FunctionExtension|EQ|GT|GE|LT|LE|NE} Expression
 */

/**
 * @typedef {object} ParseState
 * @property {Array<Token>} tokens
 * @property {number} pos
 */

/**
 * @param {unknown} value
 * @returns {value is Record<string, unknown>}
 */
export function isPlainObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 *
 * @param {any} obj
 * @returns {obj is Expression}
 */
export function isLiteral(obj) {
  switch (obj.kind) {
    case "NullLiteral":
    case "BooleanLiteral":
    case "StringLiteral":
    case "NumberLiteral":
      return true;
    default:
      return false;
  }
}
