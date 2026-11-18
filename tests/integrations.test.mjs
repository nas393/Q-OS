import test from "node:test";
import assert from "node:assert/strict";
import { INTEGRATION_DEFINITIONS, listIntegrationHealth } from "../src/lib/integrations/registry.ts";

test("integration health reports configuration without claiming connectivity", () => {
  const names = [...new Set(INTEGRATION_DEFINITIONS.flatMap(item => item.requiredEnvironment))];
  const previous = new Map(names.map(name => [name, process.env[name]]));
  try {
    for (const name of names) process.env[name] = "test-configured";
    const all = listIntegrationHealth();
    assert.ok(all.every(item => item.status === "configured"));

    delete process.env.GROQ_API_KEY;
    const groq = listIntegrationHealth().find(item => item.id === "groq");
    assert.equal(groq?.status, "not_configured");
  } finally {
    for (const [name, value] of previous) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  }
});

test("integration definitions expose no credential values", () => {
  assert.ok(INTEGRATION_DEFINITIONS.every(item =>
    item.requiredEnvironment.every(name => typeof name === "string" && !name.includes("="))
  ));
});
