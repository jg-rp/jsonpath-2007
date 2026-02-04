import { tokenize } from "../src/lexer";
import { Token, T } from "../src/token";

describe("tokenize JSONPath", () => {
  test("shorthand name", () => {
    expect(tokenize("$.foo.bar")).toStrictEqual([
      new Token(T.DOLLAR, "$", 0),
      new Token(T.DOT, ".", 1),
      new Token(T.NAME, "foo", 2),
      new Token(T.DOT, ".", 5),
      new Token(T.NAME, "bar", 6),
    ]);
  });

  // TODO: more tests

  test("float literal", () => {
    expect(tokenize("$[?@.foo > 42.7]")).toStrictEqual([
      new Token(T.DOLLAR, "$", 0),
      new Token(T.LEFT_BRACKET, "[", 1),
      new Token(T.QUESTION, "?", 2),
      new Token(T.AT, "@", 3),
      new Token(T.DOT, ".", 4),
      new Token(T.NAME, "foo", 5),
      new Token(T.TRIVIA, " ", 8),
      new Token(T.GT, ">", 9),
      new Token(T.TRIVIA, " ", 10),
      new Token(T.FLOAT, "42.7", 11),
      new Token(T.RIGHT_BRACKET, "]", 15),
    ]);
  });
});
