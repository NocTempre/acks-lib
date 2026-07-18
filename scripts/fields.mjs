/* global foundry */
/**
 * DataModel field-builders for the shared ACKS vocabulary. Foundry-only (they
 * touch `foundry.data.fields`), but every builder is a lazy function so the
 * module still evaluates in Node — `foundry` is only dereferenced when a model
 * is actually defined (at `init` or later). acks-abilities builds its effect
 * model from these; acks-monsters is expected to adopt the defense/sense/speed
 * shapes when it migrates (deferred).
 */
import {
  choicesOf,
  DAMAGE_TYPES,
  EFFECT_KEYS,
  CONDITION_KEYS,
  MOVEMENT_TYPES,
  VISION_TYPES,
  SENSE_TYPES,
  NATURAL_WEAPONS,
  EFFECT_TYPES,
  PROFICIENCY_DOMAINS,
  PROGRESSION_CLASSES,
  PROGRESSION_LEVELS,
  SPELL_LIKE_FREQ,
  RESOURCE_KINDS,
  ROLL_TYPES,
} from "./vocab.mjs";

const F = () => foundry.data.fields;

/* --- leaf helpers (mirror acks-monsters/scripts/monster-extras.mjs) --- */
export const num = (opts = {}) => new (F().NumberField)({ required: false, nullable: true, initial: null, ...opts });
export const str = (opts = {}) => new (F().StringField)({ required: false, blank: true, initial: "", ...opts });
export const bool = (initial = false) => new (F().BooleanField)({ initial });
export const html = () => new (F().HTMLField)({ required: false, blank: true, initial: "" });
export const choice = (enumObj, opts = {}) =>
  new (F().StringField)({ required: false, blank: true, initial: "", choices: choicesOf(enumObj), ...opts });
export const choiceSet = (enumObj) => new (F().SetField)(new (F().StringField)({ choices: choicesOf(enumObj) }));

/* --- LevelValue: flat | perLevel | breakpoints | progression --- */
export function levelValueField() {
  const { SchemaField, ArrayField } = F();
  return new SchemaField({
    kind: choice(
      { flat: { label: "Flat" }, perLevel: { label: "Per Level" }, breakpoints: { label: "Breakpoints" }, progression: { label: "Progression" } },
      { initial: "flat" },
    ),
    flat: num(),
    base: num(),
    per: num(),
    breakpoints: new ArrayField(new SchemaField({ atLevel: num({ integer: true }), value: num() })),
    as: choice(PROGRESSION_CLASSES),
    atLevel: choice(PROGRESSION_LEVELS),
  });
}

/* --- Defenses: immunities / resistances / susceptibilities (shared w/ monsters) --- */
export function defensesField() {
  const { SchemaField } = F();
  const band = () =>
    new SchemaField({
      damage: choiceSet(DAMAGE_TYPES),
      effects: choiceSet(EFFECT_KEYS),
      conditions: choiceSet(CONDITION_KEYS),
      mundane: bool(), // only harmed by extraordinary
      extraordinary: bool(), // only harmed by mundane
    });
  return new SchemaField({ immunities: band(), resistances: band(), susceptibilities: band() });
}

/* --- Movement / senses / vision (shapes shared w/ monster Speed & Senses) --- */
export const speedsField = () =>
  new (F().ArrayField)(new (F().SchemaField)({ type: choice(MOVEMENT_TYPES, { initial: "land" }), run: num({ integer: true }) }));
export const sensesField = () =>
  new (F().ArrayField)(
    new (F().SchemaField)({ type: choice(SENSE_TYPES, { initial: "acuteHearing" }), range: num({ integer: true }), note: str() }),
  );
export const visionField = () => choiceSet(VISION_TYPES);

/* --- Effect: one typed primitive (wide all-optional schema, discriminated by `type`) --- */
export function effectField() {
  const { SchemaField } = F();
  return new SchemaField({
    type: choice(EFFECT_TYPES, { initial: "modifier" }),
    // modifier / throw
    target: str(), // a MODIFIER_TARGETS key, or a save/proficiency name
    value: levelValueField(),
    roll: str(), // e.g. "1d20"
    rollType: choice(ROLL_TYPES),
    // progressionAs
    as: choice(PROGRESSION_CLASSES),
    atLevel: choice(PROGRESSION_LEVELS),
    // proficiencyGrant (weapon/armor/fighting-style proficiency)
    domain: choice(PROFICIENCY_DOMAINS),
    group: str(), // weapon group / armor weight / fighting-style name
    // limitation / drawback (a restriction on ANY ability; numeric penalties reuse target+value)
    restriction: str(), // prohibition or behavioral drawback ("may not use shields")
    // immunity / resistance / susceptibility
    damage: choiceSet(DAMAGE_TYPES),
    effects: choiceSet(EFFECT_KEYS),
    conditions: choiceSet(CONDITION_KEYS),
    // sense / movement
    sense: choice(SENSE_TYPES),
    vision: choice(VISION_TYPES),
    mode: choice(MOVEMENT_TYPES),
    range: num({ integer: true }),
    // naturalAttack
    routine: str(),
    naturalWeapon: choice(NATURAL_WEAPONS),
    // spellLike / spellcastingMod
    spell: str(),
    frequency: choice(SPELL_LIKE_FREQ),
    castingTime: str(),
    school: str(),
    casterLevelDelta: num({ integer: true }),
    // resource / economic
    resource: choice(RESOURCE_KINDS),
    action: choice({ spend: { label: "Spend" }, gain: { label: "Gain" } }),
    amount: num(),
    unit: str(),
    period: str(),
    // shared
    condition: str(), // situational qualifier
    note: str(),
  });
}

export const effectsField = () => new (F().ArrayField)(effectField());
