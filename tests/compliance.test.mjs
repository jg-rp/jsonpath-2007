import JSONPath from "../dist/jsonpath.js";
import cts from "./cts/cts.json" with { type: "json" };

const TEST_CASES = cts.tests.map((t) => [
  t.name,
  t.selector,
  t.document,
  t.result,
  t.result_paths,
  t.results,
  t.results_paths,
  t.invalid_selector
]);

describe("JSONPath Compliance Test Suite", () => {
  test.each(TEST_CASES)(
    "%s",
    (
      _,
      query,
      data,
      result,
      resultPaths,
      results,
      resultsPaths,
      invalidSelector
    ) => {
      if (invalidSelector) {
        expect(() => JSONPath.compile(query)).toThrow(JSONPath.JSONPathError);
      } else {
        const nodes = JSONPath.find(query, data);
        const paths = nodes.map((n) => JSONPath.canonicalPath(n));

        if (result) {
          expect(nodes.map((n) => n.value)).toStrictEqual(result);
          expect(paths).toStrictEqual(resultPaths);
        } else if (results) {
          expect(results).toContainEqual(nodes.map((n) => n.value));
          expect(resultsPaths).toContainEqual(paths);
        }
      }
    }
  );
});
