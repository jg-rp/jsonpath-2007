// TODO: implement without regexp because `y` flag was not available in ES3
var reFloat = /((?:-?\d+\.\d+(?:[eE][+-]?\d+)?)|(-?\d+[eE]-\d+))/y;
var reIndex = /-?\d+/y;
var reInt = /-?\d+[eE]\+?\d+/y;
var reName = /[\u0080-\uFFFFa-zA-Z_][\u0080-\uFFFFa-zA-Z0-9_-]*/y;
var reTrivia = /[ \n\r\t]+/y;

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
          tokens.push({
            kind: T.ERROR,
            value: "unknown token '&', did you mean '&&'?",
            index: pos
          });
          pos += 1;
        }
        break;
      case 124: // |
        if (input.charCodeAt(pos + 1) == 124) {
          tokens.push({ kind: T.OR, value: "||", index: pos });
          pos += 2;
        } else {
          tokens.push({
            kind: T.ERROR,
            value: "unknown token '|', did you mean '||'?",
            index: pos
          });
          pos += 1;
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
          tokens.push({
            kind: T.ERROR,
            value: "unknown token '=', did you mean '=='?",
            index: pos
          });
          pos += 1;
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
        // TODO: try checking `ch` character class before doing regexp

        match = scan(reName, input, pos);
        if (match) {
          tokens.push({ kind: T.NAME, value: match, index: pos });
          pos += match.length;
          continue;
        }

        match = scan(reTrivia, input, pos);
        if (match) {
          tokens.push({ kind: T.TRIVIA, value: match, index: pos });
          pos += match.length;
          continue;
        }

        match = scan(reFloat, input, pos);
        if (match) {
          tokens.push({ kind: T.FLOAT, value: match, index: pos });
          pos += match.length;
          continue;
        }

        match = scan(reInt, input, pos);
        if (match) {
          tokens.push({ kind: T.INTEGER, value: match, index: pos });
          pos += match.length;
          continue;
        }

        match = scan(reIndex, input, pos);
        if (match) {
          tokens.push({ kind: T.INDEX, value: match, index: pos });
          pos += match.length;
          continue;
        }

        tokens.push({
          kind: T.ERROR,
          value: "unknown token '" + String.fromCharCode(ch) + "'",
          index: pos
        });
        pos += 1;
    }
  }

  return tokens;
}

function scan(pattern, input, pos) {
  pattern.lastIndex = pos;
  var match = pattern.exec(input);
  pattern.lastIndex = 0;
  return match ? match[0] : null;
}

function scanSingleQuotedString(input, pos) {
  var start = pos;
  var length = input.length;

  /** @type {number} */
  var ch = NaN;

  /** @type {import("./token").TokenKind} */
  var kind = T.SINGLE_QUOTED_STRING;

  while (pos < length) {
    ch = input.charCodeAt(pos);

    switch (ch) {
      case 92: // \
        if (input.charCodeAt(pos + 1) === 34) {
          throw new Error("invalid escape sequence '\\\"' at " + pos);
        }
        pos += 2;
        kind = T.SINGLE_QUOTED_ESC_STRING;
        break;
      case NaN:
        return [
          { kind: T.ERROR, value: "unclosed string literal", index: start },
          length
        ];
      case 39: // '
        return [
          { kind: kind, value: input.slice(start, pos), index: start },
          pos + 1
        ];
      default:
        // Might as well do this here while where iterating code points.
        // This does break our T.ERROR token policy though.
        if (ch <= 0x1f) {
          // TODO: display ch as hex
          throw new Error("invalid character " + ch + " at " + pos);
        }
        pos += 1;
    }
  }

  return [
    { kind: T.ERROR, value: "unclosed string literal", index: start },
    length
  ];
}

function scanDoubleQuotedString(input, pos) {
  var start = pos;
  var length = input.length;

  /** @type {number} */
  var ch = NaN;

  /** @type {import("./token").TokenKind} */
  var kind = T.DOUBLE_QUOTED_STRING;

  while (pos < length) {
    ch = input.charCodeAt(pos);

    switch (ch) {
      case 92: // \
        if (input.charCodeAt(pos + 1) === 39) {
          throw new Error("invalid escape sequence '\\\'' at " + pos);
        }
        pos += 2;
        kind = T.DOUBLE_QUOTED_ESC_STRING;
        break;
      case NaN:
        return [
          { kind: T.ERROR, value: "unclosed string literal", index: start },
          length
        ];
      case 34: // "
        return [
          { kind: kind, value: input.slice(start, pos), index: start },
          pos + 1
        ];
      default:
        // Might as well do this here while where iterating code points.
        // This does break our T.ERROR token policy though.
        if (ch <= 0x1f) {
          // TODO: display ch as hex
          throw new Error("invalid character " + ch + " at " + pos);
        }

        pos += 1;
    }
  }

  return [
    { kind: T.ERROR, value: "unclosed string literal", index: start },
    length
  ];
}
