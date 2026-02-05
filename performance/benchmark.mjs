import { Bench, nToMs } from "tinybench";
import JSONPath from "../dist/jsonpath.js";
import cts from "../tests/cts/cts.json" with { type: "json" };

function validQueries() {
  return cts.tests
    .filter((testCase) => testCase.invalid_selector !== true)
    .map((testCase) => {
      return { query: testCase.selector, data: testCase.document };
    });
}

const TEST_CASES = validQueries();

const COMPILED_QUERIES = TEST_CASES.map((t) => {
  return { query: JSONPath.compile(t.query), data: t.data };
});

// XXX: This is specific to Bun.
// https://github.com/tinylibs/tinybench/blob/main/examples/src/simple-bun.ts

// const bench = new Bench({
//   name: "JSONPath Valid CTS Queries",
//   now: () => nToMs(Bun.nanoseconds()),
//   setup: (_task, mode) => {
//     // Run the garbage collector before warmup at each cycle
//     if (mode === "warmup") {
//       Bun.gc(true);
//     }
//   },
//   time: 1000,
// });

const bench = new Bench({
  name: "JSONPath Valid CTS Queries",
  setup: (_task, mode) => {
    // Run the garbage collector before warmup at each cycle
    if (mode === "warmup" && typeof globalThis.gc === "function") {
      globalThis.gc();
    }
  },
  time: 1000,
});

bench.add("just compile", () => {
  for (const t of TEST_CASES) {
    JSONPath.compile(t.query);
  }
});

bench.add("just find", () => {
  for (const t of COMPILED_QUERIES) {
    JSONPath.resolve(t.query, t.data);
  }
});

bench.add("compile and find", () => {
  for (const t of TEST_CASES) {
    JSONPath.find(t.query, t.data);
  }
});

await bench.run();

console.log(bench.name);
console.table(bench.table());
