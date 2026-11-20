import test from "node:test";
import assert from "node:assert/strict";
import {pickIcon} from "../src/lib/app-icons.ts";

const page="https://certigo-gray.vercel.app/";

test("prefers the apple-touch-icon", () => {
  const html=`<link rel="icon" href="/favicon.ico"><link rel="icon" type="image/png" sizes="32x32" href="/icon-32.png"><link rel="apple-touch-icon" href="/apple-touch-icon.png">`;
  assert.equal(pickIcon(html,page),"https://certigo-gray.vercel.app/apple-touch-icon.png");
});

test("prefers an SVG icon over PNG favicons", () => {
  const html=`<link rel='icon' sizes='16x16' href='/f16.png'><link rel="icon" href="/icon.svg" type="image/svg+xml">`;
  assert.equal(pickIcon(html,page),"https://certigo-gray.vercel.app/icon.svg");
});

test("picks the largest PNG icon", () => {
  const html=`<link rel="icon" sizes="16x16" href="/a.png"><link rel="icon" sizes="192x192" href="/b.png"><link rel="shortcut icon" href="/c.ico">`;
  assert.equal(pickIcon(html,page),"https://certigo-gray.vercel.app/b.png");
});

test("resolves relative hrefs and absolute CDN hrefs", () => {
  assert.equal(pickIcon(`<link rel="icon" href="img/i.png">`,"https://x.base44.app/app/"),"https://x.base44.app/app/img/i.png");
  assert.equal(pickIcon(`<link rel="apple-touch-icon" href="https://cdn.example.com/q.png">`,page),"https://cdn.example.com/q.png");
});

test("falls back to /favicon.ico and ignores data: URIs", () => {
  assert.equal(pickIcon(`<title>x</title>`,page),"https://certigo-gray.vercel.app/favicon.ico");
  assert.equal(pickIcon(`<link rel="icon" href="data:image/png;base64,AAA">`,page),"https://certigo-gray.vercel.app/favicon.ico");
});
