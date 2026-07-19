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

t("relational effect vocabulary is present", () => {
  for (const k of ["requires", "grants", "modifies", "limitation", "proficiencyGrant"]) {
    assert.ok(vocab.EFFECT_TYPES[k], `EFFECT_TYPES.${k}`);
  }
  assert.deepEqual(Object.keys(vocab.EFFECT_MODES), ["add", "replace", "set"]);
  assert.deepEqual(Object.keys(vocab.PROFICIENCY_BREADTH), ["unrestricted", "broad", "narrow", "restricted"]);
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

t("resolveLevelValue: conditional keys on a scale, not level", () => {
  // "counts as 1 power at Arcane Value 1-2, 2 at Arcane Value 3-4"
  const lv = { on: "arcaneValue", breakpoints: [{ atLevel: 1, value: 1 }, { atLevel: 3, value: 2 }] };
  assert.equal(R(lv, 14, { arcaneValue: 1 }), 1);
  assert.equal(R(lv, 1, { arcaneValue: 4 }), 2);
  assert.equal(R(lv, 9), null); // scale not supplied — caller's to provide
  assert.equal(R(lv, 9, { arcaneValue: 0 }), null); // below the first rung
});

t("conversionTip fills {name}; renamed is marked, not silent", () => {
  assert.equal(vocab.conversionTip("renamed", "Detect Traps"), "Detect Traps has been renamed for ACKS II.");
  assert.equal(vocab.conversionTip("renamed"), "This content has been renamed for ACKS II.");
  assert.ok(vocab.CONVERSION_STATUS.renamed.icon, "renamed carries an icon");
  for (const s of Object.values(vocab.CONVERSION_STATUS)) {
    assert.ok(s.icon && s.severity && s.tip, "every status has icon+severity+tip");
  }
  assert.equal(vocab.conversionTip("nonesuch", "X"), "");
});

t("resolveReroll: better/worse follow the throw's direction", () => {
  const RR = vocab.resolveReroll;
  // roll-high (attack / proficiency throw): better is the maximum
  assert.equal(RR([7, 15], "better", "above"), 15);
  assert.equal(RR([7, 15], "worse", "above"), 7);
  // roll-low (measured against a ceiling): better is the minimum
  assert.equal(RR([7, 15], "better", "below"), 7);
  assert.equal(RR([7, 15], "worse", "below"), 15);
  assert.equal(RR([7, 15, 3], "latest"), 3); // no choice — the reroll stands
  assert.equal(RR([], "better"), null);
  assert.equal(RR([4, NaN, 12], "better", "above"), 12); // junk ignored
});

t("rerollTotal: times counts EXTRA rolls and defaults to one", () => {
  assert.equal(vocab.rerollTotal({}), 2); // "roll twice" needs no field
  assert.equal(vocab.rerollTotal({ times: 2 }), 3);
  assert.equal(vocab.rerollTotal({ times: 0 }), 1);
  assert.equal(vocab.rerollTotal({ times: -5 }), 1);
});

t("capabilities: a kw: gate catches every ability providing it", () => {
  const { satisfies, satisfiesAll, capabilityForId } = vocab;
  assert.equal(capabilityForId("def.prof.sensingEvil"), "kw:sensingevil");
  // The thief SKILL, not the proficiency — a gate naming the proficiency id
  // would miss it, a capability gate does not.
  const held = [{ id: "def.skill.searching", provides: [] }, { id: "def.power.alertness", provides: [] }];
  assert.equal(satisfies(held, "kw:searching"), true, "own id implies its capability");
  assert.equal(satisfies(held, "def.prof.searching"), false, "exact id is still exact");
  assert.equal(satisfies(held, "def.skill.searching"), true);
  // An alias declares the capability it shares with its target.
  const viaAlias = [{ id: "def.power.discernevil", provides: ["kw:sensingevil"] }];
  assert.equal(satisfies(viaAlias, "kw:sensingevil"), true);
  assert.equal(satisfiesAll(held, ["kw:searching", "kw:alertness"]), true);
  assert.equal(satisfiesAll(held, ["kw:searching", "kw:nosuch"]), false);
  assert.equal(satisfies(held, ""), true, "no gate is satisfied trivially");
});

t("capabilities: same capability twice does not stack", () => {
  const groups = vocab.nonStackingGroups([
    { id: "def.power.ageless", provides: ["kw:longeval"] },
    { id: "def.power.longeval", provides: [] },
    { id: "def.prof.alertness", provides: [] },
  ]);
  assert.deepEqual(groups, { "kw:longeval": ["def.power.ageless", "def.power.longeval"] });
  assert.deepEqual(vocab.nonStackingGroups([{ id: "def.prof.alertness", provides: [] }]), {}, "one of a kind stacks fine");
});

t("a rank ladder resolves like a level ladder, on its own scale", () => {
  // Animal Husbandry: diagnose on 11+ at one rank, 7+ at two, 3+ at three.
  const target = { kind: "conditional", on: "rank", breakpoints: [
    { atLevel: 1, value: 11 }, { atLevel: 2, value: 7 }, { atLevel: 3, value: 3 },
  ] };
  assert.equal(R(target, 1, { rank: 1 }), 11);
  assert.equal(R(target, 20, { rank: 2 }), 7, "class level is irrelevant to a rank ladder");
  assert.equal(R(target, 1, { rank: 3 }), 3);
  assert.equal(R(target, 1, {}), null, "no rank supplied — the caller must say");
  assert.ok(vocab.VALUE_SCALES.rank, "rank is a scale");
});

t("reroll + companion primitives are in the effect vocabulary", () => {
  for (const k of ["reroll", "companion"]) assert.ok(vocab.EFFECT_TYPES[k], `EFFECT_TYPES.${k}`);
  assert.deepEqual(Object.keys(vocab.REROLL_KEEP), ["better", "worse", "latest"]);
  assert.ok(vocab.VALUE_SCALES.arcaneValue, "VALUE_SCALES.arcaneValue (magic TODO)");
});

console.log(`\n${n} tests passed`);
