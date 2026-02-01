// eslint-disable-next-line no-unused-vars
import { JSONPathNode } from "./node";
// eslint-disable-next-line no-unused-vars
import { Token } from "./token";

/**
 * Base class for all JSONPath selectors.
 *
 * @abstract
 */
export class Selector {
  /** @type {Token} */
  token;

  /**
   * @param {Token} token
   */
  constructor(token) {
    this.token = token;
  }

  /**
   * @abstract
   * @param {JSONPathNode} _node
   * @returns {Array<JSONPathNode>}
   */
  resolve(_node) {
    throw new Error("abstract method");
  }

  /**
   * @abstract
   * @returns {string}
   */
  toString() {
    throw new Error("abstract method");
  }
}

/**
 * Base class for all JSONPath segments.
 *
 * @abstract
 */
export class Segment {
  /** @type {Token} */
  token;

  /** @type {Array<Selector>} */
  selectors;

  /**
   * @param {Token} token
   * @param {Array<Selector>} selectors
   */
  constructor(token, selectors) {
    this.token = token;
    this.selectors = selectors;
  }

  /**
   * @abstract
   * @param {Array<JSONPathNode>} _nodes
   * @returns {Array<JSONPathNode>}
   */
  resolve(_nodes) {
    throw new Error("abstract method");
  }

  /**
   * @abstract
   * @returns {string}
   */
  toString() {
    throw new Error("abstract method");
  }
}

/**
 * Base class for all filter expressions.
 * @abstract
 */
export class Expression {
  /** @type {Token} */
  token;

  /**
   * @param {Token} token
   */
  constructor(token) {
    this.token = token;
  }

  /**
   * @abstract
   * @param {FilterContext} _context
   * @returns {unknown}
   */
  evaluate(_context) {
    throw new Error("abstract method");
  }

  /**
   * @abstract
   */
  toString() {
    throw new Error("abstract method");
  }
}

/**
 * JSONPath child segment.
 *
 * The child segment selects zero or more nodes from immediate children using
 * one or more selectors...
 *
 * @extends Segment
 */
export class ChildSegment extends Segment {
  /**
   * @override
   * @param {Array<JSONPathNode>} nodes
   * @returns {Array<JSONPathNode>}
   */
  resolve(nodes) {
    const result = [];

    for (const node of nodes) {
      for (const selector of this.selectors) {
        result.push(...selector.resolve(node));
      }
    }

    return result;
  }

  /**
   * @override
   * @returns {string}
   */
  toString() {
    // TODO:
    throw new Error("TODO:");
  }
}

/**
 * @extends Segment
 */
export class DescendantSegment {
  /** @type {Token} */
  token;

  /** @type {Array<Selector>} */
  selectors;

  /**
   *
   * @param {Token} token
   * @param {Array<Selector>} selectors
   */
  constructor(token, selectors) {
    this.token = token;
    this.selectors = selectors;
  }

  /**
   *
   * @param {Array<JSONPathNode>} nodes
   * @returns {Array<JSONPathNode>}
   */
  resolve(nodes) {
    const result = [];

    for (const node of nodes) {
      for (const _node of this.#visit(node)) {
        for (const selector of this.selectors) {
          result.push(...selector.resolve(_node));
        }
      }
    }

    return result;
  }

  toString() {
    // TODO:
    throw new Error("TODO:");
  }

  /**
   *
   * @param {JSONPathNode} node
   * @param {number} depth
   */
  #visit(node, depth = 1) {
    const result = [node];

    if (Array.isArray(node.value)) {
      for (let i = 0; i < node.value.length; i++) {
        result.push(
          ...this.#visit(node.new_child(node.value[i], i), depth + 1),
        );
      }
    } else if (isPlainObject(node.value)) {
      for (const [key, value] of Object.entries(node.value)) {
        result.push(...this.#visit(node.new_child(value, key), depth + 1));
      }
    }

    return result;
  }
}

/**
 * @extends Selector
 */
export class NameSelector extends Selector {
  /** @type {string} */
  name;

  /**
   * @param {Token} token
   * @param {string} name
   */
  constructor(token, name) {
    super(token);
    this.name = name;
  }

  /**
   * @param {JSONPathNode} node
   * @returns {Array<JSONPathNode>}
   * @override
   */
  resolve(node) {
    const result = [];

    if (isPlainObject(node.value) && Object.hasOwn(node.value, this.name)) {
      result.push(node.new_child(node.value[this.name], this.name));
    }

    return result;
  }

  /**
   * @returns {string}
   * @override
   */
  toString() {
    // TODO:
    throw new Error("TODO:");
  }
}

/**
 * @extends Selector
 */
export class IndexSelector extends Selector {
  /** @type {number} */
  index;

  /**
   * @param {Token} token
   * @param {number} index
   */
  constructor(token, index) {
    super(token);
    this.index = index;
  }
  /**
   * @param {JSONPathNode} node
   * @returns {Array<JSONPathNode>}
   * @override
   */
  resolve(node) {
    const result = [];

    if (Array.isArray(node.value)) {
      const normIndex = this.#normalizedIndex(node.value.length);
      if (normIndex in node.value) {
        result.push(node.new_child(node.value[normIndex], normIndex));
      }
    }

    return result;
  }

  /**
   * @returns {string}
   * @override
   */
  toString() {
    // TODO:
    throw new Error("TODO:");
  }

  /**
   * @param {number} length
   * @returns {number}
   */
  #normalizedIndex(length) {
    if (this.index < 0 && length >= Math.abs(this.index))
      return length + this.index;
    return this.index;
  }
}

/**
 * @extends Selector
 */
export class SliceSelector extends Selector {
  /** @type {number|undefined} */
  start;

  /** @type {number|undefined} */
  stop;

  /** @type {number|undefined} */
  step;

  /**
   * @param {Token} token
   * @param {number|undefined} start
   * @param {number|undefined} stop
   * @param {number|undefined} step
   */
  constructor(token, start = undefined, stop = undefined, step = undefined) {
    super(token);
    this.start = start;
    this.stop = stop;
    this.step = step;
    // TODO: check range in parser
  }
  /**
   * @param {JSONPathNode} node
   * @returns {Array<JSONPathNode>}
   * @override
   */
  resolve(node) {
    // TODO:
    throw new Error("TODO:");
  }

  /**
   * @returns {string}
   * @override
   */
  toString() {
    // TODO:
    throw new Error("TODO:");
  }
}

/**
 * @extends Selector
 */
export class WildcardSelector extends Selector {
  /**
   * @param {JSONPathNode} node
   * @returns {Array<JSONPathNode>}
   * @override
   */
  resolve(node) {
    // TODO:
    throw new Error("TODO:");
  }

  /**
   * @returns {string}
   * @override
   */
  toString() {
    // TODO:
    throw new Error("TODO:");
  }
}

/**
 * @extends Selector
 */
export class FilterSelector extends Selector {
  /** @type {Expression} */
  expression;

  /**
   * @param {Token} token
   * @param {Expression} expression
   */
  constructor(token, expression) {
    super(token);
    this.expression = expression;
  }
  /**
   * @param {JSONPathNode} node
   * @returns {Array<JSONPathNode>}
   * @override
   */
  resolve(node) {
    // TODO:
    throw new Error("TODO:");
  }

  /**
   * @returns {string}
   * @override
   */
  toString() {
    // TODO:
    throw new Error("TODO:");
  }
}

/**
 * Base class for filter expression literals.
 * @abstract
 * @extends Expression
 */
export class ExpressionLiteral extends Expression {}

/**
 * @extends ExpressionLiteral
 */
export class NullLiteral extends ExpressionLiteral {
  /**
   * @param {FilterContext} _context
   * @return {null}
   * @override
   */
  evaluate(_context) {
    return null;
  }

  /**
   * @returns {string}
   * @override
   */
  toString() {
    // TODO:
    throw new Error("TODO:");
  }
}

/**
 * @extends ExpressionLiteral
 */
export class BooleanLiteral extends ExpressionLiteral {
  /** @type {boolean} */
  value;

  /**
   *
   * @param {Token} token
   * @param {boolean} value
   */
  constructor(token, value) {
    super(token);
    this.value = value;
  }

  /**
   * @param {FilterContext} _context
   * @return {boolean}
   * @override
   */
  evaluate(_context) {
    return this.value;
  }

  /**
   * @returns {string}
   * @override
   */
  toString() {
    // TODO:
    throw new Error("TODO:");
  }
}

/**
 * @extends ExpressionLiteral
 */
export class StringLiteral extends ExpressionLiteral {
  /** @type {string} */
  value;

  /**
   *
   * @param {Token} token
   * @param {string} value
   */
  constructor(token, value) {
    super(token);
    this.value = value;
  }

  /**
   * @param {FilterContext} _context
   * @return {string}
   * @override
   */
  evaluate(_context) {
    return this.value;
  }

  /**
   * @returns {string}
   * @override
   */
  toString() {
    // TODO:
    throw new Error("TODO:");
  }
}

/**
 * @extends ExpressionLiteral
 */
export class NumberLiteral extends ExpressionLiteral {
  /** @type {number} */
  value;

  /**
   *
   * @param {Token} token
   * @param {number} value
   */
  constructor(token, value) {
    super(token);
    this.value = value;
  }

  /**
   * @param {FilterContext} _context
   * @return {number}
   * @override
   */
  evaluate(_context) {
    return this.value;
  }

  /**
   * @returns {string}
   * @override
   */
  toString() {
    // TODO:
    throw new Error("TODO:");
  }
}

/**
 * Base class for all prefix expressions (only logical not for now).
 * @abstract
 * @extends Expression
 */
export class PrefixExpression extends Expression {
  /** @type {Expression} */
  right;

  /**
   *
   * @param {Token} token
   * @param {Expression} right
   */
  constructor(token, right) {
    super(token);
    this.right = right;
  }
}

/**
 * @extends PrefixExpression
 */
export class LogicalNotExpression extends PrefixExpression {
  /**
   * @param {FilterContext} _context
   * @return {boolean}
   * @override
   */
  evaluate(_context) {
    // TODO:
    throw new Error("TODO:");
  }

  /**
   * @returns {string}
   * @override
   */
  toString() {
    // TODO:
    throw new Error("TODO:");
  }
}

/**
 * Base class for all infix expressions (only logical `and` and `or`).
 * @abstract
 * @extends Expression
 */
export class InfixExpression extends Expression {
  /** @type {Expression} */
  left;

  /** @type {Expression} */
  right;

  /**
   *
   * @param {Token} token
   * @param {Expression} left
   * @param {Expression} right
   */
  constructor(token, left, right) {
    super(token);
    this.left = left;
    this.right = right;
  }
}

/**
 * @extends InfixExpression
 */
export class LogicalAndExpression extends InfixExpression {
  /**
   * @param {FilterContext} _context
   * @return {boolean}
   * @override
   */
  evaluate(_context) {
    // TODO:
    throw new Error("TODO:");
  }

  /**
   * @returns {string}
   * @override
   */
  toString() {
    // TODO:
    throw new Error("TODO:");
  }
}

/**
 * @extends InfixExpression
 */
export class LogicalOrExpression extends InfixExpression {
  /**
   * @param {FilterContext} _context
   * @return {boolean}
   * @override
   */
  evaluate(_context) {
    // TODO:
    throw new Error("TODO:");
  }

  /**
   * @returns {string}
   * @override
   */
  toString() {
    // TODO:
    throw new Error("TODO:");
  }
}

/**
 * Base class for all filter queries (absolute and relative).
 * @abstract
 * @extends Expression
 */
export class FilterQuery extends Expression {
  /** @type {JSONPathQuery} */
  query;

  /**
   *
   * @param {Token} token
   * @param {JSONPathQuery} query
   */
  constructor(token, query) {
    super(token);
    this.query = query;
  }
}

/**
 * @extends FilterQuery
 */
export class AbsoluteQuery extends FilterQuery {
  /**
   * @param {FilterContext} _context
   * @return {boolean}
   * @override
   */
  evaluate(_context) {
    // TODO:
    throw new Error("TODO:");
  }

  /**
   * @returns {string}
   * @override
   */
  toString() {
    // TODO:
    throw new Error("TODO:");
  }
}

/**
 * @extends FilterQuery
 */
export class RelativeQuery extends FilterQuery {
  /**
   * @param {FilterContext} _context
   * @return {boolean}
   * @override
   */
  evaluate(_context) {
    // TODO:
    throw new Error("TODO:");
  }

  /**
   * @returns {string}
   * @override
   */
  toString() {
    // TODO:
    throw new Error("TODO:");
  }
}

/**
 * @extends Expression
 */
export class FunctionExtension extends Expression {
  /** @type {string} */
  name;

  /** @type {Array<Expression>} */
  args;

  /**
   *
   * @param {Token} token
   * @param {string} name
   * @param {Array<Expression>} args
   */
  constructor(token, name, args) {
    super(token);
    this.name = name;
    this.args = args;
  }

  /**
   * @param {FilterContext} _context
   * @return {boolean}
   * @override
   */
  evaluate(_context) {
    // TODO:
    throw new Error("TODO:");
  }

  /**
   * @returns {string}
   * @override
   */
  toString() {
    // TODO:
    throw new Error("TODO:");
  }
}

/**
 * @param {unknown} value
 * @returns {value is Record<string, unknown>}
 */
function isPlainObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
