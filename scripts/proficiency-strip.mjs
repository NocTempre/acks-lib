/* global game */
/**
 * Compact profile strips: fighting styles, weapon categories, armour.
 *
 * These are STATES, not list entries. A sheet that spells them out as rows
 * ("Fighting Style: Dual Weapon", "Armour Proficiency: Heavy", …) buries the
 * proficiencies that actually do something under a wall of flags. So they render
 * as an always-visible strip: every slot is shown, a trained one lights up, and a
 * SPECIALIZED / FOCUSED one goes gold. Nothing is hidden and nothing repeats.
 *
 * The state is read from acks-equipment's own profile API (effects + actor flags)
 * — never from item names — so it stays right however the training was granted.
 * With that module absent there is no profile to read and the strips are empty
 * (the card simply omits them) rather than guessed at.
 */
import { DAMAGE_TYPE_ICONS, UNTYPED_ICON } from "./damage-type.mjs";

const equipmentApi = () => globalThis.acksEquipment ?? game.modules?.get("acks-equipment")?.api ?? null;

/** Fighting styles (JJ p.291), in the order the books present them. */
const STYLES = [
  { key: "single", icon: "fas fa-1", label: "ACKS-LIB.style.single", fallback: "Single Weapon" },
  { key: "dual", icon: "fas fa-2", label: "ACKS-LIB.style.dual", fallback: "Dual Weapon" },
  { key: "twohanded", icon: "fas fa-hands", label: "ACKS-LIB.style.twoHanded", fallback: "Two-Handed Weapon" },
  { key: "weaponshield", icon: "fas fa-shield-halved", label: "ACKS-LIB.style.weaponShield", fallback: "Weapon & Shield" },
  { key: "missile", icon: "fas fa-crosshairs", label: "ACKS-LIB.style.missile", fallback: "Missile" },
];

/** Weapon categories. Short text chips — the free icon set has no distinct
 *  axe/bow/mace glyphs, and a shared glyph would say less than two letters. */
const WEAPON_CATEGORIES = [
  { key: "axe", chip: "AX", label: "ACKS-LIB.weaponCat.axe", fallback: "Axes" },
  { key: "bow", chip: "BW", label: "ACKS-LIB.weaponCat.bow", fallback: "Bows" },
  { key: "crossbow", chip: "XB", label: "ACKS-LIB.weaponCat.crossbow", fallback: "Crossbows" },
  { key: "flailhammermace", chip: "MC", label: "ACKS-LIB.weaponCat.flailHammerMace", fallback: "Flails, Hammers & Maces" },
  { key: "sworddagger", chip: "SW", label: "ACKS-LIB.weaponCat.swordDagger", fallback: "Swords & Daggers" },
  { key: "spearpolearm", chip: "SP", label: "ACKS-LIB.weaponCat.spearPolearm", fallback: "Spears & Polearms" },
  { key: "other", chip: "OT", label: "ACKS-LIB.weaponCat.other", fallback: "Other" },
];

/** Armour ladder, lightest first. A rank at or below the max is trained. */
const ARMOUR = [
  { key: "none", icon: "fas fa-user", label: "ACKS-LIB.armour.none", fallback: "Unarmoured" },
  { key: "light", icon: "fas fa-shirt", label: "ACKS-LIB.armour.light", fallback: "Light" },
  { key: "medium", icon: "fas fa-vest", label: "ACKS-LIB.armour.medium", fallback: "Medium" },
  { key: "heavy", icon: "fas fa-shield", label: "ACKS-LIB.armour.heavy", fallback: "Heavy" },
];

const loc = (key, fallback) => (game.i18n?.has?.(key) ? game.i18n.localize(key) : fallback);
const norm = (s) => String(s ?? "").toLowerCase().replace(/[^a-z]/g, "");

/**
 * Ability items that merely RECORD one of these states — they belong in the
 * strips, not in the proficiency list. Matched on a normalised name prefix, the
 * same way acks-equipment matches its own proficiency names.
 */
export const isProfileAbility = (item) =>
  item?.type === "ability" && /^(fightingstyle|armou?rproficiency|weaponproficiency|weaponfocus)/.test(norm(item.name));

/**
 * Build the three strips for an actor.
 * @returns {{styles: object[], weapons: object[], armour: object[], any: boolean}}
 */
export function profileStrips(actor) {
  const api = equipmentApi();
  if (!api || actor?.type !== "character") return { styles: [], weapons: [], armour: [], any: false };

  let trained = new Set();
  let spec = new Set();
  let weaponProf = null;
  let armourMax = null;
  try {
    trained = new Set([...(api.trainedStyles?.(actor) ?? [])].map(norm));
    spec = new Set([...(api.specializedStyles?.(actor) ?? [])].map(norm));
    weaponProf = api.weaponProficiency?.(actor) ?? null;
    armourMax = api.armorMax?.(actor) ?? null;
  } catch {
    return { styles: [], weapons: [], armour: [], any: false };
  }

  const styles = STYLES.map((s) => ({
    key: s.key,
    icon: s.icon,
    label: loc(s.label, s.fallback),
    on: trained.has(s.key),
    gold: spec.has(s.key),
  }));

  // weaponProficiency answers with `{all, tokens}` (tokens a Set) — it also
  // accepts a bare "all", array or CSV from older builds, so normalise all four.
  const allWeapons = weaponProf?.all === true || norm(weaponProf) === "all";
  const rawTokens = weaponProf?.tokens ?? weaponProf;
  const tokenList =
    rawTokens instanceof Set
      ? [...rawTokens]
      : Array.isArray(rawTokens)
        ? rawTokens
        : rawTokens && typeof rawTokens === "object"
          ? Object.keys(rawTokens)
          : String(rawTokens ?? "").split(",");
  const profTokens = new Set(tokenList.map(norm).filter(Boolean));

  // Weapon Focus is per weapon GROUP (RR p.121); map each group to the category
  // it sharpens so a focused category reads gold.
  const FOCUS_TO_CATEGORY = {
    axes: "axe",
    macesflailshammers: "flailhammermace",
    swordsdaggers: "sworddagger",
    bowscrossbows: "bow",
    slingsthrown: "other",
    spearspolearms: "spearpolearm",
  };
  const focusCats = new Set();
  try {
    const domain = api.EFFECT_DOMAINS?.WEAPON_FOCUS ?? "weaponFocus";
    for (const g of api.collectStringFlags?.(actor, domain) ?? []) {
      const cat = FOCUS_TO_CATEGORY[norm(g)];
      if (cat) focusCats.add(cat);
      // A focused bow group also covers crossbows.
      if (norm(g) === "bowscrossbows") focusCats.add("crossbow");
    }
  } catch {
    /* no focus data — no gold, which is the honest default */
  }

  const weapons = WEAPON_CATEGORIES.map((c) => ({
    key: c.key,
    chip: c.chip,
    label: loc(c.label, c.fallback),
    on: allWeapons || profTokens.has(c.key),
    gold: focusCats.has(c.key),
  }));

  const maxRank = ARMOUR.findIndex((a) => a.key === norm(armourMax));
  const armour = ARMOUR.map((a, i) => ({
    key: a.key,
    icon: a.icon,
    label: loc(a.label, a.fallback),
    on: maxRank >= 0 && i <= maxRank,
    gold: false,
  }));

  return { styles, weapons, armour, any: true };
}

/** Weapon size as pips (tiny 1 → large 4); 0 when the size is unknown. */
export function sizePips(item) {
  const order = ["tiny", "small", "medium", "large"];
  let size = null;
  try {
    size = equipmentApi()?.classifyWeapon?.(item)?.size ?? null;
  } catch {
    size = null;
  }
  const i = order.indexOf(norm(size));
  if (i < 0) return { count: 0, label: "", pips: [] };
  return {
    count: i + 1,
    label: loc(`ACKS-LIB.size.${order[i]}`, order[i]),
    pips: Array.from({ length: i + 1 }, (_, n) => n),
  };
}

export { DAMAGE_TYPE_ICONS, UNTYPED_ICON };
