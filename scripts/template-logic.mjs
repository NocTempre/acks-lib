/**
 * The Foundry-FREE half of the `acks-lib.template` generator: choice rolling
 * and patch resolution, split out so they import under Node and are unit-tested
 * offline (the same split as group-logic.mjs vs group.mjs).
 *
 * A template is the book's own shape for creatures it refuses to stat once:
 * the MM's dragon/cacodemon/elemental "characteristics by rank/age/tier"
 * pages, and modifier creatures like the vampire thrall that rewrite a victim.
 * The actor's system data holds AXES (rank, age, element, HD…), each option
 * carrying engine-ready PATCHES that were materialized from the reader's own
 * book at import time. This module never interprets book content — it only
 * selects options and merges what the importer already built:
 *
 *   choices  = chooseAxes(system, { pinned, baseValues, rng })
 *   resolved = resolveActor(system, choices.choices, { baseName })
 *
 * Per-axis precedence: PINNED (the Judge picked it) > DERIVED (read off a
 * dropped base actor, e.g. a thrall keeps its victim's HD) > ROLLED (the
 * book's own die over the printed bands, else uniform). Quick use pins
 * nothing and gets a rules-legal random creature.
 */

/** Mulberry32 — a tiny seedable PRNG so tests are deterministic. */
export function seededRng(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Roll a "NdM" die string. Unparseable → null (caller falls back to uniform). */
export function rollDie(die, rng = Math.random) {
  const m = /^(\d*)d(\d+)$/i.exec(String(die ?? "").trim());
  if (!m) return null;
  const count = Math.max(1, parseInt(m[1] || "1", 10));
  const faces = parseInt(m[2], 10);
  if (!faces) return null;
  let sum = 0;
  for (let i = 0; i < count; i++) sum += 1 + Math.floor(rng() * faces);
  return sum;
}

/** The faces of a "NdM" string ("1d100" → 100); null when unparseable. */
const facesOf = (die) => {
  const m = /^(\d*)d(\d+)$/i.exec(String(die ?? "").trim());
  return m ? parseInt(m[2], 10) : null;
};

/** Does a printed band {rollMin, rollMax} contain v? Open ends are open. */
const inBand = (opt, v, faces) => {
  const min = opt.rollMin ?? 1;
  const max = opt.rollMax ?? faces ?? Infinity;
  return v >= min && v <= max;
};

/**
 * Pick one option of one axis by the book's own procedure: the axis die over
 * the options' printed bands when both exist, else uniform. Returns
 * `{option, roll}` (roll null for uniform picks). Empty axes return null.
 */
export function rollOption(axis, rng = Math.random) {
  const options = axis?.options ?? [];
  if (!options.length) return null;
  const banded = options.some((o) => o.rollMin != null || o.rollMax != null);
  if (axis.roll && banded) {
    const v = rollDie(axis.roll, rng);
    if (v != null) {
      const hit = options.find((o) => inBand(o, v, facesOf(axis.roll)));
      if (hit) return { option: hit, roll: v };
      // A rolled value outside every band (misauthored gap): fall through.
    }
  }
  return { option: options[Math.floor(rng() * options.length)], roll: null };
}

/**
 * Derive an axis choice from a dropped base actor's values. The axis says
 * which base value it reads (`derive.from`, e.g. "hd") and its cap; options
 * with numeric keys are matched to the clamped value, taking the closest
 * option that does not exceed it ("8 HD or less" rows).
 */
export function deriveOption(axis, baseValues) {
  const from = axis?.derive?.from;
  if (!from) return null;
  const raw = baseValues?.[from];
  if (raw == null || Number.isNaN(Number(raw))) return null;
  const max = axis.derive.max ?? Infinity;
  const value = Math.min(Number(raw), max);
  const numeric = (axis.options ?? [])
    .map((o) => ({ o, n: Number(o.key) }))
    .filter((x) => !Number.isNaN(x.n))
    .sort((a, b) => a.n - b.n);
  if (!numeric.length) return null;
  let best = numeric[0].o;
  for (const { o, n } of numeric) if (n <= value) best = o;
  return best;
}

/**
 * Choose every axis: pinned > derived > rolled. Returns
 * `{choices: {axisKey: optionKey}, log: [{axis, option, source, roll?}]}`.
 * Unknown pinned keys fall through to derive/roll rather than erroring — a
 * stale pin must never brick generation.
 */
export function chooseAxes(system, { pinned = {}, baseValues = {}, rng = Math.random } = {}) {
  const choices = {};
  const log = [];
  for (const axis of system?.axes ?? []) {
    const options = axis.options ?? [];
    if (!options.length) continue;
    let option = null;
    let source = null;
    let roll = null;
    if (pinned[axis.key] != null) {
      option = options.find((o) => o.key === pinned[axis.key]) ?? null;
      if (option) source = "pinned";
    }
    if (!option) {
      option = deriveOption(axis, baseValues);
      if (option) source = "derived";
    }
    if (!option) {
      const r = rollOption(axis, rng);
      option = r?.option ?? null;
      roll = r?.roll ?? null;
      if (option) source = roll != null ? "rolled" : "uniform";
    }
    if (!option) continue;
    choices[axis.key] = option.key;
    log.push({ axis: axis.key, option: option.key, source, ...(roll != null ? { roll } : {}) });
  }
  return { choices, log };
}

/**
 * Roll the special-ability MENU (cacodemon/dragon pages): d100 over printed
 * bands when the menu ships a die, else uniform, spending `budget` slots
 * against each row's slot cost (default 1; the dragon prints fractions).
 * Distinct rows only. Returns `{picks, rolls}`.
 */
export function rollMenu(menu, budget, rng = Math.random) {
  const rows = menu?.rows ?? [];
  const picks = [];
  const rolls = [];
  if (!rows.length || !(budget > 0)) return { picks, rolls };
  const costOf = (r) => (r.cost == null || r.cost === 0 ? 1 : r.cost);
  let spent = 0;
  const faces = facesOf(menu.die);
  const banded = menu.die && rows.some((r) => r.min != null || r.max != null);
  for (let attempts = 0; attempts < 60 && spent < budget; attempts++) {
    let row = null;
    if (banded) {
      const v = rollDie(menu.die, rng);
      rolls.push(v);
      row = rows.find((r) => v >= (r.min ?? 1) && v <= (r.max ?? faces ?? Infinity)) ?? null;
    } else {
      const unpicked = rows.filter((r) => !picks.includes(r));
      if (!unpicked.length) break;
      row = unpicked[Math.floor(rng() * unpicked.length)];
    }
    if (!row || picks.includes(row)) continue; // re-roll duplicates, per the book
    if (spent + costOf(row) > budget) continue;
    picks.push(row);
    spent += costOf(row);
    // Nothing affordable remains → stop instead of burning attempts.
    if (!rows.some((r) => !picks.includes(r) && spent + costOf(r) <= budget)) break;
  }
  return { picks, rolls };
}

/** Set a dotted path on a plain object, creating intermediates. */
const setPath = (obj, path, value) => {
  const parts = path.split(".");
  let cur = obj;
  for (const p of parts.slice(0, -1)) {
    if (typeof cur[p] !== "object" || cur[p] === null || Array.isArray(cur[p])) cur[p] = {};
    cur = cur[p];
  }
  cur[parts[parts.length - 1]] = value;
};

const isPlain = (v) => v !== null && typeof v === "object" && !Array.isArray(v);

/**
 * Merge one importer-built patch into an accumulating system object. Dotted
 * keys ("details.morale") expand; plain objects merge recursively; scalars and
 * arrays REPLACE (later axes are more specific). Pure — no foundry.utils.
 */
export function mergePatch(target, patch) {
  for (const [k, v] of Object.entries(patch ?? {})) {
    if (k.includes(".")) {
      setPath(target, k, structuredClone(v));
    } else if (isPlain(v) && isPlain(target[k])) {
      mergePatch(target[k], v);
    } else {
      target[k] = structuredClone(v);
    }
  }
  return target;
}

/**
 * Resolve chosen options into one engine-ready actor payload:
 * `{name, system, items, htmlParts, art}`. Axis merges apply in axis order,
 * then the N-dimensional `cells` (keyed by their axes' chosen option keys
 * joined with "|"), so a 2-axis cell always outranks the 1-axis rows it
 * refines — the dragon's per-age-per-form damage over the age row's baseline.
 */
export function resolveActor(system, choices, { baseName = "", templateName = "" } = {}) {
  const merged = {};
  const items = [];
  const htmlParts = [];
  let art = "";
  const chosen = [];
  for (const axis of system?.axes ?? []) {
    const option = (axis.options ?? []).find((o) => o.key === choices?.[axis.key]);
    if (!option) continue;
    chosen.push({ axis, option });
    mergePatch(merged, option.merge);
    for (const item of option.items ?? []) items.push(structuredClone(item));
    if (option.html) htmlParts.push(option.html);
    if (option.art) art = option.art;
  }
  for (const cell of system?.cells ?? []) {
    const key = (cell.by ?? []).map((axisKey) => choices?.[axisKey] ?? "").join("|");
    if (key && key === cell.key) {
      mergePatch(merged, cell.merge);
      for (const item of cell.items ?? []) items.push(structuredClone(item));
    }
  }
  let name = system?.output?.nameFormat || "";
  if (name) {
    name = name.replace(/\{(\w+)\}/g, (_, key) => {
      if (key === "base") return baseName || templateName;
      const c = chosen.find((x) => x.axis.key === key);
      return c ? c.option.nameLabel || c.option.label || c.option.key : "";
    });
    name = name.replace(/\s+/g, " ").trim();
  }
  if (!name) {
    const bits = chosen.map((c) => c.option.nameLabel || c.option.label || c.option.key).filter(Boolean);
    name = bits.length ? `${templateName} (${bits.join(", ")})` : templateName;
  }
  return { name, system: merged, items, htmlParts, art };
}
