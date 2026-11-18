import test from "node:test";
import assert from "node:assert/strict";
import { requestOriginAllowed } from "../src/lib/origin.ts";

test("accepts a same-origin HTTPS request", () => {
  const request = new Request("https://q.example.com/api/tasks", {
    method: "POST",
    headers: { origin: "https://q.example.com", host: "q.example.com" }
  });
  assert.equal(requestOriginAllowed(request), true);
});

test("rejects missing Origin on browser write requests", () => {
  const request = new Request("https://q.example.com/api/tasks", {
    method: "POST",
    headers: { host: "q.example.com" }
  });
  assert.equal(requestOriginAllowed(request), false);
});

test("rejects a foreign origin even when a host header is present", () => {
  const request = new Request("https://q.example.com/api/tasks", {
    method: "POST",
    headers: { origin: "https://attacker.example", host: "q.example.com" }
  });
  assert.equal(requestOriginAllowed(request), false);
});

test("rejects protocol downgrade and malformed origins", () => {
  const downgrade = new Request("https://q.example.com/api/tasks", {
    method: "POST",
    headers: { origin: "http://q.example.com", host: "q.example.com" }
  });
  const malformed = new Request("https://q.example.com/api/tasks", {
    method: "POST",
    headers: { origin: "not-a-url", host: "q.example.com" }
  });
  assert.equal(requestOriginAllowed(downgrade), false);
  assert.equal(requestOriginAllowed(malformed), false);
});

test("uses the proxy-provided host and protocol when present", () => {
  const request = new Request("http://internal/api/tasks", {
    method: "POST",
    headers: {
      origin: "https://q.example.com",
      host: "internal",
      "x-forwarded-host": "q.example.com",
      "x-forwarded-proto": "https"
    }
  });
  assert.equal(requestOriginAllowed(request), true);
});
