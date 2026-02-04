import { T, Token } from "./token";
import { FUNCTION_EXTENSIONS } from "./path";

const MAX_INDEX = Math.pow(2, 53) - 1;
const MIN_INDEX = -Math.pow(2, 53) + 1;

const P = {
  LOWEST: 1,
  LOGICAL_OR: 3,
  LOGICAL_AND: 4,
  RELATIONAL: 5,
  PREFIX: 7,
};

/** @type {Array<number>} */
const PRECEDENCES = [];
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
const BINARY_OPERATORS = [];
BINARY_OPERATORS[T.AND] = true;
BINARY_OPERATORS[T.OR] = true;
BINARY_OPERATORS[T.EQ] = true;
BINARY_OPERATORS[T.GE] = true;
BINARY_OPERATORS[T.GT] = true;
BINARY_OPERATORS[T.LE] = true;
BINARY_OPERATORS[T.LT] = true;
BINARY_OPERATORS[T.NE] = true;

/** @type {Array<boolean>} */
const COMPARISON_OPERATORS = [];
COMPARISON_OPERATORS[T.EQ] = true;
COMPARISON_OPERATORS[T.GE] = true;
COMPARISON_OPERATORS[T.GT] = true;
COMPARISON_OPERATORS[T.LE] = true;
COMPARISON_OPERATORS[T.LT] = true;
COMPARISON_OPERATORS[T.NE] = true;

/**
 *
 * @param {Array<Token>} tokens
 * @return {import("./types").JSONPathQuery}
 */
export function parse(tokens) {
  /** @type {import("./types").ParseState} */
  const state = { tokens, pos: 0 };
  eat(state, T.DOLLAR);
  const segments = parseSegments(state);
  eat(state, T.EOI);
  return { segments };
}

/**
 *
 * @param {import("./types").ParseState} state
 * @returns {Array<import("./types").Segment>}
 */
function parseSegments(state) {
  /** @type {Array<import("./types").Segment>} */
  const segments = [];

  let token;
  let selectors;

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
        segments.push({ kind: "DescendantSegment", token, selectors });
        break;
      case T.DOT:
        token = next(state);
        selectors = [parseShorthandSelector(state)];
        segments.push({ kind: "ChildSegment", token, selectors });
        break;
      case T.LEFT_BRACKET:
        token = peek(state);
        selectors = parseBracketedSelectors(state);
        segments.push({ kind: "ChildSegment", token, selectors });
        break;
      default:
        break loop;
    }
  }

  return segments;
}

/**
 *
 * @param {import("./types").ParseState} state
 * @returns {Array<import("./types").Selector>}
 */
function parseDescendantSelectors(state) {
  switch (peek(state).kind) {
    case T.NAME:
    case T.ASTERISK:
      return [parseShorthandSelector(state)];
    case T.LEFT_BRACKET:
      return parseBracketedSelectors(state);
    default:
      throw new Error(`expected a selector, found ${peek(state)}`);
  }
}

/**
 *
 * @param {import("./types").ParseState} state
 * @returns {import("./types").Selector}
 */
function parseShorthandSelector(state) {
  let token;

  switch (peek(state).kind) {
    case T.NAME:
      token = next(state);
      return { kind: "NameSelector", token, name: token.value };
    case T.ASTERISK:
      token = next(state);
      return { kind: "WildcardSelector", token };
    default:
      throw new Error(`expected a shorthand selector, found ${peek(state)}`);
  }
}

/**
 *
 * @param {import("./types").ParseState} state
 * @returns {Array<import("./types").Selector>}
 */
function parseBracketedSelectors(state) {
  const startToken = eat(state, T.LEFT_BRACKET);

  /** @type {Array<import("./types").Selector>} */
  const selectors = [];

  let token;

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
          token,
          name: decodeStringLiteral(token),
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
        throw new Error(`unexpected ${token} in bracketed selection`);
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

/**
 *
 * @param {import("./types").ParseState} state
 * @returns {import("./types").Selector}
 */
function parseIndexOrSlice(state) {
  const token = eat(state, T.INDEX);
  const index = parseIJsonInt(token);

  skip(state, T.TRIVIA);

  if (peek(state).kind !== T.COLON) {
    return { kind: "IndexSelector", token, index };
  }

  /** @type {number|undefined} */
  let stop = undefined;

  /** @type {number|undefined} */
  let step = undefined;

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

  return { kind: "SliceSelector", token, start: index, stop, step };
}
/**
 *
 * @param {import("./types").ParseState} state
 * @returns {import("./types").Selector}
 */
function parseSliceSelector(state) {
  const token = eat(state, T.COLON);
  skip(state, T.TRIVIA);

  /** @type {number|undefined} */
  let stop = undefined;

  /** @type {number|undefined} */
  let step = undefined;

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

  return { kind: "SliceSelector", token, start: undefined, stop, step };
}

/**
 *
 * @param {import("./types").ParseState} state
 * @return {import("./types").Selector}
 */
function parseFilterSelector(state) {
  const token = eat(state, T.QUESTION);
  const expr = parseFilterExpression(state);
  throwForNotCompared(expr, FUNCTION_EXTENSIONS);
  return { kind: "FilterSelector", token, expression: expr };
}

/**
 *
 * @param {import("./types").ParseState} state
 * @param {number} precedence
 * @return {import("./types").Expression}
 */
function parseFilterExpression(state, precedence = P.LOWEST) {
  let left = parsePrimary(state);
  let peeked;

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

/**
 *
 * @param {import("./types").ParseState} state
 * @returns {import("./types").Expression}
 */
function parseFunctionExpression(state) {
  const startToken = eat(state, T.NAME);
  eat(state, T.LEFT_PAREN);

  /** @type {Array<import("./types").Expression>} */
  const args = [];

  let expr;

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
    args,
  };
}

/**
 *
 * @param {import("./types").ParseState} state
 * @returns {import("./types").Expression}
 */
function parsePrimary(state) {
  skip(state, T.TRIVIA);
  let peeked = peek(state);
  let token;

  switch (peeked.kind) {
    case T.SINGLE_QUOTED_STRING:
    case T.DOUBLE_QUOTED_STRING:
    case T.SINGLE_QUOTED_ESC_STRING:
    case T.DOUBLE_QUOTED_ESC_STRING:
      token = next(state);
      return {
        kind: "StringLiteral",
        token,
        value: decodeStringLiteral(token),
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
      throw new Error(`unexpected ${token.value}`);
  }
}

/**
 *
 * @param {import("./types").ParseState} state
 * @returns {import("./types").Expression}
 */
function parseGroupedExpression(state) {
  eat(state, T.LEFT_PAREN);
  let expr = parseFilterExpression(state);
  let peeked;

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

/**
 *
 * @param {import("./types").ParseState} state
 * @returns {import("./types").Expression}
 */
function parsePrefixExpression(state) {
  const token = eat(state, T.NOT);
  return {
    kind: "LogicalNot",
    token,
    expression: parseFilterExpression(state, P.PREFIX),
  };
}

/**
 *
 * @param {import("./types").ParseState} state
 * @param {import("./types").Expression} left
 * @returns {import("./types").Expression}
 */
function parseInfixExpression(state, left) {
  const token = next(state);
  const precedence = PRECEDENCES[token.kind] || P.LOWEST;
  const right = parseFilterExpression(state, precedence);

  if (COMPARISON_OPERATORS[token.kind]) {
    throwForNonComparable(left, FUNCTION_EXTENSIONS);
    throwForNonComparable(right, FUNCTION_EXTENSIONS);

    switch (token.kind) {
      case T.EQ:
        return { kind: "EQ", token, left, right };
      case T.NE:
        return { kind: "NE", token, left, right };
      case T.LT:
        return { kind: "LT", token, left, right };
      case T.LE:
        return { kind: "LE", token, left, right };
      case T.GT:
        return { kind: "GT", token, left, right };
      case T.GE:
        return { kind: "GE", token, left, right };
      default:
        throw new Error("expected an infix operator");
    }
  } else {
    throwForNotCompared(left, FUNCTION_EXTENSIONS);
    throwForNotCompared(right, FUNCTION_EXTENSIONS);

    switch (token.kind) {
      case T.AND:
        return { kind: "LogicalAnd", token, left, right };
      case T.OR:
        return { kind: "LogicalOr", token, left, right };
      default:
        throw new Error("expected an infix operator");
    }
  }
}

/**
 *
 * @param {import("./types").ParseState} state
 * @returns {import("./types").Expression}
 */
function parseNumberLiteral(state) {
  const token = next(state);
  const value = token.value;

  if (value.startsWith("0") && value.length > 1) {
    throw new Error("invalid integer literal");
  }

  const num = Number(value);

  if (isNaN(num)) {
    throw new Error("invalid integer literal");
  }

  return { kind: "NumberLiteral", token, value: num };
}

/**
 *
 * @param {import("./types").ParseState} state
 * @returns {import("./types").Expression}
 */
function parseAbsoluteQuery(state) {
  const token = eat(state, T.DOLLAR);
  const segments = parseSegments(state);
  return { kind: "AbsoluteQuery", token, query: { segments } };
}

/**
 *
 * @param {import("./types").ParseState} state
 * @returns {import("./types").Expression}
 */
function parseRelativeQuery(state) {
  const token = eat(state, T.AT);
  const segments = parseSegments(state);
  return { kind: "RelativeQuery", token, query: { segments } };
}

/**
 *
 * @param {import("./types").ParseState} state
 * @returns {Token};
 */
function next(state) {
  if (state.pos < state.tokens.length) {
    return state.tokens[state.pos++] || new Token(T.EOI, "", -1);
  }
  return new Token(T.EOI, "", -1);
}

/**
 *
 * @param {import("./types").ParseState} state
 * @returns {Token};
 */
function peek(state) {
  return state.tokens[state.pos] || new Token(T.EOI, "", -1);
}

/**
 * Assert the current token's kind and return it. Advance the token position.
 * @param {import("./types").ParseState} state
 * @param {import("./token").TokenKind} kind
 * @return {Token}
 */
function eat(state, kind) {
  const token = state.tokens[state.pos++] || new Token(T.EOI, "", -1);
  if (token.kind !== kind) {
    throw new Error(`expected ${kind}, found ${token?.kind}`);
  }
  return token;
}

/**
 * Skip the next token if it matches `kind`.
 * @param {import("./types").ParseState} state
 * @param {import("./token").TokenKind} kind
 */
function skip(state, kind) {
  if (state.tokens[state.pos]?.kind === kind) {
    state.pos += 1;
  }
}

/**
 *
 * @param {Token} token
 * @returns {number}
 */
function parseIJsonInt(token) {
  const value = token.value;

  if (value.length > 1 && (value.startsWith("0") || value.startsWith("-0"))) {
    throw new Error(`invalid index '${value}'`);
  }

  const num = Number(value);

  if (isNaN(num)) {
    throw new Error(`invalid index '${value}'`);
  }

  if (num < MIN_INDEX || num > MAX_INDEX) {
    throw new Error("index out of range");
  }

  return num;
}

/**
 *
 * @param {Token} token
 * @returns {string}
 */
function decodeStringLiteral(token) {
  switch (token.kind) {
    case T.SINGLE_QUOTED_STRING:
      return token.value;
    case T.DOUBLE_QUOTED_STRING:
      return token.value;
    case T.SINGLE_QUOTED_ESC_STRING:
      return unescapeString(
        token.value.replaceAll('"', '\\"').replaceAll("\\'", "'"),
        token,
      );
    case T.DOUBLE_QUOTED_ESC_STRING:
      return unescapeString(token.value, token);
    default:
      throw new Error(`expected a string literal, found ${token}`);
  }
}

/**
 *
 * @param {string} value
 * @param {Token} token
 * @returns {string}
 */
function unescapeString(value, token) {
  /** @type {Array<string>} */
  const result = [];
  const length = value.length;

  let ch = "";
  let index = 0;
  let codePoint;

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
        [ch, index] = decodeSlashU(value, index, token);
        result.push(ch);
        break;
      default:
        throw new Error("unknown escape sequence");
    }

    index += 1;
  }

  return result.join("");
}

/**
 *
 * @param {string} value
 * @param {number} index
 * @param {Token} token
 * @return {[string, number]}
 */
function decodeSlashU(value, index, token) {
  const length = value.length;

  if (index + 3 >= length) {
    throw new Error("incomplete escape sequence");
  }

  let digits = value.slice(index, index + 4);
  if (!/^[a-fA-F0-9]{4}$/.test(digits)) {
    throw new Error("invalid escape sequence");
  }

  let codePoint = parseInt(digits, 16);

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

    const lowSurrogate = parseInt(digits, 16);

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

/**
 *
 * @param {number} codepoint
 * @returns {boolean}
 */
function isHighSurrogate(codepoint) {
  return codepoint >= 0xd800 && codepoint <= 0xdbff;
}

/**
 *
 * @param {number} codepoint
 * @returns {boolean}
 */
function isLowSurrogate(codepoint) {
  return codepoint >= 0xdc00 && codepoint <= 0xdfff;
}

/**
 *
 * @param {import("./types").Expression} expr
 * @param {import("./types").FunctionExtensions} functionExtensions
 * @returns {void}
 */
function throwForNotCompared(expr, functionExtensions) {
  if (isLiteralExpression(expr)) {
    throw new Error("filter expression literals must be compared");
  }

  if (expr.kind === "FunctionExtension") {
    let func = functionExtensions[expr.name];

    if (func === undefined) {
      throw new Error(`unknown function extension ${expr.name}`);
    }

    if (func.returnType === "ValueType") {
      throw new Error(`result of ${expr.name}() must be compared`);
    }
  }
}

/**
 *
 * @param {import("./types").Expression} expr
 * @param {import("./types").FunctionExtensions} functionExtensions
 * @returns {void}
 */
function throwForNonComparable(expr, functionExtensions) {
  if (isFilterQuery(expr) && !isSingularQuery(expr.query)) {
    throw new Error("non-singular query is not comparable");
  }

  if (expr.kind === "FunctionExtension") {
    let func = functionExtensions[expr.name];

    if (func === undefined) {
      throw new Error(`unknown function extension ${expr.name}`);
    }

    if (func.returnType !== "ValueType") {
      throw new Error(`result of ${expr.name}() is not comparable`);
    }
  }
}

/**
 *
 * @param {Token} token
 * @param {Array<import("./types").Expression>} args
 * @param {import("./types").FunctionExtensions} functionExtensions
 * @return {void}
 */
function validateFunctionSignature(token, args, functionExtensions) {
  const func = functionExtensions[token.value];
  if (func === undefined) {
    throw new Error(`unknown function extension ${token.value}`);
  }

  const expectedArgCount = func.argTypes.length;

  if (args.length !== expectedArgCount) {
    throw new Error(
      `${token.value} takes ${expectedArgCount} argument${expectedArgCount === 1 ? "" : "s"} (${args.length} given)`,
    );
  }

  for (let i = 0; i < expectedArgCount; i++) {
    const arg = args[i];

    switch (func.argTypes[i]) {
      case "ValueType":
        if (
          !(
            isLiteralExpression(arg) ||
            (isFilterQuery(arg) && isSingularQuery(arg.query)) ||
            (arg?.kind === "FunctionExtension" &&
              functionExtensions[arg.name]?.returnType === "ValueType")
          )
        ) {
          throw new Error(
            `${token.value}() argument ${i} must be of ValueType`,
          );
        }
        break;
      case "LogicalType":
        if (!(isFilterQuery(arg) || isInfixExpression(arg))) {
          throw new Error(
            `${token.value}() argument ${i} must be of LogicalType`,
          );
        }
        break;
      case "NodesType":
        if (
          !isFilterQuery(arg) ||
          (arg?.kind === "FunctionExtension" &&
            functionExtensions[arg.name]?.returnType === "NodesType")
        ) {
          throw new Error(
            `${token.value}() argument ${i} must be of NodesType`,
          );
        }
        break;
    }
  }
}

/**
 *
 * @param {import("./types").Expression|undefined} expr
 * @returns {node is import("./types").LiteralExpression}
 */
function isLiteralExpression(expr) {
  switch (expr?.kind) {
    case "NullLiteral":
    case "BooleanLiteral":
    case "StringLiteral":
    case "NumberLiteral":
      return true;
    default:
      return false;
  }
}

/**
 *
 * @param {import("./types").Expression|undefined} expr
 * @returns {node is import("./types").FilterQuery}
 */
function isFilterQuery(expr) {
  switch (expr?.kind) {
    case "AbsoluteQuery":
    case "RelativeQuery":
      return true;
    default:
      return false;
  }
}

/**
 *
 * @param {import("./types").Expression|undefined} expr
 * @returns {node is import("./types").InfixExpression}
 */
function isInfixExpression(expr) {
  switch (expr?.kind) {
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

/**
 *
 * @param {import("./types").JSONPathQuery} query
 * @returns {boolean}
 */
function isSingularQuery(query) {
  let segment;
  let selector;

  for (let i = 0; i < query.segments.length; i++) {
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
