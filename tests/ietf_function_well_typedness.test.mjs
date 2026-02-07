/**
 * Function well-typedness tests from IETF spec examples.
 *
 * The test cases defined here are taken from version 20 of the JSONPath
 * internet draft, draft-ietf-jsonpath-base-20. In accordance with
 * https://trustee.ietf.org/license-info, Revised BSD License text
 * is included bellow.
 *
 * See https://datatracker.ietf.org/doc/html/draft-ietf-jsonpath-base-20
 *
 * Copyright (c) 2023 IETF Trust and the persons identified as authors
 * of the code. All rights reserved.Redistribution and use in source and
 * binary forms, with or without modification, are permitted provided
 * that the following conditions are met:
 *
 * - Redistributions of source code must retain the above copyright
 *   notice, this list of conditions and the following disclaimer.
 * - Redistributions in binary form must reproduce the above copyright
 *   notice, this list of conditions and the following disclaimer in the
 *   documentation and/or other materials provided with the
 *   distribution.
 * - Neither the name of Internet Society, IETF or IETF Trust, nor the
 *   names of specific contributors, may be used to endorse or promote
 *   products derived from this software without specific prior written
 *   permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * “AS IS” AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

import JSONPath from "../dist/jsonpath.cjs.js";

const TEST_CASES = [
  {
    description: "length, singular query, compared",
    path: "$[?length(@) < 3]",
    valid: true
  },
  {
    description: "length, non-singular query, compared",
    path: "$[?length(@.*) < 3]",
    valid: false
  },
  {
    description: "count, non-singular query, compared",
    path: "$[?count(@.*) == 1]",
    valid: true
  },
  {
    description: "count, int literal, compared",
    path: "$[?count(1) == 1]",
    valid: false
  },
  {
    description: "nested function, LogicalType -> NodesType",
    path: "$[?count(nn(@.*)) == 1]",
    valid: true
  },
  {
    description: "match, singular query, string literal",
    path: "$[?match(@.timezone, 'Europe/.*')]",
    valid: true
  },
  {
    description: "match, singular query, string literal, compared",
    path: "$[?match(@.timezone, 'Europe/.*') == true]",
    valid: false
  },
  {
    description: "value, non-singular query param, comparison",
    path: "$[?value(@..color) == 'red']",
    valid: true
  },
  {
    description: "value, non-singular query param",
    path: "$[?value(@..color)]",
    valid: false
  },
  {
    description:
      "function, singular query, value type param, logical return type",
    path: "$[?vl(@.a)]",
    valid: true
  },
  {
    description:
      "function, non-singular query, value type param, logical return type",
    path: "$[?vl(@.*)]",
    valid: false
  },
  {
    description:
      "function, non-singular query, nodes type param, logical return type",
    path: "$[?nl(@.*)]",
    valid: true
  },
  {
    description:
      "function, non-singular query, logical type param, logical return type",
    path: "$[?ll(@.*)]",
    valid: true
  },
  {
    description:
      "function, logical type param, comparison, logical return type",
    path: "$[?ll(1==1)]",
    valid: true
  },
  {
    description: "function, logical type param, literal, logical return type",
    path: "$[?ll(1)]",
    valid: false
  },
  {
    description: "function, value type param, literal, logical return type",
    path: "$[?vl(1)]",
    valid: true
  }
];

const MockNodesNodesFunction = {
  argTypes: ["NodesType"],
  returnType: "NodesType",
  call: function (nodes) {
    return nodes;
  }
};

const MockValueLogicalFunction = {
  argTypes: ["ValueType"],
  returnType: "LogicalType",
  call: function (_value) {
    return false;
  }
};

const MockNodesLogicalFunction = {
  argTypes: ["NodesType"],
  returnType: "LogicalType",
  call: function (_nodes) {
    return false;
  }
};

const MockLogicalLogicalFunction = {
  argTypes: ["LogicalType"],
  returnType: "LogicalType",
  call: function (_nodes) {
    return false;
  }
};

const options = { functionExtensions: JSONPath.standardFunctionExtensions() };
options.functionExtensions["nn"] = MockNodesNodesFunction;
options.functionExtensions["vl"] = MockValueLogicalFunction;
options.functionExtensions["nl"] = MockNodesLogicalFunction;
options.functionExtensions["ll"] = MockLogicalLogicalFunction;

describe("IETF function well-typedness examples", () => {
  test.each(TEST_CASES)("$description", ({ path, valid }) => {
    if (!valid) {
      expect(() => JSONPath.compile(path, options)).toThrow(
        JSONPath.JSONPathTypeError
      );
    } else {
      JSONPath.compile(path, options);
    }
  });
});
