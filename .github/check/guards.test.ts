// Text guards: each one fails when a claim that a release corrected comes back into the skill. The id names the
// release that made the correction. The check runs on SKILL.md, AGENTS.md, README.md, rules/ and references/,
// not on CHANGELOG.md, which quotes the old claims on purpose.
//
// Usage: bun test guards.test.ts
//        SKILL_ROOT=<path to another checkout> bun test guards.test.ts
import { expect, test } from "bun:test";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

const ROOT = resolve(process.env.SKILL_ROOT ?? join(import.meta.dir, "../.."));

type Doc = { file: string; lines: { n: number; text: string; code: boolean }[] };
const docs: Doc[] = (() => {
  const files = ["SKILL.md", "AGENTS.md", "README.md"].filter((f) => existsSync(join(ROOT, f)));
  for (const dir of ["rules", "references"]) {
    if (!existsSync(join(ROOT, dir))) continue;
    for (const f of readdirSync(join(ROOT, dir)).sort()) if (f.endsWith(".md")) files.push(`${dir}/${f}`);
  }
  return files.map((file) => {
    let fence = false;
    const lines = readFileSync(join(ROOT, file), "utf8").split("\n").map((text, i) => {
      if (/^\s*```/.test(text)) {
        fence = !fence;
        return { n: i + 1, text, code: true };
      }
      return { n: i + 1, text, code: fence };
    });
    return { file, lines };
  });
})();

// Every line that matches, as "file:line: text". `where` limits the scan to code lines or to prose lines.
function hits(pattern: RegExp, where: "all" | "code" | "prose"): string[] {
  const found: string[] = [];
  for (const d of docs)
    for (const l of d.lines) {
      if (where === "code" && !l.code) continue;
      if (where === "prose" && l.code) continue;
      if (pattern.test(l.text)) found.push(`${d.file}:${l.n}: ${l.text.trim().slice(0, 120)}`);
    }
  return found;
}

const guard = (id: string, what: string, pattern: RegExp, where: "all" | "code" | "prose" = "all") =>
  test(`${id}: ${what}`, () => expect(hits(pattern, where)).toEqual([]));

test("the guards scan the skill", () => {
  expect(docs.length).toBeGreaterThan(30);
});

// 1.2.1
guard("1.2.1", "runAllTimers on a recursive timer throws; it does not hang", /runAllTimers\(\);?\s*\/\/\s*hangs/);
guard("1.2.1", "restoreAllMocks does not clear calls or remove implementations", /restoreAllMocks\(\);?\s*\/\/\s*clear \+ remove/);
guard("1.2.1", "restoreMocks alone is not the recommended default", /Prefer (setting )?`restoreMocks: true`/);
guard("1.2.1", "a done test with a failing expect does not report only a timeout", /Timeout - Async callback was not invoked/);
guard("1.2.1", "a faked Date does not make uuid repeat ids", /uuid library[^\n]*returns? (the )?same ID/i);
guard("1.2.1", "uuid is ESM-only from v12, not v9", /\| `uuid` \| v9 \|/);
guard("1.2.1", "require.resolve('uuid') does not give a CommonJS entry for uuid 12+", /resolves to CJS entry/);
guard("1.2.1", "the ESM-package rule quotes the error Jest prints", /`uuid`, `nanoid`, `chalk` v5 will fail/);
guard("1.2.1", "@jest/globals has no Mocked export", /import \{[^}]*\bMocked\b[^}]*\} from '@jest\/globals'/);
guard("1.2.1", "no companion skills that do not exist", /react-native-testing|java-testing/);
guard("1.2.1", "the baseline is jest ^30.5.2", /jest \^30\.0\.0\b/);
guard("1.2.1", "no release-specific section in SKILL.md or AGENTS.md", /^## Jest 30\.\d/);

// 1.2.3
guard("1.2.3", "no react-test-renderer in examples; React 19 deprecates it", /renderer\.create\(|from 'react-test-renderer'|require\('react-test-renderer'\)/, "code");
guard("1.2.3", "jest.mocked(require()) is untyped; pass the import", /^(?!\s*\/\/).*jest\.mocked\(require\(/, "code");

// 1.2.4
guard("1.2.4", "Jest does not print 'An Async callback was invoked' for an async test that takes done", /An Async callback was invoked/);

// 1.2.5
guard("1.2.5", "restoreAllMocks does not restore module-mock implementations", /restoreAllMocks\(\);?\s*\/\/\s*restore spied\/mocked/);

// Dates say when something was checked; the skill names the library version instead. Dates in code are data.
guard(
  "DATE",
  "no check dates or calendar dates in the skill prose",
  /\b20\d\d-\d\d-\d\d\b|\b(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)\.? (\d{1,2}(st|nd|rd|th)?\b|20\d\d\b)|\b\d{1,2}(st|nd|rd|th)? (January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\b/,
  "prose",
);
