var RE_FLOAT = /^((?:-?\d+\.\d+(?:[eE][+-]?\d+)?)|(-?\d+[eE]-\d+))/;
var RE_INDEX = /^-?\d+/;
var RE_INT = /^-?\d+[eE]\+?\d+/;
var RE_NAME = /^[\u0080-\uFFFFa-zA-Z_][\u0080-\uFFFFa-zA-Z0-9_-]*/;
var RE_TRIVIA = /^[ \n\r\t]+/;

function tokenize(input) {
  var tokens = [];
  var length = input.length;
  var pos = 0;
  var ch = NaN;
  var match = null;
  var token;
  var tokenAndPos;

  while (pos < length) {
    ch = input.charCodeAt(pos);

    // NOTE: This big switch statement benchmarks about 3 times faster than a
    // symbol regexp and map lookup.

    switch (ch) {
      case 42: // *
        tokens.push({ kind: T.ASTERISK, value: "*", index: pos });
        pos += 1;
        break;
      case 64: // @
        tokens.push({ kind: T.AT, value: "@", index: pos });
        pos += 1;
        break;
      case 58: // :
        tokens.push({ kind: T.COLON, value: ":", index: pos });
        pos += 1;
        break;
      case 44: // ,
        tokens.push({ kind: T.COMMA, value: ",", index: pos });
        pos += 1;
        break;
      case 36: // $
        tokens.push({ kind: T.DOLLAR, value: "$", index: pos });
        pos += 1;
        break;
      case 40: // (
        tokens.push({ kind: T.LEFT_PAREN, value: "(", index: pos });
        pos += 1;
        break;
      case 91: // [
        tokens.push({ kind: T.LEFT_BRACKET, value: "[", index: pos });
        pos += 1;
        break;
      case 41: // )
        tokens.push({ kind: T.RIGHT_PAREN, value: ")", index: pos });
        pos += 1;
        break;
      case 93: // ]
        tokens.push({ kind: T.RIGHT_BRACKET, value: "]", index: pos });
        pos += 1;
        break;
      case 63: // ?
        tokens.push({ kind: T.QUESTION, value: "?", index: pos });
        pos += 1;
        break;
      case 38: // &
        if (input.charCodeAt(pos + 1) == 38) {
          tokens.push({ kind: T.AND, value: "&&", index: pos });
          pos += 2;
        } else {
          throw new JSONPathSyntaxError(
            "unknown token '&', did you mean '&&'?",
            { kind: T.ERROR, value: "", index: pos },
            input
          );
        }
        break;
      case 124: // |
        if (input.charCodeAt(pos + 1) == 124) {
          tokens.push({ kind: T.OR, value: "||", index: pos });
          pos += 2;
        } else {
          throw new JSONPathSyntaxError(
            "unknown token '|', did you mean '||'?",
            { kind: T.ERROR, value: "", index: pos },
            input
          );
        }
        break;
      case 46: // .
        if (input.charCodeAt(pos + 1) == 46) {
          tokens.push({ kind: T.DOUBLE_DOT, value: "..", index: pos });
          pos += 2;
        } else {
          tokens.push({ kind: T.DOT, value: ".", index: pos });
          pos += 1;
        }
        break;
      case 61: // =
        if (input.charCodeAt(pos + 1) == 61) {
          tokens.push({ kind: T.EQ, value: "==", index: pos });
          pos += 2;
        } else {
          throw new JSONPathSyntaxError(
            "unknown token '=', did you mean '=='?",
            { kind: T.ERROR, value: "", index: pos },
            input
          );
        }
        break;
      case 33: // !
        if (input.charCodeAt(pos + 1) == 61) {
          tokens.push({ kind: T.NE, value: "!=", index: pos });
          pos += 2;
        } else {
          tokens.push({ kind: T.NOT, value: "!", index: pos });
          pos += 1;
        }
        break;
      case 62: // >
        if (input.charCodeAt(pos + 1) == 61) {
          tokens.push({ kind: T.GE, value: ">=", index: pos });
          pos += 2;
        } else {
          tokens.push({ kind: T.GT, value: ">", index: pos });
          pos += 1;
        }
        break;
      case 60: // <
        if (input.charCodeAt(pos + 1) == 61) {
          tokens.push({ kind: T.LE, value: "<=", index: pos });
          pos += 2;
        } else {
          tokens.push({ kind: T.LT, value: "<", index: pos });
          pos += 1;
        }
        break;
      case 39: // '
        tokenAndPos = scanSingleQuotedString(input, pos + 1);
        tokens.push(tokenAndPos[0]);
        pos = tokenAndPos[1];
        break;
      case 34: // "
        tokenAndPos = scanDoubleQuotedString(input, pos + 1);
        tokens.push(tokenAndPos[0]);
        pos = tokenAndPos[1];
        break;
      default:
        if (isNameFirstCh(ch)) {
          match = scan(RE_NAME, input, pos);
          if (match) {
            tokens.push({ kind: T.NAME, value: match, index: pos });
            pos += match.length;
            continue;
          }
        }

        if (isTrivia(ch)) {
          match = scan(RE_TRIVIA, input, pos);
          if (match) {
            tokens.push({ kind: T.TRIVIA, value: match, index: pos });
            pos += match.length;
            continue;
          }
        }

        if (isNumberCh(ch)) {
          match = scan(RE_FLOAT, input, pos);
          if (match) {
            tokens.push({ kind: T.FLOAT, value: match, index: pos });
            pos += match.length;
            continue;
          }

          match = scan(RE_INT, input, pos);
          if (match) {
            tokens.push({ kind: T.INTEGER, value: match, index: pos });
            pos += match.length;
            continue;
          }

          match = scan(RE_INDEX, input, pos);
          if (match) {
            tokens.push({ kind: T.INDEX, value: match, index: pos });
            pos += match.length;
            continue;
          }
        }

        throw new JSONPathSyntaxError(
          "unknown token '" + String.fromCharCode(ch) + "'",
          { kind: T.ERROR, value: "", index: pos },
          input
        );
    }
  }

  return tokens;
}

function scan(pattern, input, pos) {
  var match = pattern.exec(input.slice(pos));
  return match ? match[0] : null;
}

function scanSingleQuotedString(input, pos) {
  var start = pos;
  var length = input.length;
  var ch = NaN;
  var kind = T.SINGLE_QUOTED_STRING;

  while (pos < length) {
    ch = input.charCodeAt(pos);

    switch (ch) {
      case 92: // \
        if (input.charCodeAt(pos + 1) === 34) {
          throw new JSONPathSyntaxError(
            "invalid escape sequence '\\\"'",
            {
              kind: T.ERROR,
              value: "",
              index: pos
            },
            input
          );
        }
        pos += 2;
        kind = T.SINGLE_QUOTED_ESC_STRING;
        break;
      case NaN:
        throw new JSONPathSyntaxError(
          "unclosed string literal",
          {
            kind: T.ERROR,
            value: "",
            index: start
          },
          input
        );
      case 39: // '
        return [
          { kind: kind, value: input.slice(start, pos), index: start },
          pos + 1
        ];
      default:
        if (ch <= 0x1f) {
          throw new JSONPathSyntaxError(
            "invalid character 0x" + ch.toString(16),
            {
              kind: T.ERROR,
              value: "",
              index: pos
            },
            input
          );
        }
        pos += 1;
    }
  }

  throw new JSONPathSyntaxError(
    "unclosed string literal",
    {
      kind: T.ERROR,
      value: "",
      index: start
    },
    input
  );
}

function scanDoubleQuotedString(input, pos) {
  var start = pos;
  var length = input.length;
  var ch = NaN;
  var kind = T.DOUBLE_QUOTED_STRING;

  while (pos < length) {
    ch = input.charCodeAt(pos);

    switch (ch) {
      case 92: // \
        if (input.charCodeAt(pos + 1) === 39) {
          throw new JSONPathSyntaxError(
            "invalid escape sequence '\\\''",
            {
              kind: T.ERROR,
              value: "",
              index: pos
            },
            input
          );
        }
        pos += 2;
        kind = T.DOUBLE_QUOTED_ESC_STRING;
        break;
      case NaN:
        throw new JSONPathSyntaxError(
          "unclosed string literal",
          {
            kind: T.ERROR,
            value: "",
            index: start
          },
          input
        );
      case 34: // "
        return [
          { kind: kind, value: input.slice(start, pos), index: start },
          pos + 1
        ];
      default:
        if (ch <= 0x1f) {
          throw new JSONPathSyntaxError(
            "invalid character 0x" + ch.toString(16),
            {
              kind: T.ERROR,
              value: "",
              index: pos
            },
            input
          );
        }

        pos += 1;
    }
  }

  throw new JSONPathSyntaxError(
    "unclosed string literal",
    {
      kind: T.ERROR,
      value: "",
      index: start
    },
    input
  );
}

function isNumberCh(ch) {
  return ch == 45 || (ch >= 48 && ch <= 57);
}

function isNameFirstCh(ch) {
  return (
    (ch >= 65 && ch <= 90) ||
    (ch >= 97 && ch <= 122) ||
    ch == 95 ||
    (ch >= 0x80 && ch <= 0xffff)
  );
}

function isTrivia(ch) {
  return ch === 32 || ch === 9 || ch === 10 || ch === 13;
}
