# jsonpath-2007

RFC 9535 JSONPath implemented like it's 2007.

In honour of [Stefan Gössner's original JSONPath implementation from 2007](https://code.google.com/archive/p/jsonpath/), jsonpath-2007 implements [RFC 9535](https://www.rfc-editor.org/rfc/rfc9535) with hand-crafted [ES3](https://en.wikipedia.org/wiki/ECMAScript_version_history). No TypeScript, no modern syntax and no build system. Just plain objects, a bunch of functions and a Makefile.

One side effect of these self-imposed restrictions is that jsonpath-2007 seems to [outperform](#benchmarks) a TypeScript (transpiled with Babel and bundled wth Rollup) implementation taking an OOP approach.

> [!NOTE]  
> The included `match` and `search` function extensions are non-checking. We map I-Regexp to ECMAScript Regexps according to [section 5](https://www.rfc-editor.org/rfc/rfc9485.html#name-mapping-i-regexp-to-regexp-) of [RFC 9485](https://www.rfc-editor.org/rfc/rfc9485.html) without checking for compliance.

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

TODO:

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
