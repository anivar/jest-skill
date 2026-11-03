// Type-checks every TypeScript and JavaScript code block in the skill against the pinned packages.
//
// Usage: bun blocks.ts [skill-root] [--json out.json]
//
// Rules the check enforces:
// - ts and tsx blocks compile under strict mode. No diagnostic code is filtered.
// - js and jsx blocks compile under strict mode with checkJs, as an editor checks a JavaScript file, with two
//   exceptions: an implicit `any` (also for `this`) and an `unknown` catch variable are allowed, because
//   JavaScript has no annotation to remove them with. Every other diagnostic counts.
// - A block sees the top-level declarations of the earlier blocks in the same file, as a reader does. A
//   JavaScript block does not see TypeScript declarations.
//   Names that no block declares come from prelude.d.ts (both kinds) and prelude.<ts|js>.d.ts (one kind),
//   which declare each name with a real type. Packages the check does not install are declared in
//   modules.d.ts, with the signatures the examples use. A relative import resolves to stubs/<path>.ts.
// - A line that must not compile carries `// @ts-expect-error <reason>`. TypeScript reports TS2578 when the
//   line compiles.
// - A deprecated call is allowed only on a line whose comment starts with `deprecated`, and that marker is
//   allowed only on a line with a deprecated call. Both directions fail the check.
import ts from "typescript";
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const CHECK = import.meta.dir;
const args = process.argv.slice(2);
const jsonAt = args.indexOf("--json");
const jsonOut = jsonAt >= 0 ? args[jsonAt + 1] : undefined;
const positional = args.filter((a, i) => !a.startsWith("--") && (jsonAt < 0 || i !== jsonAt + 1));
const ROOT = resolve(positional[0] ?? join(CHECK, "../.."));

type Kind = "ts" | "tsx" | "js" | "jsx";
type Family = "ts" | "js";
type Block = { src: string; line: number; body: string; kind: Kind };
export type Finding = { src: string; line: number; code: number | string; msg: string; text: string };

const KIND: Record<string, Kind> = { ts: "ts", typescript: "ts", tsx: "tsx", js: "js", javascript: "js", jsx: "jsx" };
const family = (k: Kind): Family => (k === "js" || k === "jsx" ? "js" : "ts");

export function markdownFiles(root: string): string[] {
  const list = (d: string) =>
    existsSync(join(root, d))
      ? readdirSync(join(root, d)).filter((f) => f.endsWith(".md")).sort().map((f) => `${d}/${f}`)
      : [];
  return ["SKILL.md", "AGENTS.md", "README.md", ...list("rules"), ...list("references")].filter((f) => existsSync(join(root, f)));
}

export function extractBlocks(root: string, src: string): Block[] {
  const lines = readFileSync(join(root, src), "utf8").split("\n");
  const blocks: Block[] = [];
  for (let i = 0; i < lines.length; i++) {
    const open = /^\s*```(ts|typescript|tsx|js|javascript|jsx)\s*$/.exec(lines[i]);
    if (!open) continue;
    let j = i + 1;
    while (j < lines.length && !/^\s*```\s*$/.test(lines[j])) j++;
    blocks.push({ src, line: i + 2, body: lines.slice(i + 1, j).join("\n"), kind: KIND[open[1]] });
    i = j;
  }
  return blocks;
}

// Names a top-level statement declares, split by the space they occupy.
function declared(stmt: ts.Statement): { values: string[]; types: string[] } {
  const values: string[] = [];
  const types: string[] = [];
  const bindingNames = (n: ts.BindingName): string[] =>
    ts.isIdentifier(n) ? [n.text] : n.elements.flatMap((e) => (ts.isOmittedExpression(e) ? [] : bindingNames(e.name)));
  if (ts.isVariableStatement(stmt)) for (const d of stmt.declarationList.declarations) values.push(...bindingNames(d.name));
  else if (ts.isFunctionDeclaration(stmt) && stmt.name) values.push(stmt.name.text);
  else if ((ts.isClassDeclaration(stmt) || ts.isEnumDeclaration(stmt)) && stmt.name) {
    values.push(stmt.name.text);
    types.push(stmt.name.text);
  } else if (ts.isInterfaceDeclaration(stmt) || ts.isTypeAliasDeclaration(stmt)) types.push(stmt.name.text);
  else if (ts.isModuleDeclaration(stmt) && ts.isIdentifier(stmt.name)) values.push(stmt.name.text);
  else if (ts.isImportDeclaration(stmt) && stmt.importClause) {
    const c = stmt.importClause;
    const names: string[] = [];
    if (c.name) names.push(c.name.text);
    if (c.namedBindings && ts.isNamespaceImport(c.namedBindings)) names.push(c.namedBindings.name.text);
    if (c.namedBindings && ts.isNamedImports(c.namedBindings)) for (const e of c.namedBindings.elements) names.push(e.name.text);
    values.push(...names);
    types.push(...names);
  } else if (ts.isImportEqualsDeclaration(stmt)) values.push(stmt.name.text);
  return { values, types };
}

const isDeclaration = (s: ts.Statement) =>
  ts.isVariableStatement(s) || ts.isFunctionDeclaration(s) || ts.isClassDeclaration(s) || ts.isEnumDeclaration(s) ||
  ts.isInterfaceDeclaration(s) || ts.isTypeAliasDeclaration(s) || ts.isImportDeclaration(s) || ts.isImportEqualsDeclaration(s);

const scriptKind = (k: Kind) =>
  k === "ts" ? ts.ScriptKind.TS : k === "tsx" ? ts.ScriptKind.TSX : k === "jsx" ? ts.ScriptKind.JSX : ts.ScriptKind.JS;

type Composed = { file: string; text: string; bodyStart: number; block: Block };

// Builds the module for block k: earlier top-level declarations it does not redeclare, then the block itself.
function compose(blocks: Block[], k: number, index: number): Composed {
  const block = blocks[k];
  const parse = (b: Block) => ts.createSourceFile(`x.${b.kind}`, b.body, ts.ScriptTarget.Latest, true, scriptKind(b.kind));
  const own = parse(block).statements.map(declared);
  const ownValues = new Set(own.flatMap((d) => d.values));
  const ownTypes = new Set(own.flatMap((d) => d.types));
  type Entry = { text: string; values: string[]; types: string[] };
  const context: Entry[] = [];
  for (const prior of blocks.slice(0, k)) {
    // TypeScript syntax cannot be carried into a JavaScript block.
    if (family(block.kind) === "js" && family(prior.kind) === "ts") continue;
    for (const stmt of parse(prior).statements) {
      if (!isDeclaration(stmt)) continue;
      const d = declared(stmt);
      if (d.values.length === 0 && d.types.length === 0) continue;
      // A later declaration of the same name replaces the earlier one, as it would for a reader.
      for (let i = context.length - 1; i >= 0; i--) {
        const e = context[i];
        if (e.values.some((n) => d.values.includes(n)) || e.types.some((n) => d.types.includes(n))) context.splice(i, 1);
      }
      context.push({ text: stmt.getText(), values: d.values, types: d.types });
    }
  }
  const kept = context.filter((e) => !e.values.some((n) => ownValues.has(n)) && !e.types.some((n) => ownTypes.has(n)));
  const header = kept.map((e) => e.text).join("\n") + "\n";
  const text = `${header}${block.body}\nexport {};\n`;
  const file = join(CHECK, ".blocks", `b${String(index).padStart(4, "0")}.${block.kind}`);
  return { file, text, bodyStart: header.length, block };
}

const base: ts.CompilerOptions = {
  strict: true,
  noEmit: true,
  skipLibCheck: true,
  target: ts.ScriptTarget.ES2022,
  module: ts.ModuleKind.ESNext,
  moduleResolution: ts.ModuleResolutionKind.Bundler,
  lib: ["lib.es2023.d.ts", "lib.dom.d.ts", "lib.dom.iterable.d.ts", "lib.esnext.disposable.d.ts"],
  types: ["node"],
  typeRoots: [join(CHECK, "node_modules/@types")],
  jsx: ts.JsxEmit.ReactJSX,
  esModuleInterop: true,
  resolveJsonModule: true,
};
const OPTIONS: Record<Family, ts.CompilerOptions> = {
  ts: base,
  js: { ...base, allowJs: true, checkJs: true, noImplicitAny: false, noImplicitThis: false, useUnknownInCatchVariables: false },
};

// A relative import of an application module resolves to stubs/<path>, which declares what the blocks import.
function stubFor(name: string): string | undefined {
  const rel = name.replace(/^(\.\.?\/)+/, "");
  const stubs = join(CHECK, "stubs");
  for (const f of [rel, `${rel.replace(/\.(m|c)?[jt]sx?$/, "")}.ts`, `${rel.replace(/\.(m|c)?[jt]sx?$/, "")}.tsx`]) {
    // A stub directory (stubs/handlers/) can share its name with a stub file (stubs/handlers.ts).
    if (existsSync(join(stubs, f)) && statSync(join(stubs, f)).isFile()) return join(stubs, f);
  }
  return undefined;
}

function checkFamily(fam: Family, composed: Composed[], findings: Finding[]) {
  if (composed.length === 0) return;
  const options = OPTIONS[fam];
  const byFile = new Map(composed.map((c) => [c.file, c]));
  const ambient = ["prelude.d.ts", `prelude.${fam}.d.ts`, "modules.d.ts"].map((f) => join(CHECK, f)).filter((f) => existsSync(f));
  const roots = [...ambient, ...byFile.keys()];
  const host: ts.LanguageServiceHost = {
    getScriptFileNames: () => roots,
    getScriptVersion: () => "1",
    getScriptSnapshot: (f) => {
      const c = byFile.get(f);
      if (c) return ts.ScriptSnapshot.fromString(c.text);
      return existsSync(f) ? ts.ScriptSnapshot.fromString(readFileSync(f, "utf8")) : undefined;
    },
    getCurrentDirectory: () => CHECK,
    getCompilationSettings: () => options,
    getDefaultLibFileName: (o) => ts.getDefaultLibFilePath(o),
    fileExists: (f) => byFile.has(f) || ts.sys.fileExists(f),
    readFile: (f) => byFile.get(f)?.text ?? ts.sys.readFile(f),
    readDirectory: ts.sys.readDirectory,
    directoryExists: ts.sys.directoryExists,
    getDirectories: ts.sys.getDirectories,
    resolveModuleNames: (names, containing) =>
      names.map((name) => {
        const r = ts.resolveModuleName(name, containing, options, host as unknown as ts.ModuleResolutionHost).resolvedModule;
        if (r || !name.startsWith(".")) return r;
        const stub = stubFor(name);
        if (!stub) return undefined;
        const extension = stub.endsWith(".json") ? ts.Extension.Json : stub.endsWith(".tsx") ? ts.Extension.Tsx : ts.Extension.Ts;
        return { resolvedFileName: stub, extension, isExternalLibraryImport: false };
      }),
  };
  const service = ts.createLanguageService(host);
  const program = service.getProgram();
  if (!program) throw new Error("no program");
  for (const c of composed) {
    const sf = program.getSourceFile(c.file);
    if (!sf) throw new Error(`missing ${c.file}`);
    const bodyLines = c.block.body.split("\n");
    const lineOf = (pos: number) => sf.getLineAndCharacterOfPosition(pos).line - sf.getLineAndCharacterOfPosition(c.bodyStart).line;
    const inBody = (d: ts.Diagnostic) => d.start !== undefined && d.start >= c.bodyStart && d.start < c.bodyStart + c.block.body.length;
    const report = (rel: number, code: number | string, msg: string) =>
      findings.push({ src: c.block.src, line: c.block.line + rel, code, msg, text: (bodyLines[rel] ?? "").trim().slice(0, 140) });
    for (const d of [...service.getSyntacticDiagnostics(c.file), ...service.getSemanticDiagnostics(c.file)]) {
      if (!inBody(d)) continue;
      report(lineOf(d.start as number), d.code, ts.flattenDiagnosticMessageText(d.messageText, " ").slice(0, 240));
    }
    const deprecatedLines = new Set<number>();
    for (const d of service.getSuggestionDiagnostics(c.file)) {
      if (!d.reportsDeprecated || !inBody(d)) continue;
      const rel = lineOf(d.start as number);
      deprecatedLines.add(rel);
      if (!/\/\/\s*deprecated\b/i.test(bodyLines[rel] ?? ""))
        report(rel, "deprecated", ts.flattenDiagnosticMessageText(d.messageText, " ").slice(0, 240));
    }
    bodyLines.forEach((text, rel) => {
      if (/\/\/\s*deprecated\b/i.test(text) && !deprecatedLines.has(rel))
        report(rel, "marker", "line is marked deprecated but calls no deprecated API");
    });
  }
}

export function check(root: string): { findings: Finding[]; blocks: number } {
  const composed: Composed[] = [];
  for (const src of markdownFiles(root)) {
    const blocks = extractBlocks(root, src);
    blocks.forEach((_, k) => composed.push(compose(blocks, k, composed.length)));
  }
  const findings: Finding[] = [];
  for (const fam of ["ts", "js"] as const) checkFamily(fam, composed.filter((c) => family(c.block.kind) === fam), findings);
  return { findings: findings.sort((a, b) => a.src.localeCompare(b.src) || a.line - b.line), blocks: composed.length };
}

if (import.meta.main) {
  const { findings, blocks } = check(ROOT);
  for (const f of findings) console.log(`${f.src}:${f.line}  ${typeof f.code === "number" ? `TS${f.code}` : f.code}  ${f.msg}\n    ${f.text}`);
  console.log(`${blocks} blocks, ${findings.length} findings`);
  if (jsonOut) writeFileSync(jsonOut, JSON.stringify(findings, null, 1));
  process.exit(findings.length ? 1 : 0);
}
