import { testingAsserts as ta } from "../../../deps-test.ts";
import * as mod from "./set.ts";

Deno.test("psqlSetMetaCmd correctly handles declarations", () => {
  const d = mod.psqlSetMetaCmd();

  for (
    const c of [
      [d.handleMetaCommand({ line: "\\set count 42", lineNum: 1 }), {
        state: "mutated",
        line: "-- \\set count 42 (variable: count, value: 42, srcLine: 1)",
      }],
      [d.handleMetaCommand({ line: "\\set name John", lineNum: 2 }), {
        state: "mutated",
        line: "-- \\set name John (variable: name, value: John, srcLine: 2)",
      }],
      [
        d.handleMetaCommand({
          line: "\\set url 'https://example.com'",
          lineNum: 3,
        }),
        {
          state: "mutated",
          line:
            "-- \\set url 'https://example.com' (variable: url, value: https://example.com, srcLine: 3)",
        },
      ],
      [
        d.handleMetaCommand({
          line: "\\set var = value",
          lineNum: 4,
        }),
        {
          state: "mutated",
          line:
            "-- \\set var = value (variable: var, value: value, srcLine: 4)",
        },
      ],
      [
        d.handleMetaCommand({
          line: "\\set greeting 'Hello, 'world'!'",
          lineNum: 5,
        }),
        {
          state: "mutated",
          line:
            "-- \\set greeting 'Hello, 'world'!' (variable: greeting, value: Hello, 'world'!, srcLine: 5)",
        },
      ],
      [
        d.handleMetaCommand({
          line: `\\set greeting2 "Hello, \"world\"!"`,
          lineNum: 6,
        }),
        {
          state: "mutated",
          line:
            `-- \\set greeting2 "Hello, \"world\"!" (variable: greeting2, value: Hello, "world"!, srcLine: 6)`,
        },
      ],
    ]
  ) {
    ta.assertEquals(c[0], c[1]);
  }

  ta.assertEquals(
    Array.from(d.catalog.values()).map((e) => ({
      name: e.varName,
      value: e.varValue,
    })),
    [
      { name: "count", value: "42" },
      { name: "name", value: "John" },
      { name: "url", value: "https://example.com" },
      { name: "var", value: "value" },
      { name: "greeting", value: "Hello, 'world'!" },
      { name: "greeting2", value: 'Hello, "world"!' },
    ],
  );
});

Deno.test("psqlSetMetaCmd correctly identifies directives", () => {
  const directive = mod.psqlSetMetaCmd();
  ta.assert(directive.isMetaCommand({
    line: "\\set name John",
    lineNum: 1,
  }));
  ta.assertEquals(
    directive.isMetaCommand({
      line: "\\setx name John",
      lineNum: 1,
    }),
    false,
  );
});

Deno.test("psqlSetMetaCmd correctly handles overrides", () => {
  const directive = mod.psqlSetMetaCmd({
    overrides: {
      name: "Jane",
    },
  });
  directive.handleMetaCommand({
    line: "\\set name John",
    lineNum: 1,
  });

  const vv = directive.varValue("name");
  ta.assert(vv.found);
  ta.assertEquals(vv.varValue, "Jane");
});

Deno.test("psqlSetMetaCmd handles single quoted values correctly", () => {
  const directive = mod.psqlSetMetaCmd();
  directive.handleMetaCommand({
    line: "\\set greeting 'Hello, 'world'!'",
    lineNum: 1,
  });

  const vv = directive.varValue("greeting");
  ta.assert(vv.found);
  ta.assertEquals(vv.varValue, "Hello, 'world'!");
});

Deno.test("psqlSetMetaCmd handles double quoted values correctly", () => {
  const directive = mod.psqlSetMetaCmd();
  directive.handleMetaCommand({
    line: `\\set greeting "Hello, \"world\"!"`,
    lineNum: 1,
  });

  const vv = directive.varValue("greeting");
  ta.assert(vv.found);
  ta.assertEquals(vv.varValue, `Hello, "world"!`);
});
