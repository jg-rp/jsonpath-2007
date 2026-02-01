import { T, Token } from "./token";

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
      return { kind: "WildcardSelector", token, index: token.value };
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
 * @returns {Token};
 */
function next(state) {
  if (state.pos < state.tokens.length) {
    return state.tokens[state.pos++] || new Token(T.EOI, undefined, -1);
  }
  return new Token(T.EOI, undefined, -1);
}

/**
 *
 * @param {import("./types").ParseState} state
 * @returns {Token};
 */
function peek(state) {
  return state.tokens[state.pos] || new Token(T.EOI, undefined, -1);
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
