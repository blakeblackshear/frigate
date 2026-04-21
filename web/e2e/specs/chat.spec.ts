/**
 * Chat page tests -- MEDIUM tier.
 *
 * Starting state, NDJSON streaming contract (not SSE), assistant
 * bubble grows as chunks arrive, error path, and mobile viewport.
 */

import { test, expect, type FrigateApp } from "../fixtures/frigate-test";

/**
 * Join NDJSON chunks into a single body (for non-streaming tests).
 */
function ndjsonBody(chunks: Array<Record<string, unknown>>): string {
  return chunks.map((c) => JSON.stringify(c)).join("\n") + "\n";
}

/**
 * Install a window.fetch override on the page so that POSTs to
 * chat/completion resolve with a real ReadableStream that emits the
 * given chunks over time. This is the only way to validate
 * chunk-by-chunk rendering through Playwright — page.route() does not
 * support streaming responses.
 *
 * Must be called BEFORE frigateApp.goto(). The override also exposes
 * `__chatRequests` on window so tests can assert the outgoing body.
 */
async function installChatStreamOverride(
  app: FrigateApp,
  chunks: Array<Record<string, unknown>>,
  opts: { chunkDelayMs?: number; status?: number } = {},
) {
  const { chunkDelayMs = 40, status = 200 } = opts;
  await app.page.addInitScript(
    ({ chunks, chunkDelayMs, status }) => {
      (window as unknown as { __chatRequests: unknown[] }).__chatRequests = [];
      const origFetch = window.fetch;
      window.fetch = async (input, init) => {
        const url =
          typeof input === "string"
            ? input
            : input instanceof URL
              ? input.toString()
              : (input as Request).url;
        if (url.includes("chat/completion")) {
          const body =
            init?.body instanceof String || typeof init?.body === "string"
              ? JSON.parse(init!.body as string)
              : null;
          (
            window as unknown as { __chatRequests: unknown[] }
          ).__chatRequests.push({ url, body });
          if (status !== 200) {
            return new Response(JSON.stringify({ error: "boom" }), {
              status,
            });
          }
          const encoder = new TextEncoder();
          const stream = new ReadableStream({
            async start(controller) {
              for (const chunk of chunks) {
                await new Promise((r) => setTimeout(r, chunkDelayMs));
                controller.enqueue(
                  encoder.encode(JSON.stringify(chunk) + "\n"),
                );
              }
              controller.close();
            },
          });
          return new Response(stream, { status: 200 });
        }
        return origFetch.call(window, input as RequestInfo, init);
      };
    },
    { chunks, chunkDelayMs, status },
  );
}

test.describe("Chat — starting state @medium", () => {
  test("empty message list renders ChatStartingState with title and input", async ({
    frigateApp,
  }) => {
    await frigateApp.goto("/chat");
    await expect(
      frigateApp.page.getByRole("heading", { level: 1 }),
    ).toBeVisible({ timeout: 10_000 });
    await expect(frigateApp.page.getByPlaceholder(/ask/i)).toBeVisible();
    // Four quick-reply buttons from starting_requests.*
    const quickReplies = frigateApp.page.locator(
      "button:has-text('Show recent events'), button:has-text('Show camera status'), button:has-text('What happened'), button:has-text('Watch')",
    );
    await expect(quickReplies.first()).toBeVisible({ timeout: 5_000 });
  });
});

test.describe("Chat — streaming @medium", () => {
  test("submission POSTs to chat/completion with stream: true", async ({
    frigateApp,
  }) => {
    await installChatStreamOverride(frigateApp, [
      { type: "content", delta: "Hel" },
      { type: "content", delta: "lo" },
    ]);
    await frigateApp.goto("/chat");
    const input = frigateApp.page.getByPlaceholder(/ask/i);
    await expect(input).toBeVisible({ timeout: 10_000 });
    await input.fill("hello chat");
    await input.press("Enter");

    await expect
      .poll(
        async () =>
          frigateApp.page.evaluate(
            () =>
              (window as unknown as { __chatRequests: unknown[] })
                .__chatRequests?.length ?? 0,
          ),
        { timeout: 5_000 },
      )
      .toBeGreaterThan(0);

    const request = await frigateApp.page.evaluate(
      () =>
        (
          window as unknown as {
            __chatRequests: Array<{
              url: string;
              body: { stream: boolean; messages: Array<{ content: string }> };
            }>;
          }
        ).__chatRequests[0],
    );
    expect(request.body.stream).toBe(true);
    expect(
      request.body.messages[request.body.messages.length - 1].content,
    ).toBe("hello chat");
  });

  test("NDJSON content chunks accumulate in the assistant bubble", async ({
    frigateApp,
  }) => {
    await installChatStreamOverride(
      frigateApp,
      [
        { type: "content", delta: "Hel" },
        { type: "content", delta: "lo, " },
        { type: "content", delta: "world!" },
      ],
      { chunkDelayMs: 50 },
    );
    await frigateApp.goto("/chat");
    const input = frigateApp.page.getByPlaceholder(/ask/i);
    await expect(input).toBeVisible({ timeout: 10_000 });
    await input.fill("greet me");
    await input.press("Enter");

    await expect(
      frigateApp.page.getByText(/Hello, world!/i),
    ).toBeVisible({ timeout: 10_000 });
  });

  test("tool_calls chunks render a ToolCallsGroup", async ({ frigateApp }) => {
    await installChatStreamOverride(frigateApp, [
      {
        type: "tool_calls",
        tool_calls: [
          {
            id: "call_1",
            name: "search_objects",
            arguments: { label: "person" },
          },
        ],
      },
      { type: "content", delta: "Searching for people." },
    ]);
    await frigateApp.goto("/chat");
    const input = frigateApp.page.getByPlaceholder(/ask/i);
    await expect(input).toBeVisible({ timeout: 10_000 });
    await input.fill("find people");
    await input.press("Enter");

    // ToolCallsGroup normalizes "search_objects" → "Search Objects" via
    // normalizeName(). Match the rendered display label instead.
    await expect(
      frigateApp.page.getByText(/search objects/i),
    ).toBeVisible({ timeout: 10_000 });
    await expect(
      frigateApp.page.getByText(/searching for people/i),
    ).toBeVisible({ timeout: 5_000 });
  });
});

test.describe("Chat — stop @medium", () => {
  test("Stop button aborts an in-flight stream and freezes the partial message", async ({
    frigateApp,
  }) => {
    // A long chunk sequence with big delays gives us time to hit Stop.
    await installChatStreamOverride(
      frigateApp,
      [
        { type: "content", delta: "First chunk. " },
        { type: "content", delta: "Second chunk. " },
        { type: "content", delta: "Third chunk. " },
      ],
      { chunkDelayMs: 300 },
    );
    await frigateApp.goto("/chat");
    const input = frigateApp.page.getByPlaceholder(/ask/i);
    await expect(input).toBeVisible({ timeout: 10_000 });
    await input.fill("slow response please");
    await input.press("Enter");

    // Wait for the first chunk to render
    await expect(
      frigateApp.page.getByText(/First chunk\./),
    ).toBeVisible({ timeout: 10_000 });

    // The Stop button is a destructive rounded button shown while isLoading.
    // It contains only an FaStop SVG icon (no visible text). Find it by the
    // destructive variant class or fall back to aria-label.
    const stopBtn = frigateApp.page
      .locator("button.bg-destructive, button[class*='destructive']")
      .first();
    await stopBtn.click({ timeout: 3_000 }).catch(async () => {
      await frigateApp.page
        .getByRole("button", { name: /stop|cancel/i })
        .first()
        .click();
    });

    // Third chunk should never appear.
    await expect(
      frigateApp.page.getByText(/Third chunk\./),
    ).toHaveCount(0);
  });
});

test.describe("Chat — error @medium", () => {
  test("non-OK response renders an error banner", async ({ frigateApp }) => {
    await installChatStreamOverride(frigateApp, [], { status: 500 });
    await frigateApp.goto("/chat");
    const input = frigateApp.page.getByPlaceholder(/ask/i);
    await expect(input).toBeVisible({ timeout: 10_000 });
    await input.fill("trigger error");
    await input.press("Enter");
    // The error banner is a role="alert" paragraph; target by role so we
    // don't collide with the user-message bubble that contains "trigger
    // error" (which would match /error/ in strict mode).
    await expect(
      frigateApp.page.getByRole("alert").filter({
        hasText: /boom|something went wrong/i,
      }),
    ).toBeVisible({ timeout: 5_000 });
  });
});

test.describe("Chat — attachment chip @medium", () => {
  test("attaching an event renders a ChatAttachmentChip", async ({
    frigateApp,
  }) => {
    // The chat starts with an empty message list (ChatStartingState).
    // After sending a message, ChatEntry with the paperclip button appears.
    // We use the stream override so the first message completes quickly.
    await installChatStreamOverride(frigateApp, [
      { type: "content", delta: "Done." },
    ]);
    await frigateApp.goto("/chat");

    // Send a first message to transition out of ChatStartingState so the
    // full ChatEntry (with the paperclip) is visible.
    const input = frigateApp.page.getByPlaceholder(/ask/i);
    await expect(input).toBeVisible({ timeout: 10_000 });
    await input.fill("hello");
    await input.press("Enter");
    // Wait for the assistant response to complete so isLoading becomes false
    // and the paperclip button is re-enabled.
    await expect(frigateApp.page.getByText(/Done\./i)).toBeVisible({
      timeout: 10_000,
    });

    // The paperclip button has aria-label from t("attachment_picker_placeholder")
    // = "Attach an event".
    const paperclip = frigateApp.page
      .getByRole("button", { name: /attach an event/i })
      .first();
    await expect(paperclip).toBeVisible({ timeout: 5_000 });
    await paperclip.click();

    // The popover shows a paste input with placeholder "Or paste event ID".
    const idInput = frigateApp.page
      .locator('input[placeholder*="event" i], input[aria-label*="attach" i]')
      .first();
    await expect(idInput).toBeVisible({ timeout: 3_000 });
    await idInput.fill("test-event-1");
    await frigateApp.page
      .getByRole("button", { name: /^attach$/i })
      .first()
      .click();

    // The ChatAttachmentChip renders in the composer area. It shows an
    // activity indicator while loading event data (event_ids API not mocked),
    // so assert on the chip container being present in the composer.
    await expect(
      frigateApp.page.locator(
        "[class*='inline-flex'][class*='rounded-lg'][class*='border']",
      ),
    ).toBeVisible({ timeout: 5_000 });
  });
});

test.describe("Chat — mobile @medium @mobile", () => {
  test.skip(
    ({ frigateApp }) => !frigateApp.isMobile,
    "Mobile-only",
  );

  test("chat input is focusable at mobile viewport", async ({ frigateApp }) => {
    await frigateApp.goto("/chat");
    const input = frigateApp.page.getByPlaceholder(/ask/i);
    await expect(input).toBeVisible({ timeout: 10_000 });
    await input.focus();
    await expect(input).toBeFocused();
  });
});
