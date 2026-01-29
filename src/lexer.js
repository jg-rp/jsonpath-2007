import { Token, Tokens } from "./token";

const reFloat = /((?:-?\d+\.\d+(?:[eE][+-]?\d+)?)|(-?\d+[eE]-\d+))/y;
const reFunctionCall = /[a-z][a-z_0-9]*(?=\()/y;
const reIndex = /-?\d+/y;
const reInt = /-?\d+(?:[eE]\+?\d+)?/y;
const reName = /[\u0080-\uFFFFa-zA-Z_][\u0080-\uFFFFa-zA-Z0-9_-]*/y;
const reTrivia = /[[ \n\r\t]]+/y;

export class Lexer {
  /**
   * @callback LexerState
   * @returns {LexerState|null}
   */

  /** @type {string} */
  input;

  /** @type {Array<Token>} */
  tokens;

  /** @type {number} */
  #start;

  /** @type {number} */
  #pos;

  /** @type {number} */
  #filterDepth;

  /** @type {Array<number>} */
  #callStack;

  /** @type {Array<string>} */
  #bracketStack;

  /**
   *
   * @param {string} input
   */
  constructor(input) {
    this.input = input;
    this.tokens = [];
    this.#start = 0;
    this.#pos = 0;
    this.#filterDepth = 0;
    this.#callStack = [];
    this.#bracketStack = [];
  }

  /**
   *
   * @param {string} input
   * @returns {Array<Token>}
   */
  static tokenize(input) {
    const lexer = new Lexer(input);
    lexer.run();
    return lexer.tokens;
  }

  /**
   * Populate this.tokens with tokens.
   * @returns {void}
   */
  run() {
    /** @type {LexerState|null} */
    let state = this.#lexRoot;
    while (state) {
      state = state();
    }
  }

  /** @type {LexerState} */
  #lexRoot() {
    const ch = this.#peek();
    if (ch === "$") {
      this.#pos += 1;
      this.#emit(Tokens.DOLLAR);
      return this.#lexSegment;
    }

    this.#error(`expected '$', found '${ch}'`);
    return null;
  }

  /** @type {LexerState} */
  #lexSegment() {
    if (this.#skip(reTrivia) && !this.#peek()) {
      this.#error("unexpected trailing whitespace");
      return null;
    }

    const ch = this.#next();

    switch (ch) {
      case undefined:
        this.#emit(Tokens.EOI);
        return null;
      case ".":
        if (this.#peek() === ".") {
          this.#next();
          this.#emit(Tokens.DOUBLE_DOT);
          return this.#lexDescendantSegment;
        }

        this.#emit(Tokens.DOT);
        return this.#lexDotSelector;
      case "[":
        this.#enterBracketedSegment();
        this.#emit(Tokens.LEFT_BRACKET);
        return this.#lexInsideBracketedSegment;
      default:
        this.#backup();
        if (this.#filterDepth) return this.#lexInsideFilter;
        this.#error(
          `expected '.', '..' or a bracketed selection, found '${ch}'`,
        );
        return null;
    }
  }

  /** @type {LexerState} */
  #lexDescendantSegment() {
    const match = this.#scan(reName);
    if (match) {
      // Shorthand name
      this.#emit(Tokens.NAME, match);
      return this.#lexSegment;
    }

    const ch = this.#next();
    switch (ch) {
      case undefined:
        this.#error("unexpected bald descendant segment");
        return null;
      case "*":
        this.#emit(Tokens.ASTERISK);
        return this.#lexSegment;
      case "[":
        this.#enterBracketedSegment();
        this.#emit(Tokens.LEFT_BRACKET);
        return this.#lexInsideBracketedSegment;
      default:
        this.#backup();
        this.#error(`unexpected descendent selection token '${ch}'`);
        return null;
    }
  }

  /** @type {LexerState} */
  #lexDotSelector() {
    if (this.#skip(reTrivia)) {
      this.#error("unexpected whitespace between dot and shorthand selector");
      return null;
    }

    const match = this.#scan(reName);
    if (match) {
      // Shorthand name
      this.#emit(Tokens.NAME, match);
      return this.#lexSegment;
    }

    const ch = this.#next();
    if (ch === "*") {
      this.#emit(Tokens.ASTERISK);
      return this.#lexSegment;
    }

    this.#backup();
    this.#error("expected a shorthand name or wild card selector");
    return null;
  }

  /** @type {LexerState} */
  #lexInsideBracketedSegment() {
    for (;;) {
      this.#skip(reTrivia);

      const match = this.#scan(reIndex);
      if (match) {
        this.#emit(Tokens.INDEX, match);
        continue;
      }

      const ch = this.#next();
      switch (ch) {
        case undefined:
          this.#error("unclosed bracketed segment");
          return null;
        case "]":
          if (this.#bracketStack.pop() !== "[") {
            this.#backup();
            this.#error("unbalanced brackets");
            return null;
          }

          this.#emit(Tokens.RIGHT_BRACKET);
          return this.#lexSegment;
        case "*":
          this.#emit(Tokens.ASTERISK);
          break;
        case "?":
          this.#emit(Tokens.QUESTION);
          this.#enterFilterSelector();
          return this.#lexInsideFilter;
        case ",":
          this.#emit(Tokens.COMMA);
          break;
        case ":":
          this.#emit(Tokens.COLON);
          break;
        case "'":
          this.#acceptSingleQuotedString();
          break;
        case '"':
          this.#acceptDoubleQuotedString();
          break;
        default:
          this.#backup();
          this.#error(`unexpected token '${ch}' in bracketed segment`);
          return null;
      }
    }
  }

  /** @type {LexerState} */
  #lexInsideFilter() {
    let match;

    for (;;) {
      this.#skip(reTrivia);
      const ch = this.#next();
      switch (ch) {
        case undefined:
          this.#error("unclosed bracketed segment");
          return null;
        case "]":
          this.#leaveFilter();
          this.#backup();
          return this.#lexInsideBracketedSegment;
        case ",":
          this.#emit(Tokens.COMMA);
          // Inside a function call?
          if (this.#callStack.length > 0) continue;
          this.#leaveFilter();
          return this.#lexInsideBracketedSegment;
        case "(":
          this.#bracketStack.push("(");
          this.#emit(Tokens.LEFT_PAREN);
          if (this.#callStack.length > 0) {
            // @ts-ignore
            this.#callStack[this.#callStack.length - 1] += 1;
          }
          break;
        case ")":
          if (this.#bracketStack.pop() !== "(") {
            this.#backup();
            this.#error("unbalanced brackets");
            return null;
          }

          this.#emit(Tokens.RIGHT_PAREN);

          // Are we closing a function call or a parenthesized expression?
          if (this.#callStack.length > 0) {
            // @ts-ignore
            this.#callStack[this.#callStack.length - 1] -= 1;
            if (this.#callStack[this.#callStack.length - 1] === 0) {
              this.#callStack.pop();
            }
          }
          break;
        case "$":
          this.#emit(Tokens.DOLLAR);
          return this.#lexSegment;
        case "@":
          this.#emit(Tokens.AT);
          return this.#lexSegment;
        case ".":
          // TODO: is this needed?
          this.#backup();
          return this.#lexSegment;
        case "!":
          if (this.#peek() === "=") {
            this.#next();
            this.#emit(Tokens.NE);
          } else {
            this.#emit(Tokens.NOT);
          }
          break;
        case "=":
          if (this.#peek() === "=") {
            this.#next();
            this.#emit(Tokens.EQ);
          } else {
            this.#backup();
            this.#error("unexpected operator, did you mean '=='?");
            return null;
          }
          break;
        case "<":
          if (this.#peek() === "=") {
            this.#next();
            this.#emit(Tokens.LE);
          } else {
            this.#emit(Tokens.LT);
          }
          break;
        case ">":
          if (this.#peek() === "=") {
            this.#next();
            this.#emit(Tokens.GE);
          } else {
            this.#emit(Tokens.GT);
          }
          break;
        case "&":
          if (this.#peek() === "&") {
            this.#next();
            this.#emit(Tokens.AND);
          } else {
            this.#backup();
            this.#error("unexpected operator, did you mean '&&'?");
            return null;
          }
          break;
        case "|":
          if (this.#peek() === "||") {
            this.#next();
            this.#emit(Tokens.OR);
          } else {
            this.#backup();
            this.#error("unexpected operator, did you mean '||'?");
            return null;
          }
          break;
        case "'":
          if (!this.#acceptSingleQuotedString()) {
            return null;
          }
          break;
        case '"':
          if (!this.#acceptDoubleQuotedString()) {
            return null;
          }
          break;
        default:
          this.#backup();

          if (this.#scan(/true/y)) {
            this.#emit(Tokens.TRUE);
            continue;
          }

          if (this.#scan(/false/y)) {
            this.#emit(Tokens.FALSE);
            continue;
          }

          if (this.#scan(/null/y)) {
            this.#emit(Tokens.FALSE);
            continue;
          }

          match = this.#scan(reInt);
          if (match) {
            this.#emit(Tokens.INTEGER);
            continue;
          }

          match = this.#scan(reFloat);
          if (match) {
            this.#emit(Tokens.FLOAT);
            continue;
          }

          match = this.#scan(reFunctionCall);
          if (match) {
            this.#callStack.push(1);
            this.#emit(Tokens.FUNCTION);
            this.#bracketStack.push("(");
            this.#next(); // '('
            this.#emit(Tokens.LEFT_PAREN);
            continue;
          }

          this.#error(`unexpected filter selector token '${ch}'`);
          return null;
      }
    }
  }

  /**
   * @returns {boolean}
   */
  #acceptSingleQuotedString() {
    this.#ignore(); // '

    /** @type {import("./token").TokenKind} */
    let kind = Tokens.SINGLE_QUOTED_STRING;

    for (;;) {
      switch (this.#next()) {
        case "\\":
          this.#next();
          kind = Tokens.SINGLE_QUOTED_ESC_STRING;
          break;
        case undefined:
          this.#backup();
          this.#error("unclosed string literal");
          return false;
        case "'":
          this.#backup();
          this.#emit(kind, this.input.slice(this.#start, this.#pos));
          this.#next();
          this.#ignore();
          return true;
      }
    }
  }

  /**
   * @returns {boolean}
   */
  #acceptDoubleQuotedString() {
    this.#ignore(); // ""

    /** @type {import("./token").TokenKind} */
    let kind = Tokens.DOUBLE_QUOTED_STRING;

    for (;;) {
      switch (this.#next()) {
        case "\\":
          this.#next();
          kind = Tokens.DOUBLE_QUOTED_ESC_STRING;
          break;
        case undefined:
          this.#backup();
          this.#error("unclosed string literal");
          return false;
        case '"':
          this.#backup();
          this.#emit(kind, this.input.slice(this.#start, this.#pos));
          this.#next();
          this.#ignore();
          return true;
      }
    }
  }

  /**
   * Emit a new token.
   * @param {import("./token").TokenKind} kind
   * @param {string|undefined} value
   * @returns {void}
   */
  #emit(kind, value = undefined) {
    this.tokens.push(new Token(kind, value, this.#start));
    this.#start = this.#pos;
  }

  /**
   * Return the next character and advance the character pointer.
   * @returns {string|undefined}
   */
  #next() {
    const s = this.input[this.#pos];
    if (this.#pos < this.input.length) {
      this.#pos += 1;
    }
    return s;
  }

  /**
   * Return the next character without advancing the character pointer.
   * @returns {string|undefined}
   */
  #peek() {
    return this.input[this.#pos];
  }

  /**
   * @returns {void}
   */
  #ignore() {
    this.#start = this.#pos;
  }

  /**
   * @returns {void}
   */
  #backup() {
    if (this.#pos > this.#start) {
      this.#pos -= 1;
    }
  }

  /**
   *
   * @param {RegExp} pattern
   * @returns {string|undefined}
   */
  #scan(pattern) {
    pattern.lastIndex = this.#pos;
    const match = pattern.exec(this.input);
    pattern.lastIndex = 0;

    if (match) {
      this.#pos += match[0].length;
      return match[0];
    }

    return undefined;
  }

  /**
   *
   * @param {RegExp} pattern
   * @returns {boolean}
   */
  #skip(pattern) {
    return !!this.#scan(pattern);
  }

  /**
   * Emit an error token.
   * @param {string} message
   * @return {void}
   */
  #error(message) {
    this.tokens.push(new Token(Tokens.ERROR, message, this.#pos));
  }

  #enterBracketedSegment() {
    this.#bracketStack.push("[");
  }

  #enterFilterSelector() {
    this.#filterDepth += 1;
  }

  #leaveFilter() {
    this.#filterDepth -= 1;
  }
}
