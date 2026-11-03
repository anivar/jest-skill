---
title: Get full output from Jest inside an AI agent
impact: MEDIUM
description: Since Jest 30.3, an agent environment variable makes Jest print only the files with failures and the summary. Pass --reporters=default to see passing files and their console output.
tags: perf, ci, reporters, agent, AI_AGENT, CLAUDECODE, console, output
---

# Get full output from Jest inside an AI agent

## Problem

Since Jest 30.3, Jest checks for agent environment variables: `AI_AGENT`, `AUGMENT_AGENT`,
`CLAUDE_CODE`, `CLAUDECODE`, `CODEX_SANDBOX`, `CODEX_THREAD_ID`, `CURSOR_AGENT`, `GEMINI_CLI`,
`GOOSE_PROVIDER`, `OPENCODE` and `REPL_ID`. When one is set and the config has no `reporters`, Jest
uses an agent reporter. It prints only the files that have failures, with their console output, and
the summary. It does not print passing files or their `console.log` output. An agent that adds a
`console.log` to a passing test sees nothing, and can conclude that the code did not run.

## Incorrect

```bash
# Inside an agent shell: the passing test's console.log output is not printed
npx jest src/user.test.js
```

## Correct

```bash
# Full per-file output, as in a terminal
npx jest --reporters=default src/user.test.js
```

```javascript
// jest.config.js — a configured reporters list also turns the agent reporter off
module.exports = {
  reporters: ['default'],
};
```

## Why

- The agent reporter makes the output shorter for a model to read. Jest selects it only when
  `reporters` is not set.
- On Jest 30.5.2 with `CLAUDECODE` set, a run of one passing and one failing file printed the
  failing file, its console output and the summary. `--reporters=default` and `reporters: ['default']`
  each printed both files and both logs.
- `--verbose` does not restore the passing-file lines. It prints the console output of both files,
  but no PASS line and no test names for the passing file.
- To keep the short output for the full suite, use `--reporters=default` only on the run where you
  need the passing-file output.
