// Run: npm test
import {test} from "node:test";
import assert from "node:assert/strict";
import {issuedBeforeRevocation} from "../src/lib/session-revocation.ts";

test("never signed out: every valid token is accepted",()=>{
  assert.equal(issuedBeforeRevocation(1795250000,0),false);
});
test("token issued before sign-out is refused",()=>{
  assert.equal(issuedBeforeRevocation(1795250000,1795253600),true);
});
test("login in the same second as sign-out, or later, is accepted",()=>{
  assert.equal(issuedBeforeRevocation(1795253600,1795253600),false);
  assert.equal(issuedBeforeRevocation(1795253700,1795253600),false);
});
test("a token without an issued-at time is refused once a sign-out exists",()=>{
  assert.equal(issuedBeforeRevocation(undefined,1795253600),true);
  assert.equal(issuedBeforeRevocation(Number.NaN,1795253600),true);
});
