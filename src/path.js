var NOTHING = {};

/** @type {import("./types").FunctionExtensions} */
const FUNCTION_EXTENSIONS = {};

/**
 *
 * @param {import("./types").JSONPathQuery} query
 * @param {unknown} data
 * @returns {import("./types").JSONPathNodeList}
 */
export function resolve(query, data) {
  /** @type {Array<import("./types").JSONPathNode>} */
  let nodes = [{ value: data, location: [], root: data }];
  for (const segment of query.segments) {
    nodes = resolveSegment(segment, nodes);
  }
  return { kind: "JSONPathNodeList", nodes };
}

/**
 *
 * @param {import("./types").Segment} segment
 * @param {Array<import("./types").JSONPathNode>} nodes
 * @returns {Array<import("./types").JSONPathNode>}
 */
function resolveSegment(segment, nodes) {
  /** @type {Array<import("./types").JSONPathNode>} */
  const result = [];

  switch (segment.kind) {
    case "ChildSegment":
      for (const node of nodes) {
        for (const selector of segment.selectors) {
          result.push(...resolveSelector(selector, node));
        }
      }
      break;
    case "DescendantSegment":
      for (const node of nodes) {
        for (const _node of visit(node)) {
          for (const selector of segment.selectors) {
            result.push(...resolveSelector(selector, _node));
          }
        }
      }
      break;
  }

  return result;
}

/**
 *
 * @param {import("./types").Selector} selector
 * @param {import("./types").JSONPathNode} node
 * @returns {Array<import("./types").JSONPathNode>}
 */
function resolveSelector(selector, node) {
  /** @type {Array<import("./types").JSONPathNode>} */
  const result = [];

  switch (selector.kind) {
    case "NameSelector":
      if (
        isPlainObject(node.value) &&
        Object.hasOwn(node.value, selector.name)
      ) {
        result.push(newChild(node, node.value[selector.name], selector.name));
      }
      break;
    case "IndexSelector":
      if (Array.isArray(node.value)) {
        const normIndex = normalizedIndex(selector.index, node.value.length);
        if (normIndex in node.value) {
          result.push(newChild(node, node.value[normIndex], normIndex));
        }
      }
      break;
    case "SliceSelector":
      if (Array.isArray(node.value)) {
        for (const [i, value] of slice(node.value, selector)) {
          result.push(newChild(node, value, i));
        }
      }
      break;
    case "WildcardSelector":
      if (Array.isArray(node.value)) {
        for (let i = 0; i < node.value.length; i++) {
          result.push(newChild(node, node.value[i], i));
        }
      } else if (isPlainObject(node.value)) {
        for (const [key, value] of Object.entries(node.value)) {
          result.push(newChild(node, value, key));
        }
      }
      break;
    case "FilterSelector":
      if (Array.isArray(node.value)) {
        for (let i = 0; i < node.value.length; i++) {
          if (
            isTruthy(
              evaluateExpression(selector.expression, {
                value: node.value[i],
                root: node.root,
                functionExtensions: FUNCTION_EXTENSIONS,
              }),
            )
          ) {
            result.push(newChild(node, node.value[i], i));
          }
        }
      } else if (isPlainObject(node.value)) {
        for (const [key, value] of Object.entries(node.value)) {
          if (
            isTruthy(
              evaluateExpression(selector.expression, {
                value: value,
                root: node.root,
                functionExtensions: FUNCTION_EXTENSIONS,
              }),
            )
          ) {
            result.push(newChild(node, value, key));
          }
        }
      }
      break;
    default:
      throw new Error(`unexpected selector ${selector}`);
  }

  return result;
}

/**
 *
 * @param {import("./types").Expression} expr
 * @param {import("./types").FilterContext} context
 * @returns {unknown}
 */
function evaluateExpression(expr, context) {
  let left;
  let right;

  switch (expr.kind) {
    case "NullLiteral":
      return null;
    case "BooleanLiteral":
    case "StringLiteral":
    case "NumberLiteral":
      return expr.value;
    case "LogicalNot":
      return !isTruthy(evaluateExpression(expr.expression, context));
    case "LogicalAnd":
      left = evaluateExpression(expr.left, context);
      if (isNodeList(left) && left.nodes.length === 1) {
        left = left.nodes[0]?.value;
      }

      right = evaluateExpression(expr.right, context);
      if (isNodeList(right) && right.nodes.length === 1) {
        right = right.nodes[0]?.value;
      }

      return isTruthy(left) && isTruthy(right);
    case "LogicalOr":
      left = evaluateExpression(expr.left, context);
      if (isNodeList(left) && left.nodes.length === 1) {
        left = left.nodes[0]?.value;
      }

      right = evaluateExpression(expr.right, context);
      if (isNodeList(right) && right.nodes.length === 1) {
        right = right.nodes[0]?.value;
      }

      return isTruthy(left) || isTruthy(right);
    case "EQ":
      left = evaluateExpression(expr.left, context);
      right = evaluateExpression(expr.right, context);
      return eq(left, right);
    case "NE":
      left = evaluateExpression(expr.left, context);
      right = evaluateExpression(expr.right, context);
      return !eq(left, right);
    case "LT":
      left = evaluateExpression(expr.left, context);
      right = evaluateExpression(expr.right, context);
      return lt(left, right);
    case "LE":
      left = evaluateExpression(expr.left, context);
      right = evaluateExpression(expr.right, context);
      return lt(left, right) || eq(left, right);
    case "GT":
      left = evaluateExpression(expr.left, context);
      right = evaluateExpression(expr.right, context);
      return lt(right, left);
    case "GE":
      left = evaluateExpression(expr.left, context);
      right = evaluateExpression(expr.right, context);
      return lt(right, left) || eq(left, right);
    case "AbsoluteQuery":
      return resolve(expr.query, context.root);
    case "RelativeQuery":
      return resolve(expr.query, context.value);
    case "FunctionExtension":
      const func = context.functionExtensions[expr.name];

      if (!func) {
        throw new Error(`filter function '${expr.name}' is undefined`);
      }

      const args = expr.args.map(function (arg, i) {
        unpackNodeList(evaluateExpression(arg, context), func.argTypes[i]);
      });

      return func.call(...args);
    default:
      break;
  }
}

/**
 *
 * @param {import("./types").JSONPathNode} node
 * @param {number} depth
 * @returns
 */
function visit(node, depth = 1) {
  const result = [node];

  if (Array.isArray(node.value)) {
    for (let i = 0; i < node.value.length; i++) {
      result.push(...visit(newChild(node, node.value[i], i), depth + 1));
    }
  } else if (isPlainObject(node.value)) {
    for (const [key, value] of Object.entries(node.value)) {
      result.push(...visit(newChild(node, value, key), depth + 1));
    }
  }

  return result;
}

/**
 * @param {number} index
 * @param {number} length
 * @returns {number}
 */
function normalizedIndex(index, length) {
  if (index < 0 && length >= Math.abs(index)) return length + index;
  return index;
}

/**
 *
 * @param {Array<unknown>} value
 * @param {import("./types").SliceSelector} selector
 * @returns {Array<[number, unknown]>}
 */
function slice(value, selector) {
  if (value.length === 0) return [];

  let start = selector.start;
  let stop = selector.stop;
  let step = selector.step;

  // Handle negative start and stop values
  if (start === undefined || start === null) {
    start = step && step < 0 ? value.length - 1 : 0;
  } else if (start < 0) {
    start = Math.max(value.length + start, 0);
  } else {
    start = Math.min(start, value.length - 1);
  }

  if (stop === undefined || stop === null) {
    stop = step && step < 0 ? -1 : value.length;
  } else if (stop < 0) {
    stop = Math.max(value.length + stop, -1);
  } else {
    stop = Math.min(stop, value.length);
  }

  // Handle step value
  if (step === 0) {
    return [];
  }
  if (!step) {
    step = 1;
  }

  /** @type {Array<[number, unknown]>} */
  const sliced = [];

  if (step > 0) {
    for (let i = start; i < stop; i += step) {
      sliced.push([i, value[i]]);
    }
  } else {
    for (let i = start; i > stop; i += step) {
      sliced.push([i, value[i]]);
    }
  }

  return sliced;
}

/**
 * @param {unknown} arg
 * @param {import("./types").FunctionType|undefined} argType
 * @returns {unknown}
 */
function unpackNodeList(arg, argType) {
  if (argType === "NodesType") {
    return arg;
  }

  if (!isNodeList(arg)) {
    return arg;
  }

  switch (arg.nodes.length) {
    case 0:
      return NOTHING;
    case 1:
      return arg.nodes[0]?.value;
    default:
      return arg;
  }
}

/**
 *
 * @param {import("./types").JSONPathNode} node
 * @param {unknown} value
 * @param {string|number} key
 * @returns {import("./types").JSONPathNode}
 */
function newChild(node, value, key) {
  return { value, location: [...node.location, key], root: node.root };
}

/**
 * @param {unknown} value
 * @returns {value is Record<string, unknown>}
 */
function isPlainObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 *
 * @param {unknown} value
 * @returns {value is string}
 */
function isString(value) {
  return typeof value === "string";
}

/**
 *
 * @param {unknown} value
 * @returns {value is number}
 */
function isNumber(value) {
  return typeof value === "number";
}

/**
 *
 * @param {unknown} value
 * @returns {boolean}
 */
function isTruthy(value) {
  if (isNodeList(value) && value.nodes.length === 0) {
    return false;
  }

  return !(typeof value === "boolean" && value === false);
}

/**
 *
 * @param {any} value
 * @returns {value is import("./types").JSONPathNodeList}
 */
function isNodeList(value) {
  return value.kind === "JSONPathNodeList";
}

/**
 *
 * @param {unknown} left
 * @param {unknown} right
 * @returns {boolean}
 */
function eq(left, right) {
  if (isNodeList(right)) [left, right] = [right, left];

  if (isNodeList(left)) {
    if (isNodeList(right)) {
      if (left.nodes.length === 0 && right.nodes.length === 0) {
        return true;
      }

      if (left.nodes.length === 1 && right.nodes.length === 1) {
        return deepEquals(left.nodes[0]?.value, right.nodes[0]?.value);
      }
    }

    if (left.nodes.length === 0) {
      return right === NOTHING;
    }

    if (left.nodes.length === 1) {
      return deepEquals(left.nodes[0]?.value, right);
    }

    return false;
  }

  if (left === NOTHING && right === NOTHING) {
    return true;
  }

  return deepEquals(left, right);
}

/**
 *
 * @param {unknown} left
 * @param {unknown} right
 * @returns {boolean}
 */
function lt(left, right) {
  if (
    (isString(left) && isString(right)) ||
    (isNumber(left) && isNumber(right))
  )
    return left < right;
  return false;
}

/**
 *
 * @param {unknown} a
 * @param {unknown} b
 * @returns {boolean}
 */
function deepEquals(a, b) {
  if (a === b) {
    return true;
  }

  if (Array.isArray(a)) {
    if (Array.isArray(b)) {
      if (a.length !== b.length) {
        return false;
      }
      for (let i = 0; i < a.length; i++) {
        if (!deepEquals(a[i], b[i])) {
          return false;
        }
      }
      return true;
    }
    return false;
  } else if (isPlainObject(a) && isPlainObject(b)) {
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);

    if (keysA.length !== keysB.length) {
      return false;
    }

    for (const key of keysA) {
      if (!deepEquals(a[key], b[key])) {
        return false;
      }
    }

    return true;
  }

  return false;
}
