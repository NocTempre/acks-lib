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
  EFFECT_MODES,
  EFFECT_SUBJECTS,
  PROFICIENCY_DOMAINS,
  PROFICIENCY_BREADTH,
  PROGRESSION_CLASSES,
  PROGRESSION_LEVELS,
  SPELL_LIKE_FREQ,
  RESOURCE_KINDS,
  ROLL_TYPES,
  REROLL_KEEP,
  VALUE_SCALES,
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
/** A list of ability refs (def.prof.x / def.power.x). */
export const refList = () => new (F().ArrayField)(new (F().StringField)({ blank: false }));

/* --- LevelValue: flat | perLevel | breakpoints | progression --- */
export function levelValueField() {
  const { SchemaField, ArrayField } = F();
  return new SchemaField({
    kind: choice(
      {
        flat: { label: "Flat" },
        perLevel: { label: "Per Level" },
        breakpoints: { label: "Breakpoints" },
        progression: { label: "Progression" },
        conditional: { label: "Conditional on a Scale" },
      },
      { initial: "flat" },
    ),
    flat: num(),
    base: num(),
    per: num(),
    // Shared by `breakpoints` and `conditional`: for the latter `atLevel` reads
    // "at this value of `on`" rather than at this class level.
    breakpoints: new ArrayField(new SchemaField({ atLevel: num({ integer: true }), value: num() })),
    on: choice(VALUE_SCALES), // conditional: which scale the ladder is keyed on
    as: choice(PROGRESSION_CLASSES),
    atLevel: choice(PROGRESSION_LEVELS),
  });
}

/**
 * ONE named roll an ability offers.
 *
 * An ability is not one roll. Animal Husbandry diagnoses (11+ / 7+ / 3+ by
 * rank), cures (18+), cures serious injury (14+) and extracts venom
 * (18+ / 14+ / 10+) — four different rolls, three of them on their own rank
 * progression. A single `rollTarget` cannot hold that, and picking one of them
 * to be "the" roll silently loses the rest.
 *
 * The RECIPE says how many rolls an ability has and where each one is written.
 * Everything in this shape — the label, the target, the progression, the
 * qualifier — is read from the reader's own book.
 */
export function rollField() {
  return new (F().SchemaField)({
    key: str(), // stable within the ability, so a macro can name one roll
    label: str(), // what the roll is called
    formula: str(), // "1d20"
    rollType: choice(ROLL_TYPES, { initial: "above" }),
    target: levelValueField(), // flat, per-level, or a rank ladder
    scale: choice(VALUE_SCALES, { initial: "level" }), // what `target` is keyed on
    condition: str(), // when it applies, when that is not unconditional
    note: str(),
  });
}

export const rollsField = () => new (F().ArrayField)(rollField());

/**
 * A pointer to a spell.
 *
 * TODO(magic): this is a PLACEHOLDER. It points at the core system's existing
 * spell item by uuid and carries the printed name as a fallback, which is
 * enough to link and display but models nothing about the spell itself. When
 * the magic work lands, this becomes a real spell primitive (school, range,
 * duration, save, reversibility, ritual/formula cost) and the `spell` string on
 * `effectField` retires in favour of it. Nothing consumes this yet — it exists
 * so the shape is agreed before anything depends on it.
 */
export function spellRefField() {
  return new (F().SchemaField)({
    uuid: str(), // core spell Item uuid, once one exists in the world
    name: str(), // printed name — the fallback when no item is linked
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
    forWhat: str(), // the activity a throw/modifier applies to ("Dungeonbashing")
    // WHOSE roll this modifies. Without it, a penalty the ability imposes on
    // its victims is indistinguishable from one the character suffers, which
    // inverts the ability. Defaults to self, so existing effects are unchanged.
    appliesTo: choice(EFFECT_SUBJECTS, { initial: "self" }),
    roll: str(), // e.g. "1d20"
    rollType: choice(ROLL_TYPES),
    // progressionAs
    as: choice(PROGRESSION_CLASSES),
    atLevel: choice(PROGRESSION_LEVELS),
    // proficiencyGrant (weapon/armor/fighting-style proficiency)
    domain: choice(PROFICIENCY_DOMAINS),
    breadth: choice(PROFICIENCY_BREADTH), // unrestricted / broad / narrow / restricted
    group: str(), // weapon group / armor weight / fighting-style name (empty when unrestricted)
    // limitation / drawback (a restriction on ANY ability; numeric penalties reuse target+value)
    restriction: str(), // prohibition or behavioral drawback ("may not use shields")
    // immunity / resistance / susceptibility
    damage: choiceSet(DAMAGE_TYPES),
    effects: choiceSet(EFFECT_KEYS),
    conditions: choiceSet(CONDITION_KEYS),
    // sense / movement — NOTE `movementMode` is deliberately not called `mode`:
    // `mode` below is the combination mode (add|replace|set), and two fields of
    // the same name in one schema silently lose one of them.
    sense: choice(SENSE_TYPES),
    vision: choice(VISION_TYPES),
    movementMode: choice(MOVEMENT_TYPES),
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
    /* --- Relational: depend on / grant / alter OTHER abilities ---
     * `ref`/`refs`  the ability this effect targets (modifies) or requires/grants.
     * `ifHas`       gate: the effect applies only while the character also has
     *               these — the books' "if separately proficient in Searching…"
     *               and "if the character also has Bright Lore of Aura…".
     * `mode`        add | replace | set — "instead of" is a replace variant.
     * `stacksWith` / `notStacksWith`  explicit stacking rules, e.g. Diplomacy
     *               stacks with Mystic Aura but NOT Intimidation or Seduction.
     * `choose`      for `grants`: pick N of `refs`. */
    ref: str(),
    refs: refList(),
    ifHas: refList(),
    mode: choice(EFFECT_MODES),
    stacksWith: refList(),
    notStacksWith: refList(),
    choose: num({ integer: true }),
    /* --- reroll: "roll twice and keep the better" ---
     * `times` is the number of EXTRA rolls (default 1). `keep` decides which
     * result stands; `resolveReroll` reads `rollType` above so "better" means
     * higher on a roll-high throw and lower on a roll-low one. Reuses
     * `target`/`forWhat`/`condition` to say WHAT is rerolled and when. */
    keep: choice(REROLL_KEEP),
    times: num({ integer: true }),
    /* --- companion: a creature the ability confers ---
     * `ref` is the monster entry id (the recipe knows which — that pointer is
     * not the book's text and ships safely). `actorUuid` is the loaded bucket:
     * empty until the citing book is available or a GM drops an actor in, so a
     * bookless seat still gets the slot and can fill it later. `amount` is how
     * many the ability confers. */
    actorUuid: str(),
    // shared
    condition: str(), // free-text situational qualifier (when no structured form fits)
    note: str(),
  });
}

export const effectsField = () => new (F().ArrayField)(effectField());
