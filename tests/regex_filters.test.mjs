import JSONPath from "../dist/jsonpath-2007.cjs.js";

describe("match filter", () => {
  test("don't replace dot in character group", () => {
    const query = "$[?match(@, 'ab[.c]d')]";
    const data = ["abcd", "ab.d", "abxd"];
    const nodes = JSONPath.find(query, data);
    const values = nodes.map((node) => node.value);
    expect(values).toStrictEqual(["abcd", "ab.d"]);
  });

  test("don't replace escaped dots", () => {
    const query = "$[?match(@, 'ab\\\\.d')]";
    const data = ["abcd", "ab.d", "abxd"];
    const nodes = JSONPath.find(query, data);
    const values = nodes.map((node) => node.value);
    expect(values).toStrictEqual(["ab.d"]);
  });

  test("handle escaped right square bracket in character group", () => {
    const query = "$[?match(@, 'ab[\\\\].c]d')]";
    const data = ["abcd", "ab.d", "abxd"];
    const nodes = JSONPath.find(query, data);
    const values = nodes.map((node) => node.value);
    expect(values).toStrictEqual(["abcd", "ab.d"]);
  });

  test("explicit start caret", () => {
    const query = "$[?match(@, '^ab.*')]";
    const data = ["abcd", "ab.d", "axc"];
    const nodes = JSONPath.find(query, data);
    const values = nodes.map((node) => node.value);
    expect(values).toStrictEqual(["abcd", "ab.d"]);
  });

  test("explicit end dollar", () => {
    const query = "$[?match(@, '.bc$')]";
    const data = ["abcd", "abc", "axc"];
    const nodes = JSONPath.find(query, data);
    const values = nodes.map((node) => node.value);
    expect(values).toStrictEqual(["abc"]);
  });
});
