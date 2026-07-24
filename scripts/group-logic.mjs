/* global Hooks */
/**
 * The Foundry-FREE half of the group lifecycle: the pure decisions, split out so
 * they import under Node and are unit-tested offline (the same split as
 * vocab.mjs vs the Foundry-only fields.mjs). group.mjs re-exports these and adds
 * the document-writing operations around them.
 *
 * Nothing here touches a Foundry global at module-eval time; `Hooks` is guarded
 * and `structuredClone` is a standard built-in in both Node and the browser.
 */

/**
 * The next never-used ordinal for a group. Ordinals are assigned once and never
 * reused, so "#7" always means the same body even after #3 dies — the report
 * stays legible.
 * @param {object} system - a GroupData (or its source), needs `.roster`
 */
export function nextOrdinal(system) {
  const roster = system?.roster ?? [];
  return roster.reduce((max, m) => Math.max(max, m.ordinal ?? 0), 0) + 1;
}

/**
 * A member's display name: its own name, else the prototype label + ordinal.
 * @param {object} system - a GroupData with `.prototype.label`
 * @param {object} member - a roster entry
 */
export function memberName(system, member) {
  if (member?.name) return member.name;
  const label = system?.prototype?.label || "Member";
  return `${label} #${member?.ordinal ?? "?"}`;
}

/**
 * An effect a deployed member picked up as DERIVED state — a module-managed
 * loadout effect, a re-appliable buff — must not be baked into the resting
 * record on recall, or it re-applies forever. The general marker: any effect
 * flagged `flags.<namespace>.managed = true`. Authored effects (a curse the
 * Judge put on this one kobold, with no managed marker) are kept.
 *
 * The specific markers each consuming module uses (e.g. acks-equipment's loadout
 * effect) are taught to this predicate through the `acksLibGroupIsDerivedEffect`
 * hook rather than the library hardcoding module ids.
 */
export function isDerivedEffect(effectData) {
  const flags = effectData?.flags ?? {};
  for (const ns of Object.values(flags)) {
    if (ns && typeof ns === "object" && ns.managed === true) return true;
  }
  let derived = false;
  if (typeof Hooks !== "undefined") {
    Hooks.callAll?.("acksLibGroupIsDerivedEffect", effectData, (v) => {
      derived = derived || !!v;
    });
  }
  return derived;
}

/** Strip derived effects out of an ActorDelta source object (returns a copy). */
export function cleanDelta(delta) {
  const copy = structuredClone(delta ?? {});
  if (Array.isArray(copy.effects)) {
    copy.effects = copy.effects.filter((e) => !isDerivedEffect(e));
    if (!copy.effects.length) delete copy.effects;
  }
  return copy;
}

/**
 * The ONE ecology reader, and the ONLY consumption of acks-monsters data:
 * a monster's number-appearing → a size formula, soft-read so acks-monsters
 * stays an optional dependency. Returns a dice string; nothing auto-rolls it
 * (the Judge decides when a group is sized), and a source with no ecology data
 * returns null so the Judge types the size. The richer seams — lair chance,
 * supply cost, battle rating — are documented in group-data.mjs and deliberately
 * unread for now.
 *
 * @param {object} source - a prototype actor (may carry acks-monsters extras)
 * @param {"wilderness"|"dungeon"} [context]
 * @returns {string|null} a dice formula, or null if unstated
 */
export function sizeFromEcology(source, context = "wilderness") {
  if (!source) return null;
  const extras = source.getFlag?.("acks-monsters", "extras");
  const side = extras?.encounter?.[context];
  const rich = side?.wandering?.number || side?.lair?.number;
  if (rich) return String(rich).trim();
  const core = source.system?.details?.appearing?.[context === "dungeon" ? "d" : "w"];
  return core ? String(core).trim() : null;
}
