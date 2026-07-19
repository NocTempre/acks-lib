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
  reroll: { label: "Reroll" }, // roll twice, keep the better/worse (resolvable — see resolveReroll)
  companion: { label: "Companion" }, // a creature the ability confers; links to a monster entry
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
 * How a converted / retired thing is surfaced. All three are MARKED — a rename
 * resolves silently as far as lookup goes, but the reader still deserves to
 * know the name on the page in front of them is not the name in the book they
 * are holding. Content the books removed deliberately is a CAUTION; content
 * merely omitted from ACKS II (and which may return) is INFO, since it still
 * works, it just was not designed for this edition.
 *
 * `tip` is a TEMPLATE: `{name}` interpolates the source name via
 * `conversionTip()`. Consumers read icon/severity/tip from here rather than
 * inventing their own wording, so the family says the same thing everywhere.
 */
export const CONVERSION_STATUS = {
  renamed: {
    label: "Renamed",
    severity: "note",
    icon: "fa-solid fa-tag",
    tip: "{name} has been renamed for ACKS II.",
  },
  deleted: {
    label: "Deleted",
    severity: "caution",
    icon: "fa-solid fa-triangle-exclamation",
    tip: "This content is not advised for a typical ACKS II campaign.",
  },
  absent: {
    label: "Absent",
    severity: "info",
    icon: "fa-solid fa-circle-info",
    tip: "This content has not been designed for ACKS II, use with care.",
  },
};

/**
 * The tooltip for a conversion status, with `{name}` filled in. `name` is the
 * PRE-conversion name (what the older source called it) — that is the thing the
 * reader is trying to reconcile. Returns "" for an unknown status.
 */
export function conversionTip(status, name = "") {
  const tip = CONVERSION_STATUS[status]?.tip;
  if (!tip) return "";
  return tip.replace(/\{name\}/g, name || "This content");
}

/** Roll comparison (mirror core `CONFIG.ACKS.roll_type`). */
export const ROLL_TYPES = {
  result: { label: "=" },
  above: { label: "≥" },
  below: { label: "≤" },
};

/* ---------------------------------------------------------------- */
/*  Capabilities — the gate pattern                                  */
/* ---------------------------------------------------------------- */

/**
 * A CAPABILITY is what an ability lets you do, named independently of which
 * ability grants it. Abilities declare what they `provide`; prerequisites,
 * gates and stacking rules are written against the capability, not against one
 * specific entry.
 *
 * This is what makes gates survive the books' habit of printing the same
 * capability several ways. "Searching" is a thief skill, a proficiency, and the
 * thing several class powers hand out; an alias prints it under another name
 * again. A gate written as `def.prof.searching` misses every one of those. A
 * gate written as `kw:searching` catches them all, because each of them
 * provides that capability.
 *
 * It also gives aliases and non-stacking ONE mechanism instead of two: two
 * abilities that provide the same capability are the same capability twice, so
 * they do not stack — that falls out of the data rather than being asserted
 * per pair.
 *
 * Tokens: `def.<class>.<slug>` names one exact ability; `kw:<slug>` names a
 * capability. Anywhere a ref is accepted (`requires`, `ifHas`, `stacksWith`,
 * `notStacksWith`), either form works.
 */
export const CAPABILITY_PREFIX = "kw:";

export const isCapabilityToken = (token) => String(token ?? "").startsWith(CAPABILITY_PREFIX);

/** "def.prof.sensingEvil" → "kw:sensingevil". Case- and separator-folded. */
export const capabilityForId = (id) =>
  CAPABILITY_PREFIX +
  String(id ?? "")
    .split(".")
    .slice(2)
    .join("")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

/**
 * Does a character holding `abilities` satisfy `token`?
 *
 * `abilities` is a list of `{ id, provides }`. A definition-id token needs that
 * exact ability; a `kw:` token is satisfied by ANY ability providing it — and
 * an ability always implicitly provides its own id's capability, so a gate can
 * be written against a capability before anything has been tagged.
 */
export function satisfies(abilities, token) {
  if (!token) return true;
  const list = abilities ?? [];
  if (!isCapabilityToken(token)) return list.some((a) => a?.id === token);
  const want = token.toLowerCase();
  return list.some(
    (a) => capabilityForId(a?.id) === want || (a?.provides ?? []).some((p) => String(p).toLowerCase() === want),
  );
}

/** Every token in `tokens` satisfied (an ability's `requires` / `ifHas`). */
export const satisfiesAll = (abilities, tokens) => (tokens ?? []).every((t) => satisfies(abilities, t));

/**
 * Group abilities that provide the same capability. Each group beyond size 1 is
 * the same capability held more than once — which does not stack. Returned as
 * `capability -> [ability ids]`, only for capabilities held more than once, so
 * a caller can warn or suppress without having to diff anything itself.
 */
export function nonStackingGroups(abilities) {
  const by = new Map();
  for (const a of abilities ?? []) {
    const caps = new Set([capabilityForId(a?.id), ...(a?.provides ?? []).map((p) => String(p).toLowerCase())]);
    for (const c of caps) {
      if (!c || c === CAPABILITY_PREFIX) continue;
      (by.get(c) ?? by.set(c, []).get(c)).push(a.id);
    }
  }
  return Object.fromEntries([...by].filter(([, ids]) => ids.length > 1));
}

/** Which of a reroll's results is kept. */
export const REROLL_KEEP = {
  better: { label: "Keep the Better" },
  worse: { label: "Keep the Worse" },
  latest: { label: "Keep the New Roll" }, // no choice — the reroll simply stands
};

/**
 * Resolve a reroll: given every result rolled, return the one that stands.
 *
 * "Better" is not "higher" — ACKS throws run both directions. An attack or
 * proficiency throw is roll-HIGH (`above`), so better is the maximum; a roll
 * measured against a ceiling (`below`) is roll-LOW, so better is the minimum.
 * Passing the effect's own `rollType` keeps the polarity honest instead of
 * hardcoding one direction and being wrong half the time.
 *
 * Returns null on an empty result set. Pure and Foundry-free.
 */
export function resolveReroll(results, keep = "better", rollType = "above") {
  const vals = (results ?? []).filter((n) => typeof n === "number" && !Number.isNaN(n));
  if (!vals.length) return null;
  if (keep === "latest") return vals[vals.length - 1];
  const rollHigh = rollType !== "below";
  const wantMax = keep === "worse" ? !rollHigh : rollHigh;
  return wantMax ? Math.max(...vals) : Math.min(...vals);
}

/**
 * How many results a reroll effect produces in total (the original plus its
 * rerolls). `times` is the number of EXTRA rolls and defaults to 1, so the
 * common "roll twice" needs no field set at all.
 */
export const rerollTotal = (effect) => 1 + Math.max(0, Math.trunc(effect?.times ?? 1));

/**
 * Scales a `conditional` value can key on, besides class level.
 *
 * TODO(magic): `arcaneValue` / `divineValue` exist so a custom-class power can
 * state a cost that varies by the class's spellcasting value ("counts as 1
 * power at Arcane Value 1-2, 2 at Arcane Value 3-4"). NOTHING CONSUMES THESE
 * YET — the primitive is deliberately built ahead of the magic work, and the
 * ability model still stores a plain numeric `powerValue`. Wire `powerValue`
 * onto `levelValueField()` when magic lands.
 */
export const VALUE_SCALES = {
  level: { label: "Class Level" },
  // How many TIMES the proficiency has been taken. Several RR proficiencies are
  // rated this way rather than by level — Animal Husbandry's diagnosis throw is
  // 11+ at one rank, 7+ at two, 3+ at three — and the ranks carry different
  // titles (Veterinarian, Veterinary Surgeon) and unlock different rolls.
  rank: { label: "Rank (times taken)" },
  arcaneValue: { label: "Arcane Value" },
  divineValue: { label: "Divine Value" },
  hitDice: { label: "Hit Dice" },
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
 *   { kind:"conditional", on, breakpoints:[{atLevel,value}] } keyed on a
 *                                      VALUE_SCALES scale instead of level
 *
 * A `conditional` reuses the breakpoint ladder verbatim — only the number fed
 * into it changes, from class level to `scales[on]`. So `atLevel` reads "at
 * this value of `on`", and one array shape covers both.
 *
 * `resolveLevelValue` returns the numeric value at `level`, or `null` when it
 * needs something the caller must supply — an external progression table (kind
 * "progression") or a scale absent from `scales` (kind "conditional"). Pure and
 * Foundry-free.
 */
export function resolveLevelValue(lv, level = 1, scales = {}) {
  if (lv == null) return null;
  if (typeof lv === "number") return lv;
  if (typeof lv !== "object") return null;
  const kind = lv.kind ?? inferLevelKind(lv);
  switch (kind) {
    case "flat":
      return lv.flat ?? null;
    case "perLevel":
      return lv.base == null ? null : lv.base + (lv.per ?? 0) * (Math.max(1, level) - 1);
    case "breakpoints":
      return atBreakpoint(lv.breakpoints, level);
    case "conditional": {
      const at = lv.on === "level" ? level : scales?.[lv.on];
      return typeof at === "number" ? atBreakpoint(lv.breakpoints, at) : null;
    }
    case "progression":
      return null; // caller resolves via the referenced class table
    default:
      return null;
  }
}

/** The last breakpoint value `at` reaches, or null below the first one. */
function atBreakpoint(breakpoints, at) {
  let value = null;
  for (const bp of [...(breakpoints ?? [])].sort((a, b) => a.atLevel - b.atLevel)) {
    if (at >= bp.atLevel) value = bp.value;
  }
  return value;
}

function inferLevelKind(lv) {
  if (lv.on) return "conditional";
  if (lv.flat != null) return "flat";
  if (lv.base != null) return "perLevel";
  if (Array.isArray(lv.breakpoints)) return "breakpoints";
  if (lv.as || lv.progressionAs) return "progression";
  return "flat";
}
