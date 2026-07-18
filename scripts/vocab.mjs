/**
 * Shared ACKS vocabulary — the family's canonical enums + the LevelValue
 * resolver. FOUNDRY-FREE and Node-importable (no `foundry.*`): offline tooling
 * (acks-content's cookbook compiler/executor) imports this the same as the
 * Foundry runtime does. DataModel field-builders that consume these live in
 * `fields.mjs` (Foundry-only).
 *
 * The damage/movement/vision/sense/natural-weapon enums MIRROR the values
 * acks-monsters currently defines (config.mjs) so the deferred monster
 * migration onto this lib is value-identical (a documented sanctioned mirror
 * until then). The ability-effect enums are new — the shared target both
 * acks-abilities and (later) acks-monsters build their effect models from.
 */

/** `{ key: { label, … } }` → `{ key: label }` for DataModel `choices`. */
export const choicesOf = (enumObj) =>
  Object.fromEntries(Object.entries(enumObj).map(([k, v]) => [k, v?.label ?? k]));

/* ---------------------------------------------------------------- */
/*  Shared with acks-monsters (mirror — keep value-identical)        */
/* ---------------------------------------------------------------- */

/** Damage types (MM Overview p.12; core system damage set). */
export const DAMAGE_TYPES = {
  acidic: { label: "Acidic" },
  arcane: { label: "Arcane" },
  bludgeoning: { label: "Bludgeoning" },
  cold: { label: "Cold" },
  electrical: { label: "Electrical" },
  fire: { label: "Fire" },
  luminous: { label: "Luminous" },
  necrotic: { label: "Necrotic" },
  piercing: { label: "Piercing" },
  poisonous: { label: "Poisonous" },
  seismic: { label: "Seismic" },
  slashing: { label: "Slashing" },
  varies: { label: "Varies by Weapon" },
};

/** Natural weapons → default damage type (MM Overview p.12). */
export const NATURAL_WEAPONS = {
  bite: { label: "Bite", damage: "piercing" },
  claw: { label: "Claw", damage: "slashing" },
  talon: { label: "Talon", damage: "slashing" },
  gore: { label: "Gore", damage: "piercing" },
  horn: { label: "Horn", damage: "piercing" },
  tusk: { label: "Tusk", damage: "piercing" },
  stinger: { label: "Stinger", damage: "piercing" },
  hoof: { label: "Hoof", damage: "bludgeoning" },
  tail: { label: "Tail", damage: "bludgeoning" },
  tentacle: { label: "Tentacle", damage: "bludgeoning" },
  tongue: { label: "Tongue", damage: "bludgeoning" },
  constriction: { label: "Constriction", damage: "bludgeoning" },
  ram: { label: "Ram", damage: "bludgeoning" },
  pincer: { label: "Pincer", damage: "slashing" },
  spine: { label: "Spine", damage: "piercing" },
  weapon: { label: "Weapon", damage: "varies" },
};

/** Vision capabilities (MM Overview pp.12–13). */
export const VISION_TYPES = {
  standard: { label: "Standard" },
  night: { label: "Night Vision" },
  lightless: { label: "Lightless Vision", ranged: true },
  acute: { label: "Acute Vision" },
  blind: { label: "Blind" },
};

/** Other special senses (MM Overview p.13). */
export const SENSE_TYPES = {
  acuteHearing: { label: "Acute Hearing" },
  acuteOlfaction: { label: "Acute Olfaction" },
  acuteVision: { label: "Acute Vision" },
  echolocation: { label: "Echolocation", ranged: true },
  mechAerial: { label: "Aerial Mechanoreception", ranged: true },
  mechAquatic: { label: "Aquatic Mechanoreception", ranged: true },
  mechTerrestrial: { label: "Terrestrial Mechanoreception", ranged: true },
  mechWebbed: { label: "Webbed Mechanoreception", ranged: true },
};

/** Movement types; the multi-row Speed table (MM Overview p.11). */
export const MOVEMENT_TYPES = {
  land: { label: "Land" },
  burrow: { label: "Burrow" },
  climb: { label: "Climb" },
  fly: { label: "Fly" },
  swim: { label: "Swim" },
  webcrawl: { label: "Webcrawl" },
};

/* ---------------------------------------------------------------- */
/*  Ability effect model (new — the shared binding target)           */
/* ---------------------------------------------------------------- */

/** Which flavour of `ability` item this is. */
export const ABILITY_CATEGORIES = {
  proficiency: { label: "Proficiency" },
  classPower: { label: "Class Power" },
  monsterAbility: { label: "Monster Ability" },
  skill: { label: "Skill" },
  drawback: { label: "Custom Drawback" }, // JJ "Custom Drawbacks" — traded FOR build points
  weaponProficiency: { label: "Weapon Proficiency" },
  armorProficiency: { label: "Armor Proficiency" },
  fightingStyle: { label: "Fighting Style" },
};

/** Domains a `proficiencyGrant` effect covers (RR Combat: Combat Proficiencies). */
export const PROFICIENCY_DOMAINS = {
  weapon: { label: "Weapon" },
  armor: { label: "Armor" },
  fightingStyle: { label: "Fighting Style" },
};

/**
 * Breadth of a weapon/armor proficiency grant (ACKS custom-class selection
 * tiers). A class import parameterizes the grant — e.g. "broad weapon
 * proficiency (missile + small melee)" — and the abilities rules define what
 * each tier permits. `group` holds the specific selection; `unrestricted`
 * grants all and carries no selection.
 */
export const PROFICIENCY_BREADTH = {
  unrestricted: { label: "Unrestricted" },
  broad: { label: "Broad" },
  narrow: { label: "Narrow" },
  restricted: { label: "Restricted" },
};

/** The typed effect primitives an ability's `effects[]` may hold. */
export const EFFECT_TYPES = {
  modifier: { label: "Modifier" }, // flat/level-scaling bonus OR penalty to a target
  throw: { label: "Proficiency Throw" }, // a target-number roll
  progressionAs: { label: "Progresses As Class" }, // "as a thief of his level"
  proficiencyGrant: { label: "Proficiency Grant" }, // weapon/armor/fighting-style proficiency
  limitation: { label: "Limitation / Drawback" }, // a restriction or penalty — attaches to ANY ability
  // --- Relational: abilities that depend on, grant, or alter OTHER abilities ---
  requires: { label: "Requires" }, // prerequisite ability/abilities
  grants: { label: "Grants" }, // confers other abilities (optionally choose N)
  modifies: { label: "Modifies" }, // changes another ability's value/throw
  immunity: { label: "Immunity" },
  resistance: { label: "Resistance" },
  susceptibility: { label: "Susceptibility" },
  sense: { label: "Sense" },
  movement: { label: "Movement" },
  naturalAttack: { label: "Natural Attack" },
  spellLike: { label: "Spell-Like Ability" },
  spellcastingMod: { label: "Spellcasting Modifier" },
  resource: { label: "Resource" }, // spend/gain fate points, spell slots, etc.
  conditionGrant: { label: "Condition / Immunity" },
  economic: { label: "Economic / Rate" },
  capability: { label: "Capability" }, // marker; detail lives in the (lazy) description
};

/** What a `modifier` effect adjusts. */
export const MODIFIER_TARGETS = {
  attackThrow: { label: "Attack Throw" },
  damage: { label: "Damage" },
  ac: { label: "Armor Class" },
  save: { label: "Saving Throw" },
  reaction: { label: "Reaction Roll" },
  initiative: { label: "Initiative" },
  surprise: { label: "Surprise" },
  morale: { label: "Morale" },
  loyalty: { label: "Loyalty" },
  speed: { label: "Speed" },
  proficiencyThrow: { label: "Proficiency Throw" },
  casterLevel: { label: "Caster Level" },
  hp: { label: "Hit Points" },
  research: { label: "Magic Research" },
  cleaves: { label: "Cleaves" },
};

/** Non-damage effect keywords (mirror acks-content `defenseEffect` register). */
export const EFFECT_KEYS = {
  enchantment: { label: "Enchantment" },
  charm: { label: "Charm" },
  sleep: { label: "Sleep" },
  hold: { label: "Hold" },
  paralysis: { label: "Paralysis" },
  petrification: { label: "Petrification" },
  death: { label: "Death" },
  poison: { label: "Poison" },
  disease: { label: "Disease" },
  energyDrain: { label: "Energy Drain" },
  fear: { label: "Fear" },
  gaze: { label: "Gaze" },
  illusion: { label: "Illusion" },
  mindAffecting: { label: "Mind-Affecting" },
  bleeding: { label: "Bleeding" },
  criticalHits: { label: "Critical Hits" },
  surprise: { label: "Surprise" },
};

/** Conditions an ability can grant or make one immune to. */
export const CONDITION_KEYS = {
  cowering: { label: "Cowering" },
  faltering: { label: "Faltering" },
  frightened: { label: "Frightened" },
  fear: { label: "Fear" },
  sleep: { label: "Sleep" },
  winded: { label: "Winded" },
  fatigued: { label: "Fatigued" },
  paralysis: { label: "Paralysis" },
  mesmerized: { label: "Mesmerized" },
  blinded: { label: "Blinded" },
  surprised: { label: "Surprised" },
};

/** Class progressions a `progressionAs` effect can borrow (thief skills etc.). */
export const PROGRESSION_CLASSES = {
  fighter: { label: "Fighter" },
  crusader: { label: "Crusader" },
  mage: { label: "Mage" },
  thief: { label: "Thief" },
};

/** The class-level fraction a `progressionAs` effect uses. */
export const PROGRESSION_LEVELS = {
  full: { label: "Full Level", factor: 1 },
  half: { label: "Half Level", factor: 0.5 },
  third: { label: "One-Third Level", factor: 1 / 3 },
  quarter: { label: "One-Quarter Level", factor: 0.25 },
};

/** Spell-like ability usage frequency. */
export const SPELL_LIKE_FREQ = {
  atWill: { label: "At Will" },
  perRound: { label: "Once per Round" },
  perTurn: { label: "Once per Turn" },
  perHour: { label: "Once per Hour" },
  per8Hours: { label: "Once per 8 Hours" },
  perDay: { label: "Once per Day" },
  perWeek: { label: "Once per Week" },
  perMonth: { label: "Once per Month" },
  perYear: { label: "Once per Year" },
  byLevel: { label: "By Caster Level (scheduled)" },
};

/** Resources an ability spends or grants. */
export const RESOURCE_KINDS = {
  fatePoint: { label: "Fate Point" },
  spellSlot: { label: "Spell Slot" },
  stigma: { label: "Stigma" },
  hp: { label: "Hit Points" },
};

/**
 * How an effect combines with what it targets. The books distinguish these
 * constantly: Skulking ADDs +2 to Hiding/Sneaking throws; Alertness REPLACEs
 * its own 14+ with "+2 to your throw instead" when you already have Searching;
 * Counterspelling's +2 caster levels becomes 3 (a REPLACE variant) when you
 * also have Bright Lore of Aura.
 */
export const EFFECT_MODES = {
  add: { label: "Add" },
  replace: { label: "Replace" },
  set: { label: "Set" },
};

/**
 * How a converted / retired thing is surfaced. A RENAMED thing just resolves —
 * it needs no marker. Content the books removed deliberately is a CAUTION;
 * content merely omitted from ACKS II (and which may return) is INFO, since it
 * still works, it just was not designed for this edition.
 */
export const CONVERSION_STATUS = {
  renamed: { label: "Renamed", severity: "none", tip: "" },
  deleted: {
    label: "Deleted",
    severity: "caution",
    tip: "This content is not advised for a typical ACKS II campaign.",
  },
  absent: {
    label: "Absent",
    severity: "info",
    tip: "This content has not been designed for ACKS II, use with care.",
  },
};

/** Roll comparison (mirror core `CONFIG.ACKS.roll_type`). */
export const ROLL_TYPES = {
  result: { label: "=" },
  above: { label: "≥" },
  below: { label: "≤" },
};

/* ---------------------------------------------------------------- */
/*  LevelValue — the level-scaling spine                             */
/* ---------------------------------------------------------------- */

/**
 * A value that may be flat or a function of class level. Shapes:
 *   5                                  flat
 *   { kind:"perLevel", base, per }     base + per·(level-1)   (18+, −1/level)
 *   { kind:"breakpoints", breakpoints:[{atLevel,value}] }     +1/+2/+3 @1/7/13
 *   { kind:"progression", as, atLevel }   external class table (thief skills)
 *
 * `resolveLevelValue` returns the numeric value at `level`, or `null` when it
 * needs an external progression table the caller must resolve (kind
 * "progression"). Pure and Foundry-free.
 */
export function resolveLevelValue(lv, level = 1) {
  if (lv == null) return null;
  if (typeof lv === "number") return lv;
  if (typeof lv !== "object") return null;
  const kind = lv.kind ?? inferLevelKind(lv);
  switch (kind) {
    case "flat":
      return lv.flat ?? null;
    case "perLevel":
      return lv.base == null ? null : lv.base + (lv.per ?? 0) * (Math.max(1, level) - 1);
    case "breakpoints": {
      let value = null;
      for (const bp of [...(lv.breakpoints ?? [])].sort((a, b) => a.atLevel - b.atLevel)) {
        if (level >= bp.atLevel) value = bp.value;
      }
      return value;
    }
    case "progression":
      return null; // caller resolves via the referenced class table
    default:
      return null;
  }
}

function inferLevelKind(lv) {
  if (lv.flat != null) return "flat";
  if (lv.base != null) return "perLevel";
  if (Array.isArray(lv.breakpoints)) return "breakpoints";
  if (lv.as || lv.progressionAs) return "progression";
  return "flat";
}
