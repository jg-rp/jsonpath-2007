// eslint-disable-next-line no-unused-vars
import { JSONPathNode } from "./node";
// eslint-disable-next-line no-unused-vars
import { Token } from "./token";

/**
 * @param {unknown} value
 * @returns {value is Record<string, unknown>}
 */
function isPlainObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

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
   * @param {JSONPathNode} node
   * @returns {Array<JSONPathNode>}
   */
  resolve(node) {}
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
  }
}

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

export class NameSelector {
  /** @type {Token} */
  token;

  /** @type {string} */
  name;

  /**
   * @param {Token} token
   * @param {string} name
   */
  constructor(token, name) {
    this.token = token;
    this.name = name;
  }

  /**
   * @param {JSONPathNode} node
   * @returns {Array<JSONPathNode>}
   */
  resolve(node) {
    const result = [];

    if (isPlainObject(node.value) && Object.hasOwn(node.value, this.name)) {
      result.push(node.new_child(node.value[this.name], this.name));
    }

    return result;
  }

  toString() {
    // TODO:
  }
}

export class IndexSelector {
  /** @type {Token} */
  token;

  /** @type {number} */
  index;

  /**
   * @param {Token} token
   * @param {number} index
   */
  constructor(token, index) {
    this.token = token;
    this.index = index;
  }
  /**
   * @param {JSONPathNode} node
   * @returns {Array<JSONPathNode>}
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

  toString() {
    // TODO:
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

export class SliceSelector {
  /** @type {Token} */
  token;

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
    this.token = token;
    this.start = start;
    this.stop = stop;
    this.step = step;
    // TODO: check range in parser
  }
  /**
   * @param {JSONPathNode} node
   * @returns {Array<JSONPathNode>}
   */
  resolve(node) {
    // TODO:
    return [];
  }

  toString() {
    // TODO:
  }
}

export class WildcardSelector {
  /** @type {Token} */
  token;

  /**
   * @param {Token} token
   */
  constructor(token) {
    this.token = token;
  }
  /**
   * @param {JSONPathNode} node
   * @returns {Array<JSONPathNode>}
   */
  resolve(node) {
    // TODO:
    return [];
  }

  toString() {
    // TODO:
  }
}

export class FilterSelector {
  /** @type {Token} */
  token;

  /** @type {Expression} */
  expression;

  /**
   * @param {Token} token
   * @param {Expression} expression
   */
  constructor(token, expression) {
    this.token = token;
    this.expression = expression;
  }
  /**
   * @param {JSONPathNode} node
   * @returns {Array<JSONPathNode>}
   */
  resolve(node) {
    // TODO:
    return [];
  }

  toString() {
    // TODO:
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
    if (new.target === Expression) {
      throw new Error("Expression is abstract and cannot be instantiated");
    }
  }

  /**
   * @abstract
   * @param {FilterContext} context
   * @returns {unknown}
   */
  evaluate(context) {
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
 * @abstract
 * @extends Expression
 */
export class ExpressionLiteral extends Expression {}

/**
 * @extends ExpressionLiteral
 */
export class NullLiteral extends ExpressionLiteral {
  /** @override */
  evaluate(context) {
    return null;
  }

  /** @override */
  toString() {
    return "null";
  }
}
