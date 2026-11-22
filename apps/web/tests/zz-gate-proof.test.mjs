import assert from "node:assert/strict";
import test from "node:test";
test("deliberate failure to prove the deploy gate stops", () => { assert.equal(1, 2); });
