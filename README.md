# jsonpath-2007

**RFC 9535 JSONPath implemented like it's 2007.**

In honour of [Stefan Gössner's original JSONPath implementation from 2007](https://code.google.com/archive/p/jsonpath/), jsonpath-2007 implements the [RFC 9535 JSONPath specification](https://www.rfc-editor.org/rfc/rfc9535) using hand-crafted [ECMAScript 3](https://en.wikipedia.org/wiki/ECMAScript_version_history) only. There's no TypeScript, no modern syntax, and no build system. Just plain objects, a bunch of functions, and a Makefile.

These self-imposed constraints are partly historical and partly experimental. One surprising side effect is performance. Despite targeting the same semantics, jsonpath-2007 consistently [outperforms](#benchmarks) a TypeScript implementation (transpiled with Babel and bundled with Rollup) that takes a more conventional object-oriented approach.

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

## Benchmarks

TODO

```
james@Jamess-Mac-mini js-jsonpath % bun run performance/benchmark.mjs
JSONPath Valid CTS Queries
┌───┬──────────────────────────┬──────────────────┬──────────────────┬────────────────────────┬────────────────────────┬─────────┐
│   │ Task name                │ Latency avg (ns) │ Latency med (ns) │ Throughput avg (ops/s) │ Throughput med (ops/s) │ Samples │
├───┼──────────────────────────┼──────────────────┼──────────────────┼────────────────────────┼────────────────────────┼─────────┤
│ 0 │ just compile             │ 147590 ± 0.29%   │ 136209 ± 1584.0  │ 7098 ± 0.09%           │ 7342 ± 86              │ 67756   │
│ 1 │ just find                │ 248005 ± 0.29%   │ 231750 ± 1666.0  │ 4184 ± 0.12%           │ 4315 ± 31              │ 40322   │
│ 2 │ compile and find         │ 414604 ± 0.29%   │ 387917 ± 3334.0  │ 2483 ± 0.16%           │ 2578 ± 22              │ 24120   │
│ 3 │ P3(ES3) just compile     │ 572388 ± 0.20%   │ 554750 ± 4042.0  │ 1767 ± 0.12%           │ 1803 ± 13              │ 17471   │
│ 4 │ P3(ES3) just find        │ 865255 ± 0.35%   │ 817083 ± 8791.5  │ 1179 ± 0.20%           │ 1224 ± 13              │ 11558   │
│ 5 │ P3(ES3) compile and find │ 1579410 ± 0.33%  │ 1508000 ± 17271  │ 641 ± 0.23%            │ 663 ± 8                │ 6332    │
└───┴──────────────────────────┴──────────────────┴──────────────────┴────────────────────────┴────────────────────────┴─────────┘
james@Jamess-Mac-mini js-jsonpath % node performance/benchmark.mjs
(node:5181) ExperimentalWarning: Importing JSON modules is an experimental feature and might change at any time
(Use `node --trace-warnings ...` to show where the warning was created)
JSONPath Valid CTS Queries
┌─────────┬────────────────────────────┬───────────────────┬────────────────────┬────────────────────────┬────────────────────────┬─────────┐
│ (index) │ Task name                  │ Latency avg (ns)  │ Latency med (ns)   │ Throughput avg (ops/s) │ Throughput med (ops/s) │ Samples │
├─────────┼────────────────────────────┼───────────────────┼────────────────────┼────────────────────────┼────────────────────────┼─────────┤
│ 0       │ 'just compile'             │ '145015 ± 0.11%'  │ '139791 ± 417.00'  │ '6985 ± 0.07%'         │ '7154 ± 21'            │ 68959   │
│ 1       │ 'just find'                │ '200219 ± 0.10%'  │ '191833 ± 1083.0'  │ '5045 ± 0.08%'         │ '5213 ± 30'            │ 49946   │
│ 2       │ 'compile and find'         │ '359530 ± 0.11%'  │ '345875 ± 1375.0'  │ '2801 ± 0.09%'         │ '2891 ± 12'            │ 27815   │
│ 3       │ 'P3(ES3) just compile'     │ '1228830 ± 0.07%' │ '1215250 ± 3292.0' │ '815 ± 0.06%'          │ '823 ± 2'              │ 8138    │
│ 4       │ 'P3(ES3) just find'        │ '1250080 ± 0.56%' │ '1189604 ± 9979.5' │ '814 ± 0.18%'          │ '841 ± 7'              │ 8000    │
│ 5       │ 'P3(ES3) compile and find' │ '2557777 ± 0.46%' │ '2479084 ± 16459'  │ '394 ± 0.18%'          │ '403 ± 3'              │ 3910    │
└─────────┴────────────────────────────┴───────────────────┴────────────────────┴────────────────────────┴────────────────────────┴─────────┘
```

**P3 latest build**

```
JSONPath Valid CTS Queries
┌───┬─────────────────────┬──────────────────┬──────────────────┬────────────────────────┬────────────────────────┬─────────┐
│   │ Task name           │ Latency avg (ns) │ Latency med (ns) │ Throughput avg (ops/s) │ Throughput med (ops/s) │ Samples │
├───┼─────────────────────┼──────────────────┼──────────────────┼────────────────────────┼────────────────────────┼─────────┤
│ 0 │ just compile        │ 149952 ± 0.31%   │ 137750 ± 1791.0  │ 7013 ± 0.10%           │ 7260 ± 93              │ 66688   │
│ 1 │ just find           │ 246635 ± 0.29%   │ 230209 ± 1874.0  │ 4208 ± 0.12%           │ 4344 ± 35              │ 40546   │
│ 2 │ compile and find    │ 416937 ± 0.29%   │ 389667 ± 4459.0  │ 2471 ± 0.16%           │ 2566 ± 30              │ 23985   │
│ 3 │ P3 just compile     │ 321690 ± 0.23%   │ 308584 ± 3292.0  │ 3172 ± 0.11%           │ 3241 ± 35              │ 31086   │
│ 4 │ P3 just find        │ 331282 ± 0.40%   │ 306167 ± 2792.0  │ 3154 ± 0.15%           │ 3266 ± 30              │ 30186   │
│ 5 │ P3 compile and find │ 704066 ± 0.36%   │ 659084 ± 6666.0  │ 1458 ± 0.20%           │ 1517 ± 15              │ 14204   │
└───┴─────────────────────┴──────────────────┴──────────────────┴────────────────────────┴────────────────────────┴─────────┘
james@Jamess-Mac-mini js-jsonpath % node performance/benchmark.mjs
(node:5522) ExperimentalWarning: Importing JSON modules is an experimental feature and might change at any time
(Use `node --trace-warnings ...` to show where the warning was created)
JSONPath Valid CTS Queries
┌─────────┬───────────────────────┬───────────────────┬────────────────────┬────────────────────────┬────────────────────────┬─────────┐
│ (index) │ Task name             │ Latency avg (ns)  │ Latency med (ns)   │ Throughput avg (ops/s) │ Throughput med (ops/s) │ Samples │
├─────────┼───────────────────────┼───────────────────┼────────────────────┼────────────────────────┼────────────────────────┼─────────┤
│ 0       │ 'just compile'        │ '148534 ± 0.11%'  │ '143792 ± 2417.0'  │ '6814 ± 0.07%'         │ '6954 ± 119'           │ 67325   │
│ 1       │ 'just find'           │ '212420 ± 0.10%'  │ '204500 ± 1000.0'  │ '4752 ± 0.08%'         │ '4890 ± 24'            │ 47077   │
│ 2       │ 'compile and find'    │ '374148 ± 0.10%'  │ '361291 ± 1457.0'  │ '2688 ± 0.08%'         │ '2768 ± 11'            │ 26728   │
│ 3       │ 'P3 just compile'     │ '357416 ± 0.08%'  │ '347916 ± 1416.0'  │ '2809 ± 0.07%'         │ '2874 ± 12'            │ 27979   │
│ 4       │ 'P3 just find'        │ '735413 ± 0.17%'  │ '722291 ± 3667.0'  │ '1365 ± 0.08%'         │ '1384 ± 7'             │ 13598   │
│ 5       │ 'P3 compile and find' │ '1106692 ± 0.15%' │ '1083750 ± 8875.0' │ '906 ± 0.09%'          │ '923 ± 8'              │ 9036    │
└─────────┴───────────────────────┴───────────────────┴────────────────────┴────────────────────────┴────────────────────────┴─────────┘
```
