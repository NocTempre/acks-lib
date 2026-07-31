/* global foundry, game */
/**
 * The ACKS II "Follower Card" — the printed henchman/follower card, rendered as a
 * compact, theme-styled view of an actor.
 *
 * One layout serves two surfaces:
 *   - the editable FollowerCardSheet (a hireling's default sheet), and
 *   - the read-only cards the character sheet's hirelings tab is re-skinned into
 *     (acks-henchmen), where the SAME markup must emit no `name=` inputs — those
 *     would bind to the EMPLOYER's form — only the system's own hireling actions.
 *
 * Every derived number is precomputed HERE, in JS, so the template needs no system
 * Handlebars helper and one code path covers both `character` and `monster` actors
 * (a monster is a hireling too: MonsterData carries the same `retainer` schema, and
 * the monster-hire path sets `retainer.enabled`). The character-only derivations
 * core gates on `type === "character"` (ability mods, AC, encumbrance) simply do not
 * appear for monsters — the card hides the ability grid and reads the monster's own
 * HD / stored AC instead.
 */
import { MODULE_ID } from "./constants.mjs";
import { monsterHd } from "./actor-read.mjs";
import { isEquippable, isEquipped } from "./item-model.mjs";
import { attackOptionsFor, damageTypeLabel, DAMAGE_TYPE_ICONS, UNTYPED_ICON } from "./damage-type.mjs";

export const FOLLOWER_CARD_TEMPLATE = `modules/${MODULE_ID}/templates/follower-card.hbs`;

/** Printed-card ability order. "WIL" is the label; the system stores it as `wis`. */
const ABILITY_ROW = [
  { key: "str", label: "STR" },
  { key: "int", label: "INT" },
  { key: "wis", label: "WIL" },
  { key: "dex", label: "DEX" },
  { key: "con", label: "CON" },
  { key: "cha", label: "CHA" },
];

/** The character adventuring throws (RR 17), each rolled via actor.rollAdventuring. */
const ADVENTURING = [
  { key: "dungeonbashing", label: "ACKS.adventuring.dungeonbashing", icon: "fas fa-hammer" },
  { key: "climb", label: "ACKS.adventuring.climb", icon: "fas fa-mountain" },
  { key: "listening", label: "ACKS.adventuring.listening", icon: "fas fa-ear-listen" },
  { key: "searching", label: "ACKS.adventuring.searching", icon: "fas fa-magnifying-glass" },
  { key: "trapbreaking", label: "ACKS.adventuring.trapbreaking", icon: "fas fa-toolbox" },
];

const num = (v, d = 0) => (Number.isFinite(Number(v)) ? Number(v) : d);
const signed = (v) => {
  const n = num(v);
  return n >= 0 ? `+${n}` : `${n}`;
};

/** 1/6-stone weight → the stone figure the printed sheet writes (e.g. "3 2/6"). */
function stones(value6) {
  const n = Math.max(0, num(value6));
  const whole = Math.floor(n / 6);
  const sixths = n % 6;
  return sixths ? `${whole} ${sixths}/6` : String(whole);
}

/** Hit Dice as the printed card writes it: an integer, or the ½ fraction. */
function hdLabel(actor) {
  const hd = monsterHd(actor);
  return hd === 0.5 ? "½" : String(hd);
}

/** A damage die with the actor's damage modifier appended (blank stays blank). */
function withMod(dice, mod) {
  if (!dice) return "";
  return mod ? `${dice}${signed(mod)}` : `${dice}`;
}

/**
 * Build the Follower Card view model for an actor.
 * @param {Actor} actor
 * @param {{editable?: boolean}} [opts]
 * @returns {object} a flat view model consumed by follower-card.hbs
 */
export function followerCardContext(actor, { editable = false } = {}) {
  const sys = actor?.system ?? {};
  const isMonster = actor?.type === "monster";
  const items = actor?.items?.contents ?? [];
  // Sticky card-only overrides (flags.acks-lib.fcOverrides): the quick sheet reads
  // and rolls with these, the main character sheet ignores them. Reset clears them;
  // Commit bakes them into the real base fields. Shape: { ac, adventuring: {key} }.
  const overrides = actor?.getFlag?.(MODULE_ID, "fcOverrides") ?? {};
  const advOv = overrides.adventuring ?? {};

  const weapons = items.filter((i) => i.type === "weapon");
  // Powers/prof and equipment carry ids so the editable sheet can roll them and
  // toggle equipped state; the read-only grid just reads `.name`.
  const powers = items.filter((i) => i.type === "ability").map((i) => ({ id: i.id, name: i.name }));
  const equipment = items
    .filter((i) => i.type === "weapon" || i.type === "armor" || i.type === "item")
    .map((i) => {
      const q = num(i.system?.quantity?.value, 1);
      return {
        id: i.id,
        name: q > 1 ? `${i.name} ×${q}` : i.name,
        equippable: isEquippable(i),
        equipped: isEquipped(i),
      };
    });

  const ctx = {
    editable,
    isMonster,
    id: actor?.id,
    name: actor?.name ?? "",
    img: actor?.img,
    alignment: sys.details?.alignment ?? "",
    klass: isMonster ? "" : sys.details?.class ?? "",
    ac: overrides.ac != null ? num(overrides.ac) : num(sys.aac?.value),
    acOverridden: overrides.ac != null,
    hp: { value: num(sys.hp?.value), max: num(sys.hp?.max) },
    morale: num(sys.details?.morale),
    loyalty: num(sys.retainer?.loyalty),
    attackThrow: num(sys.thac0?.throw, 10),
    powers,
    equipment,
    // Character keeps a dedicated notes field; a monster's prose is its biography.
    notesPath: isMonster ? "system.details.biography" : "system.details.notes",
    notes: isMonster ? sys.details?.biography ?? "" : sys.details?.notes ?? "",
  };

  // LEVEL / HD + XP (shape differs by type)
  if (isMonster) {
    ctx.levelLabel = "ACKS.HitDiceShort";
    ctx.level = hdLabel(actor);
    ctx.levelReadonly = true; // HD is edited on the full monster sheet
    ctx.xp = num(sys.details?.xp);
  } else {
    ctx.levelLabel = "ACKS.details.level";
    ctx.level = num(sys.details?.level, 1);
    ctx.levelReadonly = false;
    ctx.xp = num(sys.details?.xp?.value);
    ctx.xpNext = num(sys.details?.xp?.next);
  }

  // Abilities — character only (monster scores/mods are not computed by core)
  ctx.hasAbilities = !isMonster && !!sys.scores;
  ctx.abilities = ctx.hasAbilities
    ? ABILITY_ROW.map(({ key, label }) => ({
        key,
        label,
        value: num(sys.scores?.[key]?.value),
        mod: signed(sys.scores?.[key]?.mod),
      }))
    : [];

  // Speed: character combat/exploration; monster base/value string
  ctx.speed = isMonster
    ? { primary: num(sys.movement?.base), secondary: sys.movement?.value ?? "" }
    : { primary: num(sys.movementacks?.combat), secondary: num(sys.movementacks?.exploration) };

  // Encumbrance — character only (computeEncumbrance is character-gated in core)
  ctx.enc = isMonster ? null : { value: stones(sys.encumbrance?.value6), max: stones(sys.encumbrance?.max6) };

  // ATTACKS — one row per option the body actually has, each with its damage-type
  // icon. Target vs bonus stays DISTINCT (the ACKS model the patched roll uses):
  // the attack throw is the MOVING TARGET (class/level); the ability mod and
  // attack adjustment are ROLL-ADD bonuses. Never folded into one number.
  const throwTarget = num(sys.thac0?.throw, 10);
  const bonusFor = (type) =>
    // A monster's natural attack takes no ability modifier (it has no scores).
    isMonster
      ? 0
      : type === "missile"
        ? num(sys.scores?.dex?.mod) + num(sys.thac0?.mod?.missile)
        : num(sys.scores?.str?.mod) + num(sys.thac0?.mod?.melee);
  const dmgModFor = (type) => num(sys.damage?.mod?.[type]);

  const equippedWeapons = weapons.filter((w) => w.system?.equipped);
  if (isMonster && !equippedWeapons.length) {
    // A monster with no gear fights with its own routine, not "unarmed".
    ctx.attacks = [
      {
        key: "natural",
        label: game.i18n?.has?.("ACKS-LIB.followerCard.attack")
          ? game.i18n.localize("ACKS-LIB.followerCard.attack")
          : "Attack",
        type: "attack",
        itemId: null,
        icon: DAMAGE_TYPE_ICONS.varies ?? UNTYPED_ICON,
        damageTypeLabel: "",
        target: throwTarget,
        bonus: signed(0),
        at: 1,
        dmg: "",
      },
    ];
  } else {
    ctx.attacks = attackOptionsFor(actor).map((o) => ({
      ...o,
      damageTypeLabel: damageTypeLabel(o.damageType),
      target: throwTarget,
      bonus: signed(bonusFor(o.type)),
      dmg: o.damage ? withMod(o.damage, dmgModFor(o.type === "missile" ? "missile" : "melee")) : "",
    }));
  }

  // Adventuring throws (character only) get their own rollable row — but only for
  // a hireling actually trained in Adventuring (matched on the proficiency name).
  ctx.hasAdventuring = !isMonster && items.some((i) => i.type === "ability" && /adventuring/i.test(i.name ?? ""));
  ctx.adventuring =
    isMonster || !sys.adventuring
      ? []
      : ADVENTURING.map(({ key, label, icon }) => ({
          key,
          label,
          icon,
          value: advOv[key] != null ? num(advOv[key]) : num(sys.adventuring?.[key]),
          overridden: advOv[key] != null,
        }));

  ctx.hasOverrides = overrides.ac != null || Object.keys(advOv).length > 0;
  return ctx;
}

/**
 * Render the Follower Card to an HTML string.
 * @param {Actor} actor
 * @param {{editable?: boolean}} [opts]
 * @returns {Promise<string>}
 */
export async function renderFollowerCard(actor, { editable = false } = {}) {
  const ctx = followerCardContext(actor, { editable });
  return foundry.applications.handlebars.renderTemplate(FOLLOWER_CARD_TEMPLATE, ctx);
}
