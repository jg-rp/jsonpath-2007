import { tokenize } from "../src/lexer";
import { Token, T } from "../src/token";

describe("tokenize JSONPath", () => {
  test("shorthand name", () => {
    expect(tokenize("$.foo.bar")).toStrictEqual([
      new Token(T.DOLLAR, undefined, 0),
      new Token(T.DOT, undefined, 1),
      new Token(T.NAME, "foo", 2),
      new Token(T.DOT, undefined, 5),
      new Token(T.NAME, "bar", 6),
    ]);
  });

  // TODO: more tests

  test("float literal", () => {
    expect(tokenize("$[?@.foo > 42.7]")).toStrictEqual([
      new Token(T.DOLLAR, undefined, 0),
      new Token(T.LEFT_BRACKET, undefined, 1),
      new Token(T.QUESTION, undefined, 2),
      new Token(T.AT, undefined, 3),
      new Token(T.DOT, undefined, 4),
      new Token(T.NAME, "foo", 5),
      new Token(T.TRIVIA, " ", 8),
      new Token(T.GT, undefined, 9),
      new Token(T.TRIVIA, " ", 10),
      new Token(T.FLOAT, "42.7", 11),
      new Token(T.RIGHT_BRACKET, undefined, 15),
    ]);
  });
});
