// Checks that the skill's index files agree with each other and with the pinned Jest.
//
// Usage: bun index.ts
//
// - Every rules/*.md file is listed once in the SKILL.md Quick Reference, and every listed id has a file.
// - AGENTS.md has one "### Rule:" heading per rule, section by section, in the same sections as the Quick Reference.
// - README.md states the rule count and the per-category counts that the files give.
// - Every references/*.md file is listed in the SKILL.md References table.
// - The number of mistakes that SKILL.md gives for references/anti-patterns.md is its number of numbered sections.
// - The SKILL.md version is the newest CHANGELOG.md release.
// - The version that SKILL.md says it was audited against is the jest version that package.json pins.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

const CHECK = import.meta.dir;
const ROOT = resolve(CHECK, "../..");
const read = (f: string) => readFileSync(join(ROOT, f), "utf8");
const problems: string[] = [];
const expectEqual = (what: string, actual: unknown, expected: unknown) => {
  if (JSON.stringify(actual) !== JSON.stringify(expected))
    problems.push(`${what}: found ${JSON.stringify(actual)}, expected ${JSON.stringify(expected)}`);
};

const skill = read("SKILL.md");
const agents = read("AGENTS.md");
const readme = read("README.md");
const ruleFiles = readdirSync(join(ROOT, "rules")).filter((f) => f.endsWith(".md")).map((f) => f.slice(0, -3)).sort();

// Quick Reference: "### 1. Mock Design (CRITICAL)" followed by "- `mock-...` — ..." lines.
const quick = skill.slice(skill.indexOf("## Quick Reference"), skill.indexOf("\n## ", skill.indexOf("## Quick Reference") + 1));
const sections: { title: string; ids: string[] }[] = [];
for (const line of quick.split("\n")) {
  const head = /^### \d+\. (.+?) \(/.exec(line);
  if (head) sections.push({ title: head[1], ids: [] });
  const item = /^- `([a-z]+-[a-z0-9-]+)` —/.exec(line);
  if (item) sections.at(-1)?.ids.push(item[1]);
}
const listed = sections.flatMap((s) => s.ids);
expectEqual("Quick Reference ids that have no rule file", listed.filter((id) => !ruleFiles.includes(id)), []);
expectEqual("rule files missing from the Quick Reference", ruleFiles.filter((id) => !listed.includes(id)), []);
expectEqual("ids listed more than once in the Quick Reference", listed.filter((id, i) => listed.indexOf(id) !== i), []);

// AGENTS.md: "## 1. Mock Design" sections, each with "### Rule:" headings.
const agentSections: { title: string; rules: number }[] = [];
for (const line of agents.split("\n")) {
  const head = /^## \d+\. (.+)$/.exec(line);
  if (head) agentSections.push({ title: head[1].trim(), rules: 0 });
  if (/^### Rule: /.test(line) && agentSections.length) agentSections.at(-1)!.rules++;
}
expectEqual(
  "AGENTS.md rules per section",
  agentSections.map((s) => `${s.title}: ${s.rules}`),
  sections.map((s) => `${s.title}: ${s.ids.length}`),
);

// README.md counts.
const total = ruleFiles.length;
if (!readme.includes(`${total} rules with incorrect→correct`)) problems.push(`README.md does not say "${total} rules with incorrect→correct"`);
if (!new RegExp(`### ${total} Rules Across ${sections.length} Categories`).test(readme))
  problems.push(`README.md does not say "### ${total} Rules Across ${sections.length} Categories"`);
const readmeCounts = [...readme.matchAll(/^\| \d+ \| (.+?) \| (\d+) \| [A-Z]+ \|$/gm)].map((m) => `${m[1]}: ${m[2]}`);
expectEqual("README.md category table", readmeCounts, sections.map((s) => `${s.title}: ${s.ids.length}`));

// References table.
const refFiles = existsSync(join(ROOT, "references"))
  ? readdirSync(join(ROOT, "references")).filter((f) => f.endsWith(".md")).sort()
  : [];
expectEqual("references/*.md files missing from the SKILL.md References table", refFiles.filter((f) => !skill.includes(`\`references/${f}\``)), []);
const mistakes = Number(/(\d+) common mistakes/.exec(skill)?.[1]);
const numbered = (read("references/anti-patterns.md").match(/^## \d+\. /gm) ?? []).length;
expectEqual("SKILL.md anti-pattern count against the numbered sections of references/anti-patterns.md", mistakes, numbered);

// Version and baseline.
const version = /^\s+version:\s*(\S+)$/m.exec(skill)?.[1];
const released = /^## (\d+\.\d+\.\d+)$/m.exec(read("CHANGELOG.md"))?.[1];
expectEqual("SKILL.md version against the newest CHANGELOG.md release", version, released);
const audited = /audited against jest (\d+\.\d+\.\d+)/.exec(skill)?.[1];
const pinned = JSON.parse(readFileSync(join(CHECK, "package.json"), "utf8")).devDependencies.jest;
expectEqual("SKILL.md 'audited against' version against the pinned jest", audited, pinned);

for (const p of problems) console.log(p);
console.log(`${ruleFiles.length} rules, ${refFiles.length} references, ${problems.length} problems`);
process.exit(problems.length ? 1 : 0);
