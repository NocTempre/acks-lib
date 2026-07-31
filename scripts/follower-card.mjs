/* global foundry */
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

/** Damage of the first equipped weapon of a kind, with the actor's damage mod. */
function weaponDamage(weapons, kind, mod) {
  const w = weapons.find((it) => it.system?.equipped && it.system?.[kind]);
  if (!w) return "";
  const dice = w.system?.damage ?? "";
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
    ac: num(sys.aac?.value),
    acMod: num(sys.aac?.mod),
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

  // Attacks. Mirror exactly what core's own sheet displays — no invented formulas.
  if (isMonster) {
    const equippedAttacks = weapons.filter((w) => w.system?.equipped && (w.system?.melee || w.system?.missile)).length;
    ctx.attacksCount = equippedAttacks || 1;
    ctx.attackDamage =
      weaponDamage(weapons, "melee", num(sys.damage?.mod?.melee)) ||
      weaponDamage(weapons, "missile", num(sys.damage?.mod?.missile));
  } else {
    ctx.melee = {
      value: signed(num(sys.scores?.str?.mod) + num(sys.thac0?.mod?.melee)),
      at: 1,
      dmg: weaponDamage(weapons, "melee", num(sys.damage?.mod?.melee)),
    };
    ctx.missile = {
      value: signed(num(sys.scores?.dex?.mod) + num(sys.thac0?.mod?.missile)),
      at: 1,
      dmg: weaponDamage(weapons, "missile", num(sys.damage?.mod?.missile)),
    };
  }

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
