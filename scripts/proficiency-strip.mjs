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

/**
 * Every weapon class a character can be proficient with, plus unarmed. These are
 * the pills; the class-build SELECTION (JJ p. 290) decides which light up, and a
 * single selection routinely covers several of them — "all melee of medium size
 * or smaller" lights every melee class, a narrow grouping lights one.
 *
 * Two of the classes are themselves plural groupings in the books (flails/
 * hammers/maces, swords/daggers), which is why these are classes rather than
 * individual weapons.
 */
const WEAPON_CLASSES = [
  { key: "unarmed", chip: "UN", melee: true, label: "ACKS-LIB.weaponCat.unarmed", fallback: "Unarmed" },
  { key: "axe", chip: "AX", melee: true, label: "ACKS-LIB.weaponCat.axe", fallback: "Axes" },
  { key: "sworddagger", chip: "SW", melee: true, label: "ACKS-LIB.weaponCat.swordDagger", fallback: "Swords & Daggers" },
  { key: "flailhammermace", chip: "MC", melee: true, label: "ACKS-LIB.weaponCat.flailHammerMace", fallback: "Flails, Hammers & Maces" },
  { key: "spearpolearm", chip: "SP", melee: true, label: "ACKS-LIB.weaponCat.spearPolearm", fallback: "Spears & Polearms" },
  { key: "bow", chip: "BW", missile: true, label: "ACKS-LIB.weaponCat.bow", fallback: "Bows" },
  { key: "crossbow", chip: "XB", missile: true, label: "ACKS-LIB.weaponCat.crossbow", fallback: "Crossbows" },
  { key: "other", chip: "OT", melee: true, missile: true, label: "ACKS-LIB.weaponCat.other", fallback: "Other (slings, staffs, nets, whips…)" },
];

/** Armour SELECTION ladder (JJ p. 290), lightest first — five rungs, not four. */
const ARMOUR = [
  { key: "unarmored", icon: "fas fa-user", label: "ACKS-LIB.armour.unarmored", fallback: "Unarmoured" },
  { key: "verylight", icon: "fas fa-shirt", label: "ACKS-LIB.armour.veryLight", fallback: "Very Light" },
  { key: "light", icon: "fas fa-vest", label: "ACKS-LIB.armour.light", fallback: "Light" },
  { key: "medium", icon: "fas fa-user-shield", label: "ACKS-LIB.armour.medium", fallback: "Medium" },
  { key: "heavy", icon: "fas fa-shield", label: "ACKS-LIB.armour.heavy", fallback: "Heavy" },
];

/**
 * Which weapon CLASSES a proficiency token set covers, read through
 * acks-equipment's own documented grammar (proficiency.mjs):
 *   all            → every class
 *   melee:<size>   → every melee class (a broad choice; size is per-weapon and
 *                    cannot be expressed at class granularity)
 *   missile:all    → every missile class
 *   <category>     → that class
 *   <weaponKey>    → the class that weapon belongs to (via the profile table)
 * Unarmed is always available — anyone may strike unarmed — so it lights for
 * every character and golds only with the Unarmed Fighting proficiency.
 */
function coveredClasses(all, tokens, api) {
  const covered = new Set(["unarmed"]);
  if (all) {
    for (const c of WEAPON_CLASSES) covered.add(c.key);
    return covered;
  }
  const weaponTable = api?.config?.WEAPONS ?? {};
  for (const t of tokens) {
    if (t.startsWith("melee")) {
      for (const c of WEAPON_CLASSES) if (c.melee) covered.add(c.key);
      continue;
    }
    if (t.startsWith("missile")) {
      for (const c of WEAPON_CLASSES) if (c.missile) covered.add(c.key);
      continue;
    }
    if (WEAPON_CLASSES.some((c) => c.key === t)) {
      covered.add(t);
      continue;
    }
    // A bare weapon key: light the class that weapon belongs to.
    const cat = norm(weaponTable[t]?.cat);
    if (cat && WEAPON_CLASSES.some((c) => c.key === cat)) covered.add(cat);
  }
  return covered;
}

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

  /**
   * "Unconfigured" is NOT "proficient in everything". acks-equipment answers
   * permissively when a character has no profile — `{all: true}` for weapons and
   * `heavy` for armour — so it never penalises an un-set-up actor at roll time.
   * Lighting the whole strip off that default would state a proficiency the
   * character has not been given. So a group with no explicit profile (no flag,
   * no granting effect) shows only what is true for ANY body: unarmed, and
   * unarmoured, plus the two mandatory fighting styles.
   */
  const flagSet = (k) => {
    const v = actor.getFlag?.("acks-equipment", k);
    return v != null && v !== "" && !(Array.isArray(v) && !v.length);
  };
  const stylesConfigured = flagSet("styles") || trained.size > 2 || spec.size > 0;

  // With no profile the whole group is UNKNOWN — every pill greys out, including
  // the styles every class technically has. An unset sheet states nothing; a set
  // one states exactly what it was given.
  const styles = STYLES.map((s) => ({
    key: s.key,
    icon: s.icon,
    label: loc(s.label, s.fallback),
    on: stylesConfigured && trained.has(s.key),
    gold: stylesConfigured && spec.has(s.key),
    unset: !stylesConfigured,
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

  // Every weapon class shows; the class-build selection lights the ones it covers.
  const covered = coveredClasses(allWeapons, profTokens, api);
  let unarmedFocus = false;
  try {
    unarmedFocus = !!api.hasEffectFlag?.(actor, api.EFFECT_DOMAINS?.UNARMED ?? "unarmedFighting");
  } catch {
    /* no unarmed-fighting data */
  }
  // A bare `{all:true}` with no tokens and no flag is the permissive DEFAULT, not
  // a granted unrestricted selection — that reads as unset, not as everything.
  const weaponsConfigured = flagSet("weaponProficiency") || profTokens.size > 0;
  const weapons = WEAPON_CLASSES.map((c) => ({
    key: c.key,
    chip: c.chip,
    label: loc(c.label, c.fallback),
    on: weaponsConfigured && covered.has(c.key),
    gold: weaponsConfigured && (c.key === "unarmed" ? unarmedFocus : focusCats.has(c.key)),
    unset: !weaponsConfigured,
  }));

  // Same story: `heavy` is acks-equipment's permissive fallback, not a grant.
  const armourConfigured = flagSet("armorMax") || (() => {
    try {
      return (api.collectStringFlags?.(actor, api.EFFECT_DOMAINS?.ARMOR_PROF ?? "armorTraining") ?? []).length > 0;
    } catch {
      return false;
    }
  })();
  const maxRank = ARMOUR.findIndex((a) => a.key === norm(armourMax));
  const armour = ARMOUR.map((a, i) => ({
    key: a.key,
    icon: a.icon,
    label: loc(a.label, a.fallback),
    on: armourConfigured && maxRank >= 0 && i <= maxRank,
    gold: false,
    unset: !armourConfigured,
  }));
  // A SHIELD is its own armour category (RR pp. 128/140-141), not a rung on the
  // suit ladder — and RAW it only benefits a class with the Weapon & Shield
  // fighting style (JJ p. 291), so that style is what lights it.
  armour.push({
    key: "shield",
    icon: "fas fa-shield-halved",
    label: loc("ACKS-LIB.armour.shield", "Shield (+1 AC — needs the Weapon & Shield style)"),
    on: stylesConfigured && trained.has("weaponshield"),
    gold: stylesConfigured && spec.has("weaponshield"),
    unset: !stylesConfigured,
  });

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
