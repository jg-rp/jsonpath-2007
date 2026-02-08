import { Bench, nToMs } from "tinybench";
import JSONPath from "../dist/jsonpath-2007.cjs.js";
import json_p3_es3 from "../dist/json-p3.es3.js";
import json_p3 from "../dist/json-p3.cjs.js";
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

const P3_COMPILED_QUERIES = TEST_CASES.map((t) => {
  return { query: json_p3.compile(t.query), data: t.data };
});

const P3_ES3_COMPILED_QUERIES = TEST_CASES.map((t) => {
  return { query: json_p3_es3.compile(t.query), data: t.data };
});

const benchOptions = {
  name: `JSONPath - ${COMPILED_QUERIES.length} Valid CTS Queries per op`,
  time: 10000
};

if (process.versions.bun) {
  benchOptions.now = () => nToMs(Bun.nanoseconds());
  benchOptions.setup = (_task, mode) => {
    // Run the garbage collector before warmup at each cycle
    if (mode === "warmup") {
      Bun.gc(true);
    }
  };
} else {
  benchOptions.setup = (_task, mode) => {
    // Run the garbage collector before warmup at each cycle
    if (mode === "warmup" && typeof globalThis.gc === "function") {
      globalThis.gc();
    }
  };
}

const bench = new Bench(benchOptions);

bench.add("jsonpath-2007 just compile", () => {
  for (const t of TEST_CASES) {
    JSONPath.compile(t.query);
  }
});

bench.add("jsonpath-2007 just find", () => {
  for (const t of COMPILED_QUERIES) {
    JSONPath.resolve(t.query, t.data);
  }
});

bench.add("jsonpath-2007 compile and find", () => {
  for (const t of TEST_CASES) {
    JSONPath.find(t.query, t.data);
  }
});

bench.add("P3 (current) just compile", () => {
  for (const t of TEST_CASES) {
    json_p3.compile(t.query);
  }
});

bench.add("P3 (current) just find", () => {
  for (const t of P3_COMPILED_QUERIES) {
    t.query.query(t.data);
  }
});

bench.add("P3 (current) compile and find", () => {
  for (const t of TEST_CASES) {
    json_p3.query(t.query, t.data);
  }
});

bench.add("P3 (ES3 build) just compile", () => {
  for (const t of TEST_CASES) {
    json_p3_es3.compile(t.query);
  }
});

bench.add("P3 (ES3 build) just find", () => {
  for (const t of P3_ES3_COMPILED_QUERIES) {
    t.query.query(t.data);
  }
});

bench.add("P3 (ES3 build) compile and find", () => {
  for (const t of TEST_CASES) {
    json_p3_es3.query(t.query, t.data);
  }
});

await bench.run();

function tableConverter(task) {
  const state = task.result.state;
  return {
    "Task name": task.name,
    ...(state === "aborted-with-statistics" || state === "completed"
      ? {
          "Throughput avg (ops/s)": `${Math.round(task.result.throughput.mean).toString()} \xb1 ${task.result.throughput.rme.toFixed(2)}%`,
          Samples: task.result.latency.samplesCount
        }
      : state !== "errored"
        ? {
            "Throughput avg (ops/s)": "N/A",
            Remarks: state
          }
        : {
            Error: task.result.error.message,
            Stack: task.result.error.stack ?? "N/A"
          }),
    ...(state === "aborted-with-statistics" && {
      Remarks: state
    })
  };
}

console.log(bench.name);
console.table(bench.table(tableConverter));
