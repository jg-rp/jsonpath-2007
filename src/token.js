export const Tokens = Object.freeze({
  AND: "AND",
  ASTERISK: "ASTERISK",
  AT: "AT",
  COLON: "COLON",
  COMMA: "COMMA",
  DOLLAR: "DOLLAR",
  DOT: "DOT",
  DOUBLE_DOT: "DOUBLE_DOT",
  DOUBLE_QUOTED_STRING: "DOUBLE_QUOTED_STRING",
  DOUBLE_QUOTED_ESC_STRING: "DOUBLE_QUOTED_ESC_STRING",
  EOI: "EOI",
  EQ: "EQ",
  ERROR: "ERROR",
  FALSE: "FALSE",
  FLOAT: "FLOAT",
  FUNCTION: "FUNCTION",
  GE: "GE",
  GT: "GT",
  INDEX: "INDEX",
  INTEGER: "INTEGER",
  LE: "LE",
  LEFT_BRACKET: "LEFT_BRACKET",
  LEFT_PAREN: "LEFT_PAREN",
  LG: "LG",
  LT: "LT",
  NAME: "NAME",
  NE: "NE",
  NOT: "NOT",
  NULL: "NULL",
  OR: "OR",
  QUESTION: "QUESTION",
  RIGHT_BRACKET: "RIGHT_BRACKET",
  RIGHT_PAREN: "RIGHT_PAREN",
  SINGLE_QUOTED_STRING: "SINGLE_QUOTED_STRING",
  SINGLE_QUOTED_ESC_STRING: "SINGLE_QUOTED_ESC_STRING",
  TRUE: "TRUE",
  TRIVIA: "TRIVIA",
  WORD: "WORD",
});

/**
 * @typedef {typeof Tokens[keyof typeof Tokens]} TokenKind
 */
export class Token {
  /**
   * @param {TokenKind} kind The kind of token.
   * @param {string|undefined} value The token's value, or `undefined` if `kind` is unambiguous.
   * @param {number} index The index of the start of this token in the input string.
   */
  constructor(kind, value, index) {
    this.kind = kind;
    this.value = value;
    this.index = index;
  }
}
