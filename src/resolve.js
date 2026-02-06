var NOTHING = {};

/**
 * Resolve a pre-compiled JSONPath expression against `data`.
 * @param {JSONPathQuery} query A compiled query.
 * @param {object} data Target JSON-like data.
 * @param {JSONPathOptions} options Path parsing and resolution configuration.
 * @returns {Array<JSONPathNode>} An array of nodes found by applying `query` to `data`.
 */
function resolve(query, data, options) {
  var nodes = [{ value: data, location: [], root: data }];
  for (var i = 0, len = query.segments.length; i < len; i++) {
    nodes = resolveSegment(query.segments[i], nodes, options || {});
  }
  return nodes;
}

function resolveSegment(segment, nodes, options) {
  var result = [];
  var selectors = segment.selectors;
  var selectorsLen = selectors.length;
  var nodesLen = nodes.length;

  var i, j, k, m;
  var descLen, newLen;
  var newNodes, descendantNodes;

  switch (segment.kind) {
    case "ChildSegment":
      for (i = 0; i < nodesLen; i++) {
        for (j = 0; j < selectorsLen; j++) {
          newNodes = resolveSelector(selectors[j], nodes[i], options);
          newLen = newNodes.length;
          for (k = 0; k < newLen; k++) {
            result.push(newNodes[k]);
          }
        }
      }
      break;
    case "DescendantSegment":
      for (i = 0; i < nodesLen; i++) {
        descendantNodes = visit(nodes[i], 1);
        descLen = descendantNodes.length;
        for (m = 0; m < descLen; m++) {
          for (j = 0; j < selectorsLen; j++) {
            newNodes = resolveSelector(
              selectors[j],
              descendantNodes[m],
              options
            );
            newLen = newNodes.length;
            for (k = 0; k < newLen; k++) {
              result.push(newNodes[k]);
            }
          }
        }
      }
      break;
  }

  return result;
}

function resolveSelector(selector, node, options) {
  var result = [];
  var value = node.value;

  switch (selector.kind) {
    case "NameSelector":
      if (
        isPlainObject(value) &&
        Object.prototype.hasOwnProperty.call(value, selector.name)
      ) {
        result.push(newChild(node, value[selector.name], selector.name));
      }
      break;
    case "IndexSelector":
      if (isArray(value)) {
        var normIndex = normalizedIndex(selector.index, value.length);
        if (normIndex in value) {
          result.push(newChild(node, value[normIndex], normIndex));
        }
      }
      break;
    case "SliceSelector":
      if (isArray(value)) {
        var sliced = slice(value, selector);
        for (var i = 0, slicedLen = sliced.length; i < slicedLen; i++) {
          result.push(newChild(node, sliced[i][1], sliced[i][0]));
        }
      }
      break;
    case "WildcardSelector":
      if (isArray(value)) {
        for (var i = 0, arrLen = value.length; i < arrLen; i++) {
          result.push(newChild(node, value[i], i));
        }
      } else if (isPlainObject(value)) {
        for (var key in value) {
          if (Object.prototype.hasOwnProperty.call(value, key)) {
            result.push(newChild(node, value[key], key));
          }
        }
      }
      break;
    case "FilterSelector":
      if (isArray(value)) {
        for (var i = 0, arrLen = value.length; i < arrLen; i++) {
          if (
            isTruthy(
              evaluateExpression(selector.expression, {
                value: value[i],
                root: node.root,
                options: options
              })
            )
          ) {
            result.push(newChild(node, value[i], i));
          }
        }
      } else if (isPlainObject(value)) {
        for (var key in value) {
          if (Object.prototype.hasOwnProperty.call(value, key)) {
            if (
              isTruthy(
                evaluateExpression(selector.expression, {
                  value: value[key],
                  root: node.root,
                  options: options
                })
              )
            ) {
              result.push(newChild(node, value[key], key));
            }
          }
        }
      }
      break;
    default:
      throw new JSONPathError("unexpected selector " + selector);
  }

  return result;
}

function evaluateExpression(expr, context) {
  var left;
  var right;

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
      right = evaluateExpression(expr.right, context);
      return isTruthy(left) && isTruthy(right);
    case "LogicalOr":
      left = evaluateExpression(expr.left, context);
      right = evaluateExpression(expr.right, context);
      return isTruthy(left) || isTruthy(right);
    case "EQ":
      left = evaluateExpression(expr.left, context);
      if (isNodeList(left) && left.nodes.length === 1) {
        left = left.nodes[0].value;
      }
      right = evaluateExpression(expr.right, context);
      if (isNodeList(right) && right.nodes.length === 1) {
        right = right.nodes[0].value;
      }
      return eq(left, right);
    case "NE":
      left = evaluateExpression(expr.left, context);
      if (isNodeList(left) && left.nodes.length === 1) {
        left = left.nodes[0].value;
      }
      right = evaluateExpression(expr.right, context);
      if (isNodeList(right) && right.nodes.length === 1) {
        right = right.nodes[0].value;
      }
      return !eq(left, right);
    case "LT":
      left = evaluateExpression(expr.left, context);
      if (isNodeList(left) && left.nodes.length === 1) {
        left = left.nodes[0].value;
      }
      right = evaluateExpression(expr.right, context);
      if (isNodeList(right) && right.nodes.length === 1) {
        right = right.nodes[0].value;
      }
      return lt(left, right);
    case "LE":
      left = evaluateExpression(expr.left, context);
      if (isNodeList(left) && left.nodes.length === 1) {
        left = left.nodes[0].value;
      }
      right = evaluateExpression(expr.right, context);
      if (isNodeList(right) && right.nodes.length === 1) {
        right = right.nodes[0].value;
      }
      return lt(left, right) || eq(left, right);
    case "GT":
      left = evaluateExpression(expr.left, context);
      if (isNodeList(left) && left.nodes.length === 1) {
        left = left.nodes[0].value;
      }
      right = evaluateExpression(expr.right, context);
      if (isNodeList(right) && right.nodes.length === 1) {
        right = right.nodes[0].value;
      }
      return lt(right, left);
    case "GE":
      left = evaluateExpression(expr.left, context);
      if (isNodeList(left) && left.nodes.length === 1) {
        left = left.nodes[0].value;
      }
      right = evaluateExpression(expr.right, context);
      if (isNodeList(right) && right.nodes.length === 1) {
        right = right.nodes[0].value;
      }
      return lt(right, left) || eq(left, right);
    case "AbsoluteQuery":
      return {
        kind: "JSONPathNodeList",
        nodes: resolve(expr.query, context.root, context.options)
      };
    case "RelativeQuery":
      return {
        kind: "JSONPathNodeList",
        nodes: resolve(expr.query, context.value, context.options)
      };
    case "FunctionExtension":
      var func = (context.options.functionExtensions || FUNCTION_EXTENSIONS)[
        expr.name
      ];

      if (!func) {
        throw new JSONPathError(
          "filter function '" + expr.name + "' is undefined"
        );
      }

      var args = expr.args.map(function (arg, i) {
        return unpackNodeList(
          evaluateExpression(arg, context),
          func.argTypes[i]
        );
      });

      return func.call.apply(context, args);
    default:
      break;
  }
}

function visit(node, depth) {
  var result = [node];
  var value = node.value;
  var newChildren;

  if (isArray(value)) {
    for (var i = 0; i < value.length; i++) {
      newChildren = visit(newChild(node, value[i], i), depth + 1);
      for (var j = 0; j < newChildren.length; j++) {
        result.push(newChildren[j]);
      }
    }
  } else if (isPlainObject(value)) {
    for (var key in value) {
      if (Object.prototype.hasOwnProperty.call(value, key)) {
        newChildren = visit(newChild(node, value[key], key), depth + 1);
        for (var i = 0; i < newChildren.length; i++) {
          result.push(newChildren[i]);
        }
      }
    }
  }

  return result;
}

function normalizedIndex(index, length) {
  if (index < 0 && length >= Math.abs(index)) return length + index;
  return index;
}

function slice(value, selector) {
  if (value.length === 0) return [];

  var start = selector.start;
  var stop = selector.stop;
  var step = selector.step;

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

  var sliced = [];

  if (step > 0) {
    for (var i = start; i < stop; i += step) {
      sliced.push([i, value[i]]);
    }
  } else {
    for (var i = start; i > stop; i += step) {
      sliced.push([i, value[i]]);
    }
  }

  return sliced;
}

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
      return arg.nodes[0].value;
    default:
      return arg;
  }
}

function newChild(node, value, key) {
  var newLocation = node.location.slice();
  newLocation.push(key);
  return { value: value, location: newLocation, root: node.root };
}

function isTruthy(value) {
  if (isNodeList(value) && value.nodes.length === 0) {
    return false;
  }

  return !(typeof value === "boolean" && value === false);
}

function isNodeList(value) {
  return value && value.kind === "JSONPathNodeList";
}

function eq(left, right) {
  if (isNodeList(right)) {
    var t = left;
    left = right;
    right = t;
  }

  if (isNodeList(left)) {
    if (isNodeList(right)) {
      if (left.nodes.length === 0 && right.nodes.length === 0) {
        return true;
      }

      if (left.nodes.length === 1 && right.nodes.length === 1) {
        return deepEquals(left.nodes[0].value, right.nodes[0].value);
      }
    }

    if (left.nodes.length === 0) {
      return right === NOTHING;
    }

    if (left.nodes.length === 1) {
      return deepEquals(left.nodes[0].value, right);
    }

    return false;
  }

  if (left === NOTHING && right === NOTHING) {
    return true;
  }

  return deepEquals(left, right);
}

function lt(left, right) {
  if (
    (isString(left) && isString(right)) ||
    (isNumber(left) && isNumber(right))
  )
    return left < right;
  return false;
}

/**
 * Return the canonical JSONPath expression for the given node.
 * @param {JSONPathNode} node
 * @returns {string}
 */
function canonicalPath(node) {
  return (
    "$" +
    node.location
      .map(function (key) {
        if (isString(key)) {
          return "[" + canonicalString(key) + "]";
        }

        return "[" + key + "]";
      })
      .join("")
  );
}

function canonicalString(name) {
  return (
    "'" +
    JSON.stringify(name)
      .slice(1, -1)
      .replace(/\\"/g, '"')
      .replace(/'/g, "\\'") +
    "'"
  );
}
