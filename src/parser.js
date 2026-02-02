import { T, Token } from "./token";

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
 * @return {Array<import("./types").Segment>}
 */
export function parse(tokens) {
  /** @type {import("./types").ParseState} */
  const state = { tokens, pos: 0 };
  eat(state, T.DOLLAR);
  // TODO: assert eoi
  return parse_segments(state);
}

/**
 *
 * @param {import("./types").ParseState} state
 * @returns {Array<import("./types").Segment>}
 */
function parse_segments(state) {
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
        selectors = parse_descendant_selectors(state);
        segments.push({ kind: "DescendantSegment", token, selectors });
        break;
      case T.DOT:
        token = next(state);
        selectors = [parse_shorthand_selector(state)];
        segments.push({ kind: "ChildSegment", token, selectors });
        break;
      case T.LEFT_BRACKET:
        token = peek(state);
        selectors = parse_bracketed_selectors(state);
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
function parse_descendant_selectors(state) {
  switch (peek(state).kind) {
    case T.NAME:
    case T.ASTERISK:
      return [parse_shorthand_selector(state)];
    case T.LEFT_BRACKET:
      return parse_bracketed_selectors(state);
    default:
      throw new Error(`expected a selector, found ${peek(state)}`);
  }
}

/**
 *
 * @param {import("./types").ParseState} state
 * @returns {import("./types").Selector}
 */
function parse_shorthand_selector(state) {
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
function parse_bracketed_selectors(state) {
  const start_token = eat(state, T.LEFT_BRACKET);

  /** @type {Array<import("./types").Selector>} */
  const selectors = [];

  let token;

  loop: for (;;) {
    skip(state, T.TRIVIA);

    switch (peek(state).kind) {
      case T.RIGHT_BRACKET:
        break loop;
      case T.INDEX:
        selectors.push(parse_index_or_slice(state));
        break;
      case T.DOUBLE_QUOTED_STRING:
      case T.SINGLE_QUOTED_STRING:
      case T.DOUBLE_QUOTED_ESC_STRING:
      case T.SINGLE_QUOTED_ESC_STRING:
        token = next(state);
        selectors.push({
          kind: "NameSelector",
          token,
          name: decode_string_literal(token),
        });
        break;
      case T.COLON:
        selectors.push(parse_slice_selector(state));
        break;
      case T.ASTERISK:
        selectors.push({ kind: "WildcardSelector", token: next(state) });
        break;
      case T.QUESTION:
        selectors.push(parse_filter_selector(state));
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
function parse_index_or_slice(state) {
  const token = eat(state, T.INDEX);
  const index = parse_i_json_int(token);

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
    stop = parse_i_json_int(next(state));
    skip(state, T.TRIVIA);
  }

  if (peek(state).kind === T.COLON) {
    next(state);
    skip(state, T.TRIVIA);

    if (peek(state).kind === T.INDEX) {
      step = parse_i_json_int(next(state));
    }
  }

  return { kind: "SliceSelector", token, start: index, stop, step };
}
/**
 *
 * @param {import("./types").ParseState} state
 * @returns {import("./types").Selector}
 */
function parse_slice_selector(state) {
  const token = eat(state, T.COLON);
  skip(state, T.TRIVIA);

  /** @type {number|undefined} */
  let stop = undefined;

  /** @type {number|undefined} */
  let step = undefined;

  if (peek(state).kind === T.INDEX) {
    stop = parse_i_json_int(next(state));
    skip(state, T.TRIVIA);
  }

  if (peek(state).kind === T.COLON) {
    next(state);
    skip(state, T.TRIVIA);

    if (peek(state).kind === T.INDEX) {
      step = parse_i_json_int(next(state));
    }
  }

  return { kind: "SliceSelector", token, start: undefined, stop, step };
}

/**
 *
 * @param {import("./types").ParseState} state
 * @return {import("./types").Selector}
 */
function parse_filter_selector(state) {
  const token = eat(state, T.QUESTION);
  const expression = parse_filter_expression(state);

  // TODO: raise if must be compared

  return { kind: "FilterSelector", token, expression };
}

/**
 *
 * @param {import("./types").ParseState} state
 * @param {number} precedence
 * @return {import("./types").Expression}
 */
function parse_filter_expression(state, precedence = P.LOWEST) {
  let left = parse_primary(state);
  let peeked;

  for (;;) {
    peeked = peek(state);
    if (
      peeked.kind == T.EOI ||
      peeked.kind == T.RIGHT_BRACKET ||
      !BINARY_OPERATORS[peeked.kind] ||
      (PRECEDENCES[peeked.kind] || P.LOWEST) < precedence
    ) {
      break;
    }

    left = parse_infix_expression(state, left);
  }

  return left;
}

/**
 *
 * @param {import("./types").ParseState} state
 * @returns {import("./types").Expression}
 */
function parse_function_expression(state) {
  const start_token = eat(state, T.NAME);

  /** @type {Array<import("./types").Expression>} */
  const args = [];

  let expr;

  while (peek(state).kind != T.RIGHT_PAREN) {
    expr = parse_primary(state);

    while (!!BINARY_OPERATORS[peek(state).kind]) {
      expr = parse_infix_expression(state, expr);
    }

    args.push(expr);

    if (peek(state).kind !== T.RIGHT_PAREN) {
      eat(state, T.COMMA);
    }
  }

  eat(state, T.RIGHT_PAREN);
  validate_function_signature(start_token, args);

  return {
    kind: "FunctionExtension",
    token: start_token,
    name: start_token.value,
    args,
  };
}

/**
 *
 * @param {import("./types").ParseState} state
 * @returns {import("./types").Expression}
 */
function parse_primary(state) {
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
        value: decode_string_literal(token),
      };
    case T.FALSE:
      return { kind: "BooleanLiteral", token: next(state), value: false };
    case T.TRUE:
      return { kind: "BooleanLiteral", token: next(state), value: true };
    case T.NAME:
      if (peeked.value == "null") {
        return { kind: "NullLiteral", token: next(state) };
      }
      return parse_function_expression(state);
    case T.LEFT_PAREN:
      return parse_grouped_expression(state);
    case T.INDEX:
    case T.INTEGER:
      return parse_integer_literal(state);
    case T.FLOAT:
      return parse_float_literal(state);
    case T.DOLLAR:
      return parse_absolute_query(state);
    case T.AT:
      return parse_relative_query(state);
    case T.NOT:
      return parse_prefix_expression(state);
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
function parse_grouped_expression(state) {
  eat(state, T.LEFT_PAREN);
  let expr = parse_filter_expression(state);
  let peeked;

  for (;;) {
    peeked = peek(state);
    if (peeked.kind == T.RIGHT_PAREN) {
      break;
    }

    if (peeked.kind === T.EOI) {
      throw new Error("unbalanced parentheses");
    }

    expr = parse_infix_expression(state, expr);
  }

  eat(state, T.RIGHT_PAREN);
  return expr;
}

/**
 *
 * @param {import("./types").ParseState} state
 * @returns {import("./types").Expression}
 */
function parse_prefix_expression(state) {
  const token = eat(state, T.NOT);
  return {
    kind: "LogicalNot",
    token,
    expression: parse_filter_expression(state, P.PREFIX),
  };
}

/**
 *
 * @param {import("./types").ParseState} state
 * @param {import("./types").Expression} left
 * @returns {import("./types").Expression}
 */
function parse_infix_expression(state, left) {
  const token = next(state);
  const precedence = PRECEDENCES[token.kind] || P.LOWEST;
  const right = parse_filter_expression(state, precedence);

  if (COMPARISON_OPERATORS[token.kind]) {
    throw_for_non_comparable(left);
    throw_for_non_comparable(right);

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
    throw_for_not_compared_literal(left);
    throw_for_not_compared_literal(right);

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
  if (state.tokens[state.pos]?.kind !== kind) {
    throw new Error(`expected ${kind}, found ${state.tokens[state.pos]?.kind}`);
  }
  return state.tokens[state.pos++];
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
function parse_i_json_int(token) {
  const value = token.value;

  if (value.length > 1 && (value.startsWith("0") || value.startsWith("-0"))) {
    throw new Error(`invalid index '${value}'`);
  }

  return Number(value);
}
