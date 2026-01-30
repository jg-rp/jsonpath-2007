import { tokenize } from "../src/lexer";
import { Token, Tokens } from "../src/token";

describe("tokenize JSONPath", () => {
  test("shorthand name", () => {
    expect(tokenize("$.foo.bar")).toStrictEqual([
      new Token(Tokens.DOLLAR, undefined, 0),
      new Token(Tokens.DOT, undefined, 1),
      new Token(Tokens.NAME, "foo", 2),
      new Token(Tokens.DOT, undefined, 5),
      new Token(Tokens.NAME, "bar", 6),
    ]);
  });

  // TODO: more tests

  test("float literal", () => {
    expect(tokenize("$[?@.foo > 42.7]")).toStrictEqual([
      new Token(Tokens.DOLLAR, undefined, 0),
      new Token(Tokens.LEFT_BRACKET, undefined, 1),
      new Token(Tokens.QUESTION, undefined, 2),
      new Token(Tokens.AT, undefined, 3),
      new Token(Tokens.DOT, undefined, 4),
      new Token(Tokens.NAME, "foo", 5),
      new Token(Tokens.TRIVIA, " ", 8),
      new Token(Tokens.GT, undefined, 9),
      new Token(Tokens.TRIVIA, " ", 10),
      new Token(Tokens.FLOAT, "42.7", 11),
      new Token(Tokens.RIGHT_BRACKET, undefined, 15),
    ]);
  });
});
