import test from "node:test";
import assert from "node:assert/strict";
import { extractProviderText, readSseData, splitSseEvents } from "../src/lib/ai/stream.ts";

test("splitSseEvents keeps incomplete events until the delimiter arrives", () => {
  const first = splitSseEvents('data: {"choices":[{"delta":{"content":"Hello"}}]}\n');
  assert.deepEqual(first.events, []);
  assert.equal(first.remainder, 'data: {"choices":[{"delta":{"content":"Hello"}}]}\n');

  const second = splitSseEvents(first.remainder + "\n" + 'data: [DONE]\n\n');
  assert.equal(second.events.length, 2);
  assert.equal(readSseData(second.events[0]), '{"choices":[{"delta":{"content":"Hello"}}]}');
  assert.equal(readSseData(second.events[1]), "[DONE]");
});

test("splitSseEvents handles CRLF and final unterminated event", () => {
  const parsed = splitSseEvents("data: one\r\n\r\ndata: two", true);
  assert.deepEqual(parsed.events, ["data: one", "data: two"]);
  assert.equal(parsed.remainder, "");
});

test("extractProviderText reads Groq delta chunks", () => {
  assert.equal(
    extractProviderText("groq", JSON.stringify({ choices: [{ delta: { content: "Q is ready." } }] })),
    "Q is ready."
  );
  assert.equal(extractProviderText("groq", "[DONE]"), "");
});

test("extractProviderText reads Gemini candidate parts", () => {
  assert.equal(
    extractProviderText("gemini", JSON.stringify({ candidates: [{ content: { parts: [{ text: "Hello " }, { text: "Nassim" }] } }] })),
    "Hello Nassim"
  );
});

test("extractProviderText safely ignores malformed and metadata-only events", () => {
  assert.equal(extractProviderText("groq", "not-json"), "");
  assert.equal(extractProviderText("groq", JSON.stringify({ choices: [{ delta: {} }] })), "");
});
