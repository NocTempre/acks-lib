/**
 * Pure-logic tests (Foundry-free) for acks-lib, run via `npm test`. Covers the
 * vocab enums + the LevelValue resolver. The Foundry field-builders (fields.mjs)
 * need a Foundry runtime and are exercised by consuming modules, not here.
 */
import assert from "node:assert/strict";
import * as vocab from "../scripts/vocab.mjs";

const { resolveLevelValue: R, choicesOf } = vocab;
let n = 0;
const t = (name, fn) => {
  fn();
  n++;
  console.log(`ok - ${name}`);
};

t("choicesOf maps {key:{label}} -> {key:label}", () => {
  assert.deepEqual(choicesOf(vocab.ROLL_TYPES), { result: "=", above: "≥", below: "≤" });
});

t("enums are non-empty and label-shaped", () => {
  for (const key of ["DAMAGE_TYPES", "MOVEMENT_TYPES", "VISION_TYPES", "SENSE_TYPES", "EFFECT_TYPES", "MODIFIER_TARGETS"]) {
    const e = vocab[key];
    assert.ok(e && Object.keys(e).length > 0, `${key} present`);
    for (const v of Object.values(e)) assert.equal(typeof v.label, "string", `${key} entries have labels`);
  }
});

t("DAMAGE_TYPES mirrors the acks-monsters value set", () => {
  assert.deepEqual(Object.keys(vocab.DAMAGE_TYPES), [
    "acidic", "arcane", "bludgeoning", "cold", "electrical", "fire", "luminous",
    "necrotic", "piercing", "poisonous", "seismic", "slashing", "varies",
  ]);
});

t("resolveLevelValue: flat", () => {
  assert.equal(R(5, 9), 5);
  assert.equal(R({ kind: "flat", flat: 3 }, 20), 3);
});

t("resolveLevelValue: perLevel (18+, -1/level)", () => {
  const lv = { kind: "perLevel", base: 18, per: -1 };
  assert.equal(R(lv, 1), 18);
  assert.equal(R(lv, 5), 14);
  assert.equal(R(lv, 1), R(lv, 0)); // level floored at 1
});

t("resolveLevelValue: breakpoints (+1/+2/+3 @1/7/13)", () => {
  const lv = { breakpoints: [{ atLevel: 1, value: 1 }, { atLevel: 7, value: 2 }, { atLevel: 13, value: 3 }] };
  assert.equal(R(lv, 1), 1);
  assert.equal(R(lv, 6), 1);
  assert.equal(R(lv, 7), 2);
  assert.equal(R(lv, 13), 3);
});

t("resolveLevelValue: progression defers to external table", () => {
  assert.equal(R({ kind: "progression", as: "thief", atLevel: "full" }, 5), null);
});

t("resolveLevelValue: nullish is null", () => {
  assert.equal(R(null, 3), null);
  assert.equal(R(undefined, 3), null);
});

console.log(`\n${n} tests passed`);
