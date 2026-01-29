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
 * @typedef {ChildSegment|DescendantSegment} Segment
 * @typedef {NameSelector|IndexSelector|SliceSelector|WildcardSelector|FilterSelector} Selector
 */

export class ChildSegment {
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
      for (const selector of this.selectors) {
        result.push(...selector.resolve(node));
      }
    }

    return result;
  }

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
