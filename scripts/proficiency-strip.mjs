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
 * Weapon SELECTION ladder — the class-build choice (JJ p. 290), not a list of
 * weapon groups: a class picks restricted / narrow / broad / unrestricted, and
 * everything at or below that breadth is available.
 */
const WEAPON_BREADTH = [
  { key: "restricted", icon: "fas fa-lock", label: "ACKS-LIB.breadth.restricted", fallback: "Restricted" },
  { key: "narrow", icon: "fas fa-angle-right", label: "ACKS-LIB.breadth.narrow", fallback: "Narrow" },
  { key: "broad", icon: "fas fa-angles-right", label: "ACKS-LIB.breadth.broad", fallback: "Broad" },
  { key: "unrestricted", icon: "fas fa-infinity", label: "ACKS-LIB.breadth.unrestricted", fallback: "Unrestricted" },
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
 * Breadth of a weapon-proficiency token set, read through acks-equipment's own
 * documented grammar (proficiency.mjs): `all` is unrestricted; `missile:all` and
 * `melee:<size>` are the broad choices; a category token is narrow; bare weapon
 * keys are the restricted list.
 */
const CATEGORY_TOKENS = new Set(["axe", "bow", "crossbow", "flailhammermace", "sworddagger", "spearpolearm", "other"]);
function breadthOf(all, tokens) {
  if (all) return "unrestricted";
  const raw = [...tokens];
  if (!raw.length) return null;
  if (raw.some((t) => t.startsWith("missileall") || t.startsWith("melee"))) return "broad";
  if (raw.some((t) => CATEGORY_TOKENS.has(t))) return "narrow";
  return "restricted";
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

  // The class's weapon SELECTION: light the ladder up to its breadth. A focused
  // group (Weapon Focus, RR p.121) golds the top lit rung.
  const breadth = breadthOf(allWeapons, profTokens);
  const breadthRank = WEAPON_BREADTH.findIndex((b) => b.key === breadth);
  const weapons = WEAPON_BREADTH.map((b, i) => ({
    key: b.key,
    icon: b.icon,
    label: loc(b.label, b.fallback),
    on: breadthRank >= 0 && i <= breadthRank,
    gold: focusCats.size > 0 && i === breadthRank,
  }));

  const maxRank = ARMOUR.findIndex((a) => a.key === norm(armourMax));
  const armour = ARMOUR.map((a, i) => ({
    key: a.key,
    icon: a.icon,
    label: loc(a.label, a.fallback),
    on: maxRank >= 0 && i <= maxRank,
    gold: false,
  }));
  // A SHIELD is its own armour category (RR pp. 128/140-141), not a rung on the
  // suit ladder — and RAW it only benefits a class with the Weapon & Shield
  // fighting style (JJ p. 291), so that style is what lights it.
  armour.push({
    key: "shield",
    icon: "fas fa-shield-halved",
    label: loc("ACKS-LIB.armour.shield", "Shield (+1 AC — needs the Weapon & Shield style)"),
    on: trained.has("weaponshield"),
    gold: spec.has("weaponshield"),
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
