import { Token, Tokens } from "./token";

const reFloat = /((?:-?\d+\.\d+(?:[eE][+-]?\d+)?)|(-?\d+[eE]-\d+))/y;
const reInt = /-?\d+(?:[eE]\+?\d+)?/y;
const reName = /[\u0080-\uFFFFa-zA-Z_][\u0080-\uFFFFa-zA-Z0-9_-]*/y;
const reTrivia = /[ \n\r\t]+/y;

/**
 *
 * @param {string} input
 * @returns {Array<Token>}
 */
export function tokenize(input) {
  /** @type {Array<Token>} */
  const tokens = [];

  const length = input.length;
  let pos = 0;

  /** @type {number|undefined} */
  let ch = undefined;

  /** @type {string|null} */
  let match = null;

  while (pos < length) {
    ch = input.charCodeAt(pos);

    // TODO: try regex and map instead of switch?

    switch (ch) {
      case 42: // *
        tokens.push(new Token(Tokens.ASTERISK, undefined, pos));
        pos += 1;
        break;
      case 64: // @
        tokens.push(new Token(Tokens.AT, undefined, pos));
        pos += 1;
        break;
      case 58: // :
        tokens.push(new Token(Tokens.COLON, undefined, pos));
        pos += 1;
        break;
      case 44: // ,
        tokens.push(new Token(Tokens.COMMA, undefined, pos));
        pos += 1;
        break;
      case 36: // $
        tokens.push(new Token(Tokens.DOLLAR, undefined, pos));
        pos += 1;
        break;
      case 40: // (
        tokens.push(new Token(Tokens.LEFT_PAREN, undefined, pos));
        pos += 1;
        break;
      case 91: // [
        tokens.push(new Token(Tokens.LEFT_BRACKET, undefined, pos));
        pos += 1;
        break;
      case 41: // )
        tokens.push(new Token(Tokens.RIGHT_PAREN, undefined, pos));
        pos += 1;
        break;
      case 93: // ]
        tokens.push(new Token(Tokens.RIGHT_BRACKET, undefined, pos));
        pos += 1;
        break;
      case 33: // !
        tokens.push(new Token(Tokens.NE, undefined, pos));
        pos += 1;
        break;
      case 63: // ?
        tokens.push(new Token(Tokens.QUESTION, undefined, pos));
        pos += 1;
        break;
      case 38: // &
        if (input.charCodeAt(pos + 1) == 38) {
          tokens.push(new Token(Tokens.AND, undefined, pos));
          pos += 2;
        } else {
          tokens.push(
            new Token(
              Tokens.ERROR,
              "unknown token '&', did you mean '&&'?",
              pos,
            ),
          );
          pos += 1;
        }
        break;
      case 124: // |
        if (input.charCodeAt(pos + 1) == 124) {
          tokens.push(new Token(Tokens.OR, undefined, pos));
          pos += 2;
        } else {
          tokens.push(
            new Token(
              Tokens.ERROR,
              "unknown token '|', did you mean '||'?",
              pos,
            ),
          );
          pos += 1;
        }
        break;
      case 46: // .
        if (input.charCodeAt(pos + 1) == 46) {
          tokens.push(new Token(Tokens.DOUBLE_DOT, undefined, pos));
          pos += 2;
        } else {
          tokens.push(new Token(Tokens.DOT, undefined, pos));
          pos += 1;
        }
        break;
      case 61: // =
        if (input.charCodeAt(pos + 1) == 61) {
          tokens.push(new Token(Tokens.EQ, undefined, pos));
          pos += 2;
        } else {
          tokens.push(
            new Token(
              Tokens.ERROR,
              "unknown token '=', did you mean '=='?",
              pos,
            ),
          );
          pos += 1;
        }
        break;
      case 62: // >
        if (input.charCodeAt(pos + 1) == 61) {
          tokens.push(new Token(Tokens.GE, undefined, pos));
          pos += 2;
        } else {
          tokens.push(new Token(Tokens.GT, undefined, pos));
          pos += 1;
        }
        break;
      case 60: // <
        if (input.charCodeAt(pos + 1) == 61) {
          tokens.push(new Token(Tokens.LE, undefined, pos));
          pos += 2;
        } else {
          tokens.push(new Token(Tokens.LT, undefined, pos));
          pos += 1;
        }
        break;
      case 39: // '
        let [token, new_pos] = scan_single_quoted_string(input, pos + 1);
        tokens.push(token);
        pos = new_pos;
        break;
      case 34: // ""
        [token, new_pos] = scan_double_quoted_string(input, pos + 1);
        tokens.push(token);
        pos = new_pos;
        break;
      default:
        match = scan(reName, input, pos);
        if (match) {
          tokens.push(new Token(Tokens.NAME, match, pos));
          pos += match.length;
          continue;
        }

        match = scan(reTrivia, input, pos);
        if (match) {
          tokens.push(new Token(Tokens.TRIVIA, match, pos));
          pos += match.length;
          continue;
        }

        match = scan(reFloat, input, pos);
        if (match) {
          tokens.push(new Token(Tokens.FLOAT, match, pos));
          pos += match.length;
          continue;
        }

        match = scan(reInt, input, pos);
        if (match) {
          tokens.push(new Token(Tokens.INTEGER, match, pos));
          pos += match.length;
          continue;
        }

        tokens.push(
          new Token(
            Tokens.ERROR,
            `unknown token '${String.fromCharCode(ch)}'`,
            pos,
          ),
        );
        pos += 1;
    }
  }

  return tokens;
}

/**
 * @param {RegExp} pattern
 * @param {string} input
 * @param {number} pos
 * @returns {string|null}
 */
function scan(pattern, input, pos) {
  pattern.lastIndex = pos;
  const match = pattern.exec(input);
  pattern.lastIndex = 0;
  return match ? match[0] : null;
}

/**
 *
 * @param {string} input
 * @param {number} pos
 * @return {[Token, number]}
 */
function scan_single_quoted_string(input, pos) {
  const start = pos;
  const length = input.length;

  /** @type {number|undefined} */
  let ch = undefined;

  /** @type {import("./token").TokenKind} */
  let kind = Tokens.SINGLE_QUOTED_STRING;

  while (pos < length) {
    ch = input.charCodeAt(pos);

    switch (ch) {
      case 92: // \
        pos += 2;
        kind = Tokens.SINGLE_QUOTED_ESC_STRING;
        break;
      case NaN:
        return [
          new Token(Tokens.ERROR, "unclosed string literal", start),
          length,
        ];
      case 39: // '
        return [new Token(kind, input.slice(start, pos), start), pos + 1];
      default:
        pos += 1;
    }
  }

  return [new Token(Tokens.ERROR, "unclosed string literal", start), length];
}
/**
 *
 * @param {string} input
 * @param {number} pos
 * @return {[Token, number]}
 */
function scan_double_quoted_string(input, pos) {
  const start = pos;
  const length = input.length;

  /** @type {number|undefined} */
  let ch = undefined;

  /** @type {import("./token").TokenKind} */
  let kind = Tokens.DOUBLE_QUOTED_STRING;

  while (pos < length) {
    ch = input.charCodeAt(pos);

    switch (ch) {
      case 92: // \
        pos += 2;
        kind = Tokens.DOUBLE_QUOTED_ESC_STRING;
        break;
      case NaN:
        return [
          new Token(Tokens.ERROR, "unclosed string literal", start),
          length,
        ];
      case 34: // "
        return [new Token(kind, input.slice(start, pos), start), pos + 1];
      default:
        pos += 1;
    }
  }

  return [new Token(Tokens.ERROR, "unclosed string literal", start), length];
}
