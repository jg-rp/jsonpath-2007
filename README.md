# jsonpath-2007

**RFC 9535 JSONPath implemented like it's 2007.**

In honour of [Stefan Gössner's original JSONPath implementation from 2007](https://code.google.com/archive/p/jsonpath/), jsonpath-2007 implements the [RFC 9535 JSONPath specification](https://www.rfc-editor.org/rfc/rfc9535) using hand-crafted [ECMAScript 3](https://en.wikipedia.org/wiki/ECMAScript_version_history) only. There's no TypeScript, no modern syntax, and no build system. Just plain objects, a bunch of functions, and a Makefile.

These self-imposed constraints are partly historical and partly experimental (and I was looking for an excuse to avoid doing the work I was meant to be doing). Take a look at the [benchmarks](#benchmark) to see how idiomatic ES3 performs compared to transpiled TypeScript.

> [!NOTE]  
> The included `match` and `search` function extensions are _non-checking_. I-Regexp expressions are mapped directly to ECMAScript RegExp according to [Section 5 of RFC 9485](https://www.rfc-editor.org/rfc/rfc9485.html#name-mapping-i-regexp-to-regexp-) without validating full compliance.

## Example

```javascript
import jsonpath from "jsonpath-2007";

const query = "$.store.book[*].author";

const data = {
  store: {
    book: [
      {
        category: "reference",
        author: "Nigel Rees",
        title: "Sayings of the Century",
        price: 8.95
      },
      {
        category: "fiction",
        author: "Evelyn Waugh",
        title: "Sword of Honour",
        price: 12.99
      },
      {
        category: "fiction",
        author: "Herman Melville",
        title: "Moby Dick",
        isbn: "0-553-21311-3",
        price: 8.99
      },
      {
        category: "fiction",
        author: "J. R. R. Tolkien",
        title: "The Lord of the Rings",
        isbn: "0-395-19395-8",
        price: 22.99
      }
    ],
    bicycle: {
      color: "red",
      price: 19.95
    }
  }
};

const nodes = jsonpath.find(query, data);
const values = nodes.map((node) => node.value);
const paths = nodes.map((node) => jsonpath.canonicalPath(node));

console.log(values);
console.log(paths);
```

## Links

- GitHub: https://github.com/jg-rp/jsonpath-2007
- NPM: TODO:
- Change log: https://github.com/jg-rp/jsonpath-2007/blob/main/CHANGELOG.md
- Issue tracker: https://github.com/jg-rp/jsonpath-2007/issues

## Usage

### find

`find(query: string, data: object): Array<JSONPathNode>`

Apply JSONPath expression `query` to JSON-like data `data`. An array of `JSONPathNode` objects is returned, one node for each value in `data` matched by `query`. The array will be empty if there are no matches.

A `JSONPathNode` is a plain object:

```typescript
type JSONPathNode = {
  value: unknown;
  location: Array<string | number>;
};
```

Use `jsonpath.canonicalPath(node: JSONPathNode): string` to get the normalized path for a node.

```javascript
import jsonpath from "jsonpath-2007";

const data = {
  users: [
    { name: "Sue", score: 100 },
    { name: "John", score: 86 },
    { name: "Sally", score: 84 },
    { name: "Jane", score: 55 }
  ]
};

const nodes = jsonpath.find("$.users[?@.score < 100].name", data);
const values = nodes.map((node) => node.value);
const paths = nodes.map((node) => jsonpath.canonicalPath(node));

console.log(values);
console.log(paths);
```

### compile

`compile(query: string): JSONPathQuery`

Compile a JSONPath expression for repeated application to different data. Use `jsonpath.resolve(compiledQuery, data)` to apply a compiled query to JSON-like data.

```javascript
import jsonpath from "jsonpath-2007";

const data = {
  users: [
    { name: "Sue", score: 100 },
    { name: "John", score: 86 },
    { name: "Sally", score: 84 },
    { name: "Jane", score: 55 }
  ]
};

const compiledQuery = jsonpath.compile("$.users[?@.score < 100].name");
const nodes = jsonpath.resolve(compiledQuery, data);
const values = nodes.map((node) => node.value);

console.log(values);
```

## Function extensions

`find`, `compile` and `resolve` all accept an optional `options` object as their last argument. Currently, the only supported option is `functionExtensions`, a mapping of JSONPath function names to their definitions. A function extension definition is a plain object with the following type (see [Type System for Function Expressions](https://www.rfc-editor.org/rfc/rfc9535#name-type-system-for-function-ex)).

```typescript
type FunctionDefinition = {
  argTypes: Array<"ValueType"|"LogicalType"|"NodesType">;
  returnType: "ValueType"|"LogicalType"|"NodesType";
  call: (...unknown):unknown;
};
```

Use `jsonpath.standardFunctionExtensions()` to get a copy of the built-in JSONPath function definitions, then update it with your own and pass it to `find`, `compile` or `resolve`.

```javascript
import jsonpath from "jsonpath-2007";

const TimesTwoFunction = {
  argTypes: ["ValueType"],
  returnType: "ValueType",
  call: (value) => {
    if (isNumber(value)) {
      return value * 2;
    }

    return jsonpath.NOTHING;
  }
};

const options = { functionExtensions: JSONPath.standardFunctionExtensions() };
options.functionExtensions["x2"] = TimesTwoFunction;

const nodes = jsonpath.find("$.some.query", someData, options);
// ...
```

## Benchmark

Benchmarks were run against all valid queries from the [JSONPath Compliance Test Suite](https://github.com/jsonpath-standard/jsonpath-compliance-test-suite) (many small queries run against small data) under both **Node.js v24.13.0 (V8)** and **Bun 1.3.8 (JavaScriptCore)**. Results compare three implementations: **jsonpath-2007** (hand-written ES3), **P3 (current)** (modern TypeScript build), and **P3 (ES3 build)** (TypeScript transpiled down to ES3).

**Node.js v24.13.0 on an M2 Mac Mini**

```
JSONPath - 456 Valid CTS Queries per op
┌─────────┬───────────────────────────────────┬────────────────────────┬─────────┐
│ (index) │ Task name                         │ Throughput avg (ops/s) │ Samples │
├─────────┼───────────────────────────────────┼────────────────────────┼─────────┤
│ 0       │ 'jsonpath-2007 just compile'      │ '6797 ± 0.04%'         │ 67712   │
│ 1       │ 'jsonpath-2007 just find'         │ '4861 ± 0.05%'         │ 48439   │
│ 2       │ 'jsonpath-2007 compile and find'  │ '2735 ± 0.05%'         │ 27279   │
│ 3       │ 'P3 (current) just compile'       │ '3068 ± 0.04%'         │ 30635   │
│ 4       │ 'P3 (current) just find'          │ '1497 ± 0.07%'         │ 14940   │
│ 5       │ 'P3 (current) compile and find'   │ '988 ± 0.07%'          │ 9864    │
│ 6       │ 'P3 (ES3 build) just compile'     │ '822 ± 0.05%'          │ 8212    │
│ 7       │ 'P3 (ES3 build) just find'        │ '861 ± 0.17%'          │ 8503    │
│ 8       │ 'P3 (ES3 build) compile and find' │ '408 ± 0.17%'          │ 4066    │
└─────────┴───────────────────────────────────┴────────────────────────┴─────────┘
```

**Bun 1.3.8 on an M2 Mac Mini**

```
JSONPath - 456 Valid CTS Queries per op
┌───┬─────────────────────────────────┬────────────────────────┬─────────┐
│   │ Task name                       │ Throughput avg (ops/s) │ Samples │
├───┼─────────────────────────────────┼────────────────────────┼─────────┤
│ 0 │ jsonpath-2007 just compile      │ 7084 ± 0.10%           │ 66920   │
│ 1 │ jsonpath-2007 just find         │ 4272 ± 0.13%           │ 40893   │
│ 2 │ jsonpath-2007 compile and find  │ 2501 ± 0.18%           │ 24081   │
│ 3 │ P3 (current) just compile       │ 3207 ± 0.12%           │ 31230   │
│ 4 │ P3 (current) just find          │ 3192 ± 0.17%           │ 30093   │
│ 5 │ P3 (current) compile and find   │ 1447 ± 0.23%           │ 13972   │
│ 6 │ P3 (ES3 build) just compile     │ 1719 ± 0.14%           │ 16933   │
│ 7 │ P3 (ES3 build) just find        │ 1011 ± 0.23%           │ 9905    │
│ 8 │ P3 (ES3 build) compile and find │ 573 ± 0.26%            │ 5652    │
└───┴─────────────────────────────────┴────────────────────────┴─────────┘
```

Across both runtimes, **jsonpath-2007 is consistently the fastest implementation**. Under Node.js, it achieves roughly **2.2x higher throughput for compilation**, **3.2x for evaluation**, and **2.8x for combined compile+find** compared to the current TypeScript build. The ES3-transpiled P3 build performs substantially worse, typically **6-7x slower** than jsonpath-2007 for compile-heavy workloads and **~4x slower** for combined operations.

Under Bun, the gap narrows for evaluation-heavy workloads but remains significant overall. jsonpath-2007 is still about **2.2x faster for compilation**, **~1.3x faster for evaluation**, and **~1.7x faster for combined compile+find** compared to the current P3 build. As with Node.js, the ES3-transpiled P3 build consistently underperforms both alternatives, indicating that simply targeting ES3 at the compiler level does not recover the performance characteristics of an idiomatic ES3 codebase.
