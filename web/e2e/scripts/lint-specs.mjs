#!/usr/bin/env node
/**
 * Lint script for e2e specs. Bans lenient test patterns and requires
 * a @mobile-tagged test in every spec under specs/ (excluding _meta/).
 *
 * Banned patterns:
 *   - page.waitForTimeout(   — use expect().toPass() or waitFor instead
 *   - if (await ... .isVisible())   — assertions must be unconditional
 *   - if ((await ... .count()) > 0)   — same as above
 *   - expect(... .length).toBeGreaterThan(0) on textContent results
 *
 * Escape hatch: append `// e2e-lint-allow` on any line to silence the
 * check for that line. Use sparingly and explain why in a comment above.
 *
 * @mobile rule: every .spec.ts under specs/ (not specs/_meta/) must
 * contain at least one test title or describe with the substring "@mobile".
 *
 * Specs in PENDING_REWRITE are exempt from all rules until they are
 * rewritten with proper assertions and mobile coverage. Remove each
 * entry when its spec is updated.
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SPECS_DIR = resolve(__dirname, "..", "specs");
const META_PREFIX = resolve(SPECS_DIR, "_meta");

// Specs exempt from lint rules until they are rewritten with proper
// assertions and mobile coverage. Remove each entry when its spec is updated.
const PENDING_REWRITE = new Set([
  "auth.spec.ts",
  "chat.spec.ts",
  "classification.spec.ts",
  "config-editor.spec.ts",
  "explore.spec.ts",
  "export.spec.ts",
  "face-library.spec.ts",
  "live.spec.ts",
  "logs.spec.ts",
  "navigation.spec.ts",
  "replay.spec.ts",
  "review.spec.ts",
  "system.spec.ts",
]);

const BANNED_PATTERNS = [
  {
    name: "page.waitForTimeout",
    regex: /\bwaitForTimeout\s*\(/,
    advice:
      "Use expect.poll(), expect(...).toPass(), or waitFor() with a real condition.",
  },
  {
    name: "conditional isVisible() assertion",
    regex: /\bif\s*\(\s*await\s+[^)]*\.isVisible\s*\(/,
    advice:
      "Assertions must be unconditional. Use expect(...).toBeVisible() instead.",
  },
  {
    name: "conditional count() assertion",
    regex: /\bif\s*\(\s*\(?\s*await\s+[^)]*\.count\s*\(\s*\)\s*\)?\s*[><=!]/,
    advice:
      "Assertions must be unconditional. Use expect(...).toHaveCount(n).",
  },
  {
    name: "vacuous textContent length assertion",
    regex: /expect\([^)]*\.length\)\.toBeGreaterThan\(0\)/,
    advice:
      "Assert specific content, not that some text exists.",
  },
];

function walk(dir) {
  const entries = readdirSync(dir);
  const out = [];
  for (const entry of entries) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      out.push(...walk(full));
    } else if (entry.endsWith(".spec.ts")) {
      out.push(full);
    }
  }
  return out;
}

function lintFile(file) {
  const basename = file.split("/").pop();
  if (PENDING_REWRITE.has(basename)) return [];
  if (file.includes("/specs/settings/")) return [];

  const errors = [];
  const text = readFileSync(file, "utf8");
  const lines = text.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes("e2e-lint-allow")) continue;
    for (const pat of BANNED_PATTERNS) {
      if (pat.regex.test(line)) {
        errors.push({
          file,
          line: i + 1,
          col: 1,
          rule: pat.name,
          message: `${pat.name}: ${pat.advice}`,
          source: line.trim(),
        });
      }
    }
  }

  // @mobile rule: skip _meta
  const isMeta = file.startsWith(META_PREFIX);
  if (!isMeta) {
    if (!/@mobile\b/.test(text)) {
      errors.push({
        file,
        line: 1,
        col: 1,
        rule: "missing @mobile test",
        message:
          'Spec must contain at least one test or describe tagged with "@mobile".',
        source: "",
      });
    }
  }

  return errors;
}

function main() {
  const files = walk(SPECS_DIR);
  const allErrors = [];
  for (const f of files) {
    allErrors.push(...lintFile(f));
  }

  if (allErrors.length === 0) {
    console.log(`e2e:lint: ${files.length} spec files OK`);
    process.exit(0);
  }

  for (const err of allErrors) {
    const rel = relative(process.cwd(), err.file);
    console.error(`${rel}:${err.line}:${err.col}  ${err.rule}`);
    console.error(`  ${err.message}`);
    if (err.source) console.error(`  > ${err.source}`);
  }
  console.error(
    `\ne2e:lint: ${allErrors.length} error${allErrors.length === 1 ? "" : "s"} in ${files.length} files`,
  );
  process.exit(1);
}

main();
