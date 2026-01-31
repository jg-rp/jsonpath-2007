import { Bench, nToMs } from "tinybench";
import { tokenize } from "../src/lexer";
import cts from "../tests/cts/cts.json" with { type: "json" };

function validQueries() {
  return cts.tests
    .filter((testCase) => testCase.invalid_selector !== true)
    .map((testCase) => {
      return testCase.selector;
    });
}

const queries = validQueries();

// XXX: This is specific to Bun.
// https://github.com/tinylibs/tinybench/blob/main/examples/src/simple-bun.ts

const bench = new Bench({
  name: "JSONPath tokenization",
  now: () => nToMs(Bun.nanoseconds()),
  setup: (_task, mode) => {
    // Run the garbage collector before warmup at each cycle
    if (mode === "warmup") {
      Bun.gc(true);
    }
  },
  time: 10000,
});

bench.add("big switch", () => {
  for (const query of queries) {
    tokenize(query);
  }
});

await bench.run();

console.log(bench.name);
console.table(bench.table());
