var NOTHING = {};

// TODO: "cache" array length in loop init
// TODO: "cache" node.value to avoid repeated resolve
// TODO: use `hasOwnProperty` guard on all `for ... in`

function resolve(query, data) {
  var nodes = [{ value: data, location: [], root: data }];
  for (var segment in query.segments) {
    nodes = resolveSegment(query.segments[segment], nodes);
  }
  return nodes;
}

function resolveSegment(segment, nodes) {
  var result = [];
  var selectors = segment.selectors;
  var selLen = selectors.length;
  var nodesLen = nodes.length;

  // TODO: change this back
  var iNode, iSelector, iNewNode, iDescendant;
  var descLen, newLen;
  var newNodes, descendantNodes;

  switch (segment.kind) {
    case "ChildSegment":
      for (iNode = 0; iNode < nodesLen; iNode++) {
        for (iSelector = 0; iSelector < selLen; iSelector++) {
          newNodes = resolveSelector(selectors[iSelector], nodes[iNode]);
          newLen = newNodes.length;
          for (iNewNode = 0; iNewNode < newLen; iNewNode++) {
            result.push(newNodes[iNewNode]);
          }
        }
      }
      break;
    case "DescendantSegment":
      for (iNode = 0; iNode < nodesLen; iNode++) {
        descendantNodes = visit(nodes[iNode], 1);
        descLen = descendantNodes.length;
        for (iDescendant = 0; iDescendant < descLen; iDescendant++) {
          for (iSelector = 0; iSelector < selLen; iSelector++) {
            newNodes = resolveSelector(
              selectors[iSelector],
              descendantNodes[iDescendant]
            );
            newLen = newNodes.length;
            for (iNewNode = 0; iNewNode < newLen; iNewNode++) {
              result.push(newNodes[iNewNode]);
            }
          }
        }
      }
      break;
  }

  return result;
}

function resolveSelector(selector, node) {
  var result = [];

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
        var normIndex = normalizedIndex(selector.index, node.value.length);
        if (normIndex in node.value) {
          result.push(newChild(node, node.value[normIndex], normIndex));
        }
      }
      break;
    case "SliceSelector":
      if (Array.isArray(node.value)) {
        var sliced = slice(node.value, selector);
        for (var i = 0, slicedLen = sliced.length; i < slicedLen; i++) {
          result.push(newChild(node, sliced[i][1], sliced[i][0]));
        }
      }
      break;
    case "WildcardSelector":
      if (Array.isArray(node.value)) {
        for (var i = 0, arrLen = node.value.length; i < arrLen; i++) {
          result.push(newChild(node, node.value[i], i));
        }
      } else if (isPlainObject(node.value)) {
        for (var key in node.value) {
          if (Object.hasOwn(node.value, key)) {
            result.push(newChild(node, node.value[key], key));
          }
        }
      }
      break;
    case "FilterSelector":
      if (Array.isArray(node.value)) {
        for (var i = 0, arrLen = node.value.length; i < arrLen; i++) {
          if (
            isTruthy(
              evaluateExpression(selector.expression, {
                value: node.value[i],
                root: node.root,
                functionExtensions: FUNCTION_EXTENSIONS
              })
            )
          ) {
            result.push(newChild(node, node.value[i], i));
          }
        }
      } else if (isPlainObject(node.value)) {
        for (var key in node.value) {
          if (Object.hasOwn(node.value, key)) {
            var value = node.value[key];
            if (
              isTruthy(
                evaluateExpression(selector.expression, {
                  value: value,
                  root: node.root,
                  functionExtensions: FUNCTION_EXTENSIONS
                })
              )
            ) {
              result.push(newChild(node, value, key));
            }
          }
        }
      }
      break;
    default:
      throw new Error("unexpected selector " + selector);
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
        nodes: resolve(expr.query, context.root)
      };
    case "RelativeQuery":
      return {
        kind: "JSONPathNodeList",
        nodes: resolve(expr.query, context.value)
      };
    case "FunctionExtension":
      var func = context.functionExtensions[expr.name];

      if (!func) {
        throw new Error("filter function '" + expr.name + "' is undefined");
      }

      var args = expr.args.map(function (arg, i) {
        return unpackNodeList(
          evaluateExpression(arg, context),
          func.argTypes[i]
        );
      });

      return func.call.apply(null, args);
    default:
      break;
  }
}

function visit(node, depth) {
  var result = [node];
  var newChildren;

  if (Array.isArray(node.value)) {
    for (var i = 0; i < node.value.length; i++) {
      newChildren = visit(newChild(node, node.value[i], i), depth + 1);
      for (var j = 0; j < newChildren.length; j++) {
        result.push(newChildren[j]);
      }
    }
  } else if (isPlainObject(node.value)) {
    for (var key in node.value) {
      if (Object.hasOwn(node.value, key)) {
        newChildren = visit(newChild(node, node.value[key], key), depth + 1);
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

function isPlainObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isString(value) {
  return typeof value === "string";
}

function isNumber(value) {
  return typeof value === "number";
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

function deepEquals(a, b) {
  if (a === b) {
    return true;
  }

  if (Array.isArray(a)) {
    if (Array.isArray(b)) {
      if (a.length !== b.length) {
        return false;
      }
      for (var i = 0; i < a.length; i++) {
        if (!deepEquals(a[i], b[i])) {
          return false;
        }
      }
      return true;
    }
    return false;
  } else if (isPlainObject(a) && isPlainObject(b)) {
    var keysA = Object.keys(a);
    var keysB = Object.keys(b);

    if (keysA.length !== keysB.length) {
      return false;
    }

    for (var i = 0, len = keysA.length; i < len; i++) {
      var key = keysA[i];
      if (!deepEquals(a[key], b[key])) {
        return false;
      }
    }

    return true;
  }

  return false;
}

var CountFunctionExtension = {
  argTypes: ["NodesType"],
  returnType: "ValueType",
  call: function (nodeList) {
    return nodeList.nodes.length;
  }
};

var LengthFunctionExtension = {
  argTypes: ["ValueType"],
  returnType: "ValueType",
  call: function (value) {
    if (value === NOTHING) return NOTHING;
    if (Array.isArray(value) || isString(value)) return value.length;
    if (isPlainObject(value)) return Object.keys(value).length;
    return NOTHING;
  }
};

var MatchFunctionExtension = {
  argTypes: ["ValueType", "ValueType"],
  returnType: "LogicalType",
  call: function (value, pattern) {
    if (!isString(value) || !isString(pattern)) {
      return false;
    }

    try {
      // TODO: cache
      var re = new RegExp(fullMatch(pattern), "u");
      return re.test(value);
    } catch (error) {
      return false;
    }
  }
};

var SearchFunctionExtension = {
  argTypes: ["ValueType", "ValueType"],
  returnType: "LogicalType",
  call: function (value, pattern) {
    if (!isString(value) || !isString(pattern)) {
      return false;
    }

    try {
      // TODO: cache
      var re = new RegExp(mapRegexp(pattern), "u");
      return !!value.match(re);
    } catch (error) {
      return false;
    }
  }
};

var ValueFunctionExtension = {
  argTypes: ["NodesType"],
  returnType: "ValueType",
  call: function (nodeList) {
    if (nodeList.nodes.length === 1) return nodeList.nodes[0].value;
    return NOTHING;
  }
};

function mapRegexp(pattern) {
  var escaped = false;
  var charClass = false;
  var parts = [];
  var ch = "";
  for (var i = 0, len = pattern.length; i < len; i++) {
    ch = pattern[i];

    if (escaped) {
      parts.push(ch);
      escaped = false;
      continue;
    }

    switch (ch) {
      case ".":
        if (!charClass) {
          parts.push("(?:(?![\r\n])\\P{Cs}|\\p{Cs}\\p{Cs})");
        } else {
          parts.push(ch);
        }
        break;
      case "\\":
        escaped = true;
        parts.push(ch);
        break;
      case "[":
        charClass = true;
        parts.push(ch);
        break;
      case "]":
        charClass = false;
        parts.push(ch);
        break;
      default:
        parts.push(ch);
        break;
    }
  }
  return parts.join("");
}

function fullMatch(pattern) {
  var parts = [];
  var explicitCaret = pattern.startsWith("^");
  var explicitDollar = pattern.endsWith("$");
  if (!explicitCaret && !explicitDollar) parts.push("^(?:");
  parts.push(mapRegexp(pattern));
  if (!explicitCaret && !explicitDollar) parts.push(")$");
  return parts.join("");
}

var FUNCTION_EXTENSIONS = {
  count: CountFunctionExtension,
  length: LengthFunctionExtension,
  match: MatchFunctionExtension,
  search: SearchFunctionExtension,
  value: ValueFunctionExtension
};

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
      .replaceAll('\\"', '"')
      .replaceAll("'", "\\'") +
    "'"
  );
}
