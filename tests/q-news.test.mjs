import test from "node:test";
import assert from "node:assert/strict";
import {
  Q_NEWS_STREAMS,
  classifyNewsCategory,
  normalizeNewsTitle,
  parseGdeltDate,
  validArticleUrl
} from "../src/lib/q-news.ts";

test("Q News defines distinct Angola, Lebanon and Global streams", () => {
  assert.deepEqual(Object.keys(Q_NEWS_STREAMS), ["Angola", "Lebanon", "Global"]);
  assert.equal(new Set(Object.values(Q_NEWS_STREAMS).map(item => item.sourceId)).size, 3);
});

test("GDELT dates are normalized to ISO timestamps", () => {
  assert.equal(parseGdeltDate("20261118T143015Z"), "2026-11-18T14:30:15.000Z");
  assert.equal(parseGdeltDate("invalid"), null);
  assert.equal(parseGdeltDate(undefined), null);
});

test("news categories classify commodity and market headlines", () => {
  assert.equal(classifyNewsCategory("Angola oil exports rise"), "oil_gas");
  assert.equal(classifyNewsCategory("Wheat harvest outlook improves"), "agriculture");
  assert.equal(classifyNewsCategory("Central bank cuts interest rate"), "finance");
  assert.equal(classifyNewsCategory("Unclassified headline"), "general");
});

test("title normalization is stable across accents and punctuation", () => {
  assert.equal(normalizeNewsTitle("Énergie & Trade: 2026!"), "energie trade 2026");
});

test("article URLs accept only HTTP and HTTPS", () => {
  assert.equal(validArticleUrl("https://example.com/story"), "https://example.com/story");
  assert.equal(validArticleUrl("javascript:alert(1)"), null);
  assert.equal(validArticleUrl("not a URL"), null);
});
