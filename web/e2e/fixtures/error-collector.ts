/**
 * Collects console errors, page errors, and failed network requests
 * during a Playwright test, with regex-based allowlist filtering.
 *
 * Usage:
 *   const collector = installErrorCollector(page, [...GLOBAL_ALLOWLIST]);
 *   // ... run test ...
 *   collector.assertClean();   // throws if any non-allowlisted error
 *
 * The collector is wired into the `frigateApp` fixture so every test
 * gets it for free. Tests that intentionally trigger an error pass
 * additional regexes via the `expectedErrors` fixture parameter.
 */

import type { Page, Request, Response, ConsoleMessage } from "@playwright/test";

export type CollectedError = {
  kind: "console" | "pageerror" | "request";
  message: string;
  url?: string;
  stack?: string;
};

export type ErrorCollector = {
  errors: CollectedError[];
  assertClean(): void;
};

function isAllowlisted(message: string, allowlist: RegExp[]): boolean {
  return allowlist.some((pattern) => pattern.test(message));
}

function firstStackFrame(stack: string | undefined): string | undefined {
  if (!stack) return undefined;
  const lines = stack.split("\n").map((l) => l.trim()).filter(Boolean);
  // Skip the error message line (line 0); return the first "at ..." frame
  return lines.find((l) => l.startsWith("at "));
}

function isSameOrigin(url: string, baseURL: string | undefined): boolean {
  if (!baseURL) return true;
  try {
    return new URL(url).origin === new URL(baseURL).origin;
  } catch {
    return false;
  }
}

export function installErrorCollector(
  page: Page,
  allowlist: RegExp[],
): ErrorCollector {
  const errors: CollectedError[] = [];
  const baseURL = (
    page.context() as unknown as { _options?: { baseURL?: string } }
  )._options?.baseURL;

  const onConsole = (msg: ConsoleMessage) => {
    if (msg.type() !== "error") return;
    const text = msg.text();
    if (isAllowlisted(text, allowlist)) return;
    errors.push({
      kind: "console",
      message: text,
      url: msg.location().url,
    });
  };

  const onPageError = (err: Error) => {
    const text = err.message;
    if (isAllowlisted(text, allowlist)) return;
    errors.push({
      kind: "pageerror",
      message: text,
      stack: firstStackFrame(err.stack),
    });
  };

  const onResponse = (response: Response) => {
    const status = response.status();
    if (status < 500) return;
    const url = response.url();
    if (!isSameOrigin(url, baseURL)) return;
    const text = `${status} ${response.statusText()} ${url}`;
    if (isAllowlisted(text, allowlist)) return;
    errors.push({ kind: "request", message: text, url });
  };

  const onRequestFailed = (request: Request) => {
    const url = request.url();
    if (!isSameOrigin(url, baseURL)) return;
    const failure = request.failure();
    const text = `failed: ${failure?.errorText ?? "unknown"} ${url}`;
    if (isAllowlisted(text, allowlist)) return;
    errors.push({ kind: "request", message: text, url });
  };

  page.on("console", onConsole);
  page.on("pageerror", onPageError);
  page.on("response", onResponse);
  page.on("requestfailed", onRequestFailed);

  return {
    errors,
    assertClean() {
      if (errors.length === 0) return;
      const formatted = errors
        .map((e, i) => {
          const stack = e.stack ? `\n      ${e.stack}` : "";
          const url = e.url && e.url !== e.message ? ` (${e.url})` : "";
          return `  ${i + 1}. [${e.kind}] ${e.message}${url}${stack}`;
        })
        .join("\n");
      throw new Error(
        `Page emitted ${errors.length} unexpected error${errors.length === 1 ? "" : "s"}:\n${formatted}`,
      );
    },
  };
}
