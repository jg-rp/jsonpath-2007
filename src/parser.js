var MAX_INDEX = Math.pow(2, 53) - 1;
var MIN_INDEX = -Math.pow(2, 53) + 1;

var P = {
  LOWEST: 1,
  LOGICAL_OR: 3,
  LOGICAL_AND: 4,
  RELATIONAL: 5,
  PREFIX: 7
};

/** @type {Array<number>} */
var PRECEDENCES = [];
PRECEDENCES[T.AND] = P.LOGICAL_AND;
PRECEDENCES[T.OR] = P.LOGICAL_OR;
PRECEDENCES[T.NOT] = P.PREFIX;
PRECEDENCES[T.EQ] = P.RELATIONAL;
PRECEDENCES[T.GE] = P.RELATIONAL;
PRECEDENCES[T.GT] = P.RELATIONAL;
PRECEDENCES[T.LE] = P.RELATIONAL;
PRECEDENCES[T.LT] = P.RELATIONAL;
PRECEDENCES[T.NE] = P.RELATIONAL;

/** @type {Array<boolean>} */
var BINARY_OPERATORS = [];
BINARY_OPERATORS[T.AND] = true;
BINARY_OPERATORS[T.OR] = true;
BINARY_OPERATORS[T.EQ] = true;
BINARY_OPERATORS[T.GE] = true;
BINARY_OPERATORS[T.GT] = true;
BINARY_OPERATORS[T.LE] = true;
BINARY_OPERATORS[T.LT] = true;
BINARY_OPERATORS[T.NE] = true;

/** @type {Array<boolean>} */
var COMPARISON_OPERATORS = [];
COMPARISON_OPERATORS[T.EQ] = true;
COMPARISON_OPERATORS[T.GE] = true;
COMPARISON_OPERATORS[T.GT] = true;
COMPARISON_OPERATORS[T.LE] = true;
COMPARISON_OPERATORS[T.LT] = true;
COMPARISON_OPERATORS[T.NE] = true;

function parse(tokens) {
  var state = { tokens: tokens, pos: 0 };
  eat(state, T.DOLLAR);
  var segments = parseSegments(state);
  eat(state, T.EOI);
  return { segments: segments };
}

function parseSegments(state) {
  var segments = [];
  var token;
  var selectors;

  loop: for (;;) {
    switch (peek(state).kind) {
      case T.TRIVIA:
        state.pos += 1;
        if (peek(state).kind === T.EOI) {
          throw new Error("unexpected trailing whitespace");
        }
        break;
      case T.DOUBLE_DOT:
        token = next(state);
        selectors = parseDescendantSelectors(state);
        segments.push({
          kind: "DescendantSegment",
          token: token,
          selectors: selectors
        });
        break;
      case T.DOT:
        token = next(state);
        selectors = [parseShorthandSelector(state)];
        segments.push({
          kind: "ChildSegment",
          token: token,
          selectors: selectors
        });
        break;
      case T.LEFT_BRACKET:
        token = peek(state);
        selectors = parseBracketedSelectors(state);
        segments.push({
          kind: "ChildSegment",
          token: token,
          selectors: selectors
        });
        break;
      default:
        break loop;
    }
  }

  return segments;
}

function parseDescendantSelectors(state) {
  switch (peek(state).kind) {
    case T.NAME:
    case T.ASTERISK:
      return [parseShorthandSelector(state)];
    case T.LEFT_BRACKET:
      return parseBracketedSelectors(state);
    default:
      var message = "expected a selector, found " + peek(state);
      throw new Error(message);
  }
}

function parseShorthandSelector(state) {
  var token;

  switch (peek(state).kind) {
    case T.NAME:
      token = next(state);
      return { kind: "NameSelector", token: token, name: token.value };
    case T.ASTERISK:
      token = next(state);
      return { kind: "WildcardSelector", token: token };
    default:
      var message = "expected a shorthand selector, found " + peek(state);
      throw new Error(message);
  }
}

function parseBracketedSelectors(state) {
  var startToken = eat(state, T.LEFT_BRACKET);
  var selectors = [];
  var token;

  loop: for (;;) {
    skip(state, T.TRIVIA);

    switch (peek(state).kind) {
      case T.RIGHT_BRACKET:
        break loop;
      case T.INDEX:
        selectors.push(parseIndexOrSlice(state));
        break;
      case T.DOUBLE_QUOTED_STRING:
      case T.SINGLE_QUOTED_STRING:
      case T.DOUBLE_QUOTED_ESC_STRING:
      case T.SINGLE_QUOTED_ESC_STRING:
        token = next(state);
        selectors.push({
          kind: "NameSelector",
          token: token,
          name: decodeStringLiteral(token)
        });
        break;
      case T.COLON:
        selectors.push(parseSliceSelector(state));
        break;
      case T.ASTERISK:
        selectors.push({ kind: "WildcardSelector", token: next(state) });
        break;
      case T.QUESTION:
        selectors.push(parseFilterSelector(state));
        break;
      case T.EOI:
        throw new Error("unexpected end of query");
      default:
        var message = "unexpected " + token + "in bracketed selection";
        throw new Error(message);
    }

    skip(state, T.TRIVIA);

    switch (peek(state).kind) {
      case T.EOI:
        throw new Error("unexpected end of selector list");
      case T.RIGHT_BRACKET:
        break loop;
      default:
        skip(state, T.TRIVIA);
        eat(state, T.COMMA);
        if (peek(state).kind === T.RIGHT_BRACKET) {
          throw new Error("unexpected trailing comma");
        }
        break;
    }
  }

  skip(state, T.TRIVIA);
  eat(state, T.RIGHT_BRACKET);

  if (selectors.length === 0) {
    throw new Error("unexpected empty segment");
  }

  return selectors;
}

function parseIndexOrSlice(state) {
  var token = eat(state, T.INDEX);
  var index = parseIJsonInt(token);

  skip(state, T.TRIVIA);

  if (peek(state).kind !== T.COLON) {
    return { kind: "IndexSelector", token: token, index: index };
  }

  var stop = undefined;
  var step = undefined;

  eat(state, T.COLON);
  skip(state, T.TRIVIA);

  if (peek(state).kind === T.INDEX) {
    stop = parseIJsonInt(next(state));
    skip(state, T.TRIVIA);
  }

  if (peek(state).kind === T.COLON) {
    next(state);
    skip(state, T.TRIVIA);

    if (peek(state).kind === T.INDEX) {
      step = parseIJsonInt(next(state));
    }
  }

  return {
    kind: "SliceSelector",
    token: token,
    start: index,
    stop: stop,
    step: step
  };
}

function parseSliceSelector(state) {
  var token = eat(state, T.COLON);
  skip(state, T.TRIVIA);

  var stop = undefined;
  var step = undefined;

  if (peek(state).kind === T.INDEX) {
    stop = parseIJsonInt(next(state));
    skip(state, T.TRIVIA);
  }

  if (peek(state).kind === T.COLON) {
    next(state);
    skip(state, T.TRIVIA);

    if (peek(state).kind === T.INDEX) {
      step = parseIJsonInt(next(state));
    }
  }

  return {
    kind: "SliceSelector",
    token: token,
    start: undefined,
    stop: stop,
    step: step
  };
}

function parseFilterSelector(state) {
  var token = eat(state, T.QUESTION);
  var expr = parseFilterExpression(state, P.LOWEST);
  throwForNotCompared(expr, FUNCTION_EXTENSIONS);
  return { kind: "FilterSelector", token: token, expression: expr };
}

function parseFilterExpression(state, precedence) {
  var left = parsePrimary(state);
  var peeked;

  for (;;) {
    skip(state, T.TRIVIA);
    peeked = peek(state);
    if (
      peeked.kind == T.EOI ||
      peeked.kind == T.RIGHT_BRACKET ||
      !BINARY_OPERATORS[peeked.kind] ||
      (PRECEDENCES[peeked.kind] || P.LOWEST) < precedence
    ) {
      break;
    }

    left = parseInfixExpression(state, left);
  }

  return left;
}

function parseFunctionExpression(state) {
  var startToken = eat(state, T.NAME);
  eat(state, T.LEFT_PAREN);

  var args = [];
  var expr;

  while (peek(state).kind != T.RIGHT_PAREN) {
    expr = parsePrimary(state);
    skip(state, T.TRIVIA);

    while (!!BINARY_OPERATORS[peek(state).kind]) {
      expr = parseInfixExpression(state, expr);
    }

    args.push(expr);

    if (peek(state).kind !== T.RIGHT_PAREN) {
      skip(state, T.TRIVIA);
      eat(state, T.COMMA);
    }
  }

  skip(state, T.TRIVIA);
  eat(state, T.RIGHT_PAREN);
  validateFunctionSignature(startToken, args, FUNCTION_EXTENSIONS);

  return {
    kind: "FunctionExtension",
    token: startToken,
    name: startToken.value,
    arg: args
  };
}

function parsePrimary(state) {
  skip(state, T.TRIVIA);
  var peeked = peek(state);
  var token;

  switch (peeked.kind) {
    case T.SINGLE_QUOTED_STRING:
    case T.DOUBLE_QUOTED_STRING:
    case T.SINGLE_QUOTED_ESC_STRING:
    case T.DOUBLE_QUOTED_ESC_STRING:
      token = next(state);
      return {
        kind: "StringLiteral",
        token: token,
        value: decodeStringLiteral(token)
      };
    case T.NAME:
      if (peeked.value == "null") {
        return { kind: "NullLiteral", token: next(state) };
      }
      if (peeked.value == "false") {
        return { kind: "BooleanLiteral", token: next(state), value: false };
      }
      if (peeked.value == "true") {
        return { kind: "BooleanLiteral", token: next(state), value: true };
      }
      return parseFunctionExpression(state);
    case T.LEFT_PAREN:
      return parseGroupedExpression(state);
    case T.INDEX:
    case T.INTEGER:
    case T.FLOAT:
      return parseNumberLiteral(state);
    case T.DOLLAR:
      return parseAbsoluteQuery(state);
    case T.AT:
      return parseRelativeQuery(state);
    case T.NOT:
      return parsePrefixExpression(state);
    default:
      token = next(state);
      throw new Error("unexpected " + token.value);
  }
}

function parseGroupedExpression(state) {
  eat(state, T.LEFT_PAREN);
  var expr = parseFilterExpression(state, P.LOWEST);
  var peeked;

  for (;;) {
    skip(state, T.TRIVIA);
    peeked = peek(state);
    if (peeked.kind == T.RIGHT_PAREN) {
      break;
    }

    if (peeked.kind === T.EOI) {
      throw new Error("unbalanced parentheses");
    }

    expr = parseInfixExpression(state, expr);
  }

  skip(state, T.TRIVIA);
  eat(state, T.RIGHT_PAREN);
  return expr;
}

function parsePrefixExpression(state) {
  var token = eat(state, T.NOT);
  return {
    kind: "LogicalNot",
    token: token,
    expression: parseFilterExpression(state, P.PREFIX)
  };
}

function parseInfixExpression(state, left) {
  var token = next(state);
  var precedence = PRECEDENCES[token.kind] || P.LOWEST;
  var right = parseFilterExpression(state, precedence);

  if (COMPARISON_OPERATORS[token.kind]) {
    throwForNonComparable(left, FUNCTION_EXTENSIONS);
    throwForNonComparable(right, FUNCTION_EXTENSIONS);

    switch (token.kind) {
      case T.EQ:
        return { kind: "EQ", token: token, left: left, right: right };
      case T.NE:
        return { kind: "NE", token: token, left: left, right: right };
      case T.LT:
        return { kind: "LT", token: token, left: left, right: right };
      case T.LE:
        return { kind: "LE", token: token, left: left, right: right };
      case T.GT:
        return { kind: "GT", token: token, left: left, right: right };
      case T.GE:
        return { kind: "GE", token: token, left: left, right: right };
      default:
        throw new Error("expected an infix operator");
    }
  } else {
    throwForNotCompared(left, FUNCTION_EXTENSIONS);
    throwForNotCompared(right, FUNCTION_EXTENSIONS);

    switch (token.kind) {
      case T.AND:
        return { kind: "LogicalAnd", token: token, left: left, right: right };
      case T.OR:
        return { kind: "LogicalOr", token: token, left: left, right: right };
      default:
        throw new Error("expected an infix operator");
    }
  }
}

function parseNumberLiteral(state) {
  var token = next(state);
  var value = token.value;

  if (value.startsWith("0") && value.length > 1) {
    throw new Error("invalid integer literal");
  }

  var num = Number(value);

  if (isNaN(num)) {
    throw new Error("invalid integer literal");
  }

  return { kind: "NumberLiteral", token: token, value: num };
}

function parseAbsoluteQuery(state) {
  var token = eat(state, T.DOLLAR);
  var segments = parseSegments(state);
  return { kind: "AbsoluteQuery", token: token, query: { segments: segments } };
}

function parseRelativeQuery(state) {
  var token = eat(state, T.AT);
  var segments = parseSegments(state);
  return { kind: "RelativeQuery", token: token, query: { segments: segments } };
}

function next(state) {
  if (state.pos < state.tokens.length) {
    return state.tokens[state.pos++] || new Token(T.EOI, "", -1);
  }
  return new Token(T.EOI, "", -1);
}

function peek(state) {
  return state.tokens[state.pos] || new Token(T.EOI, "", -1);
}

function eat(state, kind) {
  var token = state.tokens[state.pos++] || new Token(T.EOI, "", -1);
  if (token.kind !== kind) {
    var message = "expected " + kind + ", found " + token.kind;
    throw new Error(message);
  }
  return token;
}

function skip(state, kind) {
  if (peek(state).kind === kind) {
    state.pos += 1;
  }
}

function parseIJsonInt(token) {
  var value = token.value;

  if (value.length > 1 && (value.startsWith("0") || value.startsWith("-0"))) {
    throw new Error("invalid index '" + value + "'");
  }

  var num = Number(value);

  if (isNaN(num)) {
    throw new Error("invalid index '" + value + "'");
  }

  if (num < MIN_INDEX || num > MAX_INDEX) {
    throw new Error("index out of range");
  }

  return num;
}

function decodeStringLiteral(token) {
  switch (token.kind) {
    case T.SINGLE_QUOTED_STRING:
      return token.value;
    case T.DOUBLE_QUOTED_STRING:
      return token.value;
    case T.SINGLE_QUOTED_ESC_STRING:
      return unescapeString(
        token.value.replaceAll('"', '\\"').replaceAll("\\'", "'"),
        token
      );
    case T.DOUBLE_QUOTED_ESC_STRING:
      return unescapeString(token.value, token);
    default:
      throw new Error("expected a string literal, found " + token);
  }
}

function unescapeString(value, token) {
  var result = [];
  var length = value.length;

  var ch = "";
  var index = 0;
  var codePoint;
  var chAndIndex;

  while (index < length) {
    ch = value[index] || "";

    if (ch !== "\\") {
      codePoint = ch.charCodeAt(0);
      if (codePoint === undefined || codePoint <= 0x1f) {
        throw new Error("invalid character");
      }

      result.push(ch);
      index += 1;
      continue;
    }

    index += 1;
    ch = value[index] || "";

    switch (ch) {
      case '"':
        result.push('"');
        break;
      case "\\":
        result.push("\\");
        break;
      case "/":
        result.push("/");
        break;
      case "b":
        result.push("\x08");
        break;
      case "f":
        result.push("\x0C");
        break;
      case "n":
        result.push("\n");
        break;
      case "r":
        result.push("\r");
        break;
      case "t":
        result.push("\t");
        break;
      case "u":
        index += 1;
        chAndIndex = decodeSlashU(value, index, token);
        result.push(chAndIndex[0]);
        index = chAndIndex[1];
        break;
      default:
        throw new Error("unknown escape sequence");
    }

    index += 1;
  }

  return result.join("");
}

function decodeSlashU(value, index, token) {
  var length = value.length;

  if (index + 3 >= length) {
    throw new Error("incomplete escape sequence");
  }

  var digits = value.slice(index, index + 4);
  if (!/^[a-fA-F0-9]{4}$/.test(digits)) {
    throw new Error("invalid escape sequence");
  }

  var codePoint = parseInt(digits, 16);

  if (isNaN(codePoint)) {
    throw new Error("unexpected low surrogate");
  }

  if (isLowSurrogate(codePoint)) {
    throw new Error("invalid escape sequence");
  }

  if (isHighSurrogate(codePoint)) {
    if (value.startsWith("\\u", index + 6)) {
      throw new Error("invalid escape sequence");
    }

    digits = value.slice(index + 6, index + 10);
    if (!/^[a-fA-F0-9]{4}$/.test(digits)) {
      throw new Error("invalid escape sequence");
    }

    var lowSurrogate = parseInt(digits, 16);

    if (!isLowSurrogate(lowSurrogate)) {
      throw new Error("invalid escape sequence");
    }

    codePoint =
      0x10000 + (((codePoint & 0x03ff) << 10) | (lowSurrogate & 0x03ff));

    index += 9;
  } else {
    index += 3;
  }

  if (isNaN(codePoint) || codePoint <= 0x1f) {
    throw new Error("invalid escape sequence");
  }

  return [String.fromCodePoint(codePoint), index];
}

function isHighSurrogate(codepoint) {
  return codepoint >= 0xd800 && codepoint <= 0xdbff;
}

function isLowSurrogate(codepoint) {
  return codepoint >= 0xdc00 && codepoint <= 0xdfff;
}

function throwForNotCompared(expr, functionExtensions) {
  if (isLiteralExpression(expr)) {
    throw new Error("filter expression literals must be compared");
  }

  if (expr.kind === "FunctionExtension") {
    var func = functionExtensions[expr.name];

    if (func === undefined) {
      throw new Error("unknown function extension " + expr.name);
    }

    if (func.returnType === "ValueType") {
      throw new Error("result of " + expr.name + "() must be compared");
    }
  }
}

function throwForNonComparable(expr, functionExtensions) {
  if (isFilterQuery(expr) && !isSingularQuery(expr.query)) {
    throw new Error("non-singular query is not comparable");
  }

  if (expr.kind === "FunctionExtension") {
    var func = functionExtensions[expr.name];

    if (func === undefined) {
      throw new Error("unknown function extension " + expr.name);
    }

    if (func.returnType !== "ValueType") {
      throw new Error("result of " + expr.name + "() must be compared");
    }
  }
}

function validateFunctionSignature(token, args, functionExtensions) {
  var func = functionExtensions[token.value];
  if (func === undefined) {
    throw new Error("unknown function extension " + token.value);
  }

  var expectedArgCount = func.argTypes.length;

  if (args.length !== expectedArgCount) {
    var message = [
      "",
      token.value,
      " takes ",
      expectedArgCount,
      " arguments",
      expectedArgCount === 1 ? " (" : "s (",
      args.length,
      " given)"
    ].join("");

    throw new Error(message);
  }

  for (var i = 0; i < expectedArgCount; i++) {
    var arg = args[i];

    switch (func.argTypes[i]) {
      case "ValueType":
        if (
          !(
            isLiteralExpression(arg) ||
            (isFilterQuery(arg) && isSingularQuery(arg.query)) ||
            (arg.kind === "FunctionExtension" &&
              functionExtensions[arg.name].returnType === "ValueType")
          )
        ) {
          throw new Error(
            "" + token.value + "() argument " + i + "must be of ValueType"
          );
        }
        break;
      case "LogicalType":
        if (!(isFilterQuery(arg) || isInfixExpression(arg))) {
          throw new Error(
            "" + token.value + "() argument " + i + "must be of LogicalType"
          );
        }
        break;
      case "NodesType":
        if (
          !isFilterQuery(arg) ||
          (arg.kind === "FunctionExtension" &&
            functionExtensions[arg.name].returnType === "NodesType")
        ) {
          throw new Error(
            "" + token.value + "() argument " + i + "must be of NodesType"
          );
        }
        break;
    }
  }
}

function isLiteralExpression(expr) {
  switch (expr.kind) {
    case "NullLiteral":
    case "BooleanLiteral":
    case "StringLiteral":
    case "NumberLiteral":
      return true;
    default:
      return false;
  }
}

function isFilterQuery(expr) {
  switch (expr.kind) {
    case "AbsoluteQuery":
    case "RelativeQuery":
      return true;
    default:
      return false;
  }
}

function isInfixExpression(expr) {
  switch (expr.kind) {
    case "LogicalAnd":
    case "LogicalOr":
    case "EQ":
    case "GT":
    case "GE":
    case "LT":
    case "LE":
    case "NE":
      return true;
    default:
      return false;
  }
}

function isSingularQuery(query) {
  var segment;
  var selector;

  for (var i = 0, len = query.segments.length; i < len; i++) {
    segment = query.segments[i];

    if (!segment) {
      return false;
    }

    if (segment.kind === "DescendantSegment") {
      return false;
    }

    if (segment.selectors.length > 1) {
      return false;
    }

    selector = segment.selectors[0];

    if (!selector) {
      return false;
    }

    if (selector.kind === "NameSelector" || selector.kind == "IndexSelector") {
      continue;
    }

    return false;
  }

  return true;
}
