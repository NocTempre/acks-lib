/* global game, foundry, Actor, Roll, Hooks, CONST, fromUuid */
/**
 * Group operations — the lifecycle of a stacked actor (see data/group-data.mjs).
 *
 * The stack holds a SPARSE roster: a record per member that has diverged, and
 * nothing for pristine bodies. These functions move members through that
 * lifecycle while keeping the one invariant true at every step —
 * `size.current` (living bodies) is never less than the number of living
 * records.
 *
 * DEPLOY/RECALL is the compatibility strategy. Deploying spawns unlinked tokens
 * of the prototype with each member's ActorDelta pre-applied, so on the canvas a
 * member is an ordinary token over an ordinary actor and every system/module
 * that reads an actor reads it unchanged. Recalling folds `token.delta` back
 * into the member record and removes the token.
 *
 * These operations write world documents (tokens, actors) and so run on the
 * calling client under Foundry's own permission checks — a GM, or an owner with
 * token-create rights on the scene. They are defensive (try/caught, half-steps
 * persisted before destructive ones) but they do not route over a socket; a
 * consumer that needs GM-routed writes wraps them.
 */
import { MODULE_ID } from "./constants.mjs";
import GroupData, { GROUP_CATEGORY, GROUP_STATE } from "./data/group-data.mjs";
import { cleanDelta, isDerivedEffect, memberName, nextOrdinal, sizeFromEcology } from "./group-logic.mjs";

// Re-export the Foundry-free lifecycle logic so consumers reach it all through
// `acksLib.groups`, while the pure half stays independently Node-importable.
export { cleanDelta, isDerivedEffect, memberName, nextOrdinal, sizeFromEcology, GROUP_CATEGORY };

/** Token/flag keys linking a deployed token back to its group and member. */
export const GROUP_FLAG = "group"; // on the token: the group actor's uuid
export const MEMBER_FLAG = "member"; // on the token: the roster member's key

/** Hooks other modules key off. Namespaced per the family convention. */
export const GROUP_HOOKS = Object.freeze({
  DEPLOYED: "acksLibGroupDeployed",
  RECALLED: "acksLibGroupRecalled",
  CASUALTY: "acksLibGroupCasualty",
  DETACHED: "acksLibGroupDetached",
});

/** Is this actor one of our stacks? Read the registered type, not a guess. */
export const isGroup = (actor) => actor?.system instanceof GroupData || actor?.type === `${MODULE_ID}.group`;

/* -------------------------------------------- */
/*  Prototype                                    */
/* -------------------------------------------- */

/**
 * Point a group at the stat block its members copy. Snapshots the source so the
 * group survives the source's deletion, seeds the representative-individual
 * mirror (hp/aac/saves/thac0/movement/details) from it so the stack token shows
 * one body's bar, and seeds the collective noun + size when unset.
 *
 * @param {Actor} group
 * @param {Actor} source - a monster, character, or acks-lib.animal actor
 */
export async function setPrototype(group, source) {
  if (!isGroup(group) || !source) return false;
  const snap = source.toObject();
  const sys = source.system ?? {};

  // Every key is `system.`-prefixed: `actor.update` targets the Actor document,
  // so system data lives under `system.*` (a bare `size.current` sets nothing).
  // The field is `template`, not `prototype` — see group-data.mjs for why.
  const mirror = {
    "system.template.uuid": source.uuid ?? null,
    "system.template.type": source.type ?? "monster",
    "system.template.label": source.name ?? "",
    "system.template.snapshot": snap,
    "system.template.snapshotTime": Math.floor(game?.time?.worldTime ?? 0),
  };
  // Copy the mirror fields the source actually has (a character has hp/aac/saves
  // too, just under the same paths). Guarded reads: a source missing a field
  // leaves the group's default in place rather than writing undefined.
  if (sys.hp) mirror["system.hp"] = { hd: sys.hp.hd, value: sys.hp.value, max: sys.hp.max, bhr: sys.hp.bhr };
  if (sys.aac) mirror["system.aac"] = { value: sys.aac.value ?? 0, mod: sys.aac.mod ?? 0 };
  if (sys.saves) mirror["system.saves"] = foundry.utils.deepClone(sys.saves);
  if (sys.thac0?.throw != null) mirror["system.thac0.throw"] = sys.thac0.throw;
  if (sys.movement?.base != null) mirror["system.movement.base"] = sys.movement.base;
  if (sys.details?.alignment) mirror["system.details.alignment"] = sys.details.alignment;
  if (sys.details?.morale != null) mirror["system.details.morale"] = sys.details.morale;

  // Seed size from the template's number-appearing only if the group has none.
  if (!group.system.size?.current && !group.system.size?.formula) {
    const formula = sizeFromEcology(source) ?? "";
    if (formula) mirror["system.size.formula"] = formula;
  }
  await group.update(mirror);
  return true;
}

/**
 * Ensure the group has a WORLD actor to be the ActorDelta base. ActorDelta
 * merges onto a real world actor; a compendium uuid cannot be that base. If the
 * prototype points at a world actor already, that is used; otherwise one is
 * minted from the snapshot (hidden in a library folder) and remembered.
 *
 * @returns {Promise<Actor|null>}
 */
export async function ensureBaseActor(group) {
  const tmpl = group.system.template ?? {};
  if (tmpl.uuid) {
    const existing = await fromUuid(tmpl.uuid);
    // A world Actor is a valid base; a token/compendium doc is not.
    if (existing?.documentName === "Actor" && !existing.pack) return existing;
  }
  const snap = foundry.utils.deepClone(tmpl.snapshot ?? {});
  if (!snap.type) return null; // nothing to mint from
  delete snap._id;
  snap.name = tmpl.label || snap.name || "Group template";
  foundry.utils.setProperty(snap, "prototypeToken.actorLink", false);
  // Keep template actors out of the way and non-playable: owned by nobody, hidden.
  snap.ownership = { default: CONST.DOCUMENT_OWNERSHIP_LEVELS.NONE };
  foundry.utils.setProperty(snap, `flags.${MODULE_ID}.templateFor`, group.uuid);
  const base = await Actor.implementation.create(snap);
  if (base) await group.update({ "system.template.uuid": base.uuid });
  return base ?? null;
}

/* -------------------------------------------- */
/*  Roster mutation                              */
/* -------------------------------------------- */

/** Roll a body's hit points from a hit-dice formula, mirroring the system's own
 *  unlinked-monster HP roll. Falls back to the mirror's current max on error. */
async function rollBodyHp(group) {
  const hd = group.system.hp?.hd || "1d8";
  try {
    const roll = await new Roll(hd).evaluate();
    return roll.total;
  } catch {
    return group.system.hp?.max ?? 4;
  }
}

/**
 * Turn a pristine body into a roster record — the transition that first makes a
 * member individual. Rolls its HP (a body is only worth its own hit points once
 * it matters) and stores it in the member's delta. Does NOT change `size.current`
 * (the body already existed; it just gained a record).
 *
 * @returns {Promise<object|null>} the new member record, or null if none pristine
 */
export async function materializeMember(group, { name = "", extraDelta = {} } = {}) {
  if (!isGroup(group) || group.system.pristineCount <= 0) return null;
  const hp = await rollBodyHp(group);
  const member = {
    key: foundry.utils.randomID(),
    ordinal: nextOrdinal(group.system),
    name,
    delta: foundry.utils.mergeObject({ system: { hp: { value: hp, max: hp } } }, extraDelta, { inplace: false }),
    state: GROUP_STATE.materialized,
    tokenUuid: "",
    actorUuid: "",
    note: "",
  };
  await group.update({ "system.roster": [...group.system.toObject().roster, member] });
  return member;
}

/**
 * Record `n` casualties. Pristine bodies fall FIRST — they leave no record, so
 * the group simply shrinks — and only once the pristine are spent does a living
 * record become a `dead` one (kept for the report). `size.current` drops by the
 * number actually removed. This is the abstract-mode primitive; the sheet's
 * "record casualties" control and any future damage routing both call it.
 *
 * @returns {Promise<number>} casualties actually applied
 */
export async function applyCasualties(group, n) {
  if (!isGroup(group) || !(n > 0)) return 0;
  const sys = group.system;
  const remove = Math.min(n, sys.size.current ?? 0);
  if (remove <= 0) return 0;

  const roster = sys.toObject().roster;
  let left = remove;
  // Spend pristine first: they cost nothing to lose.
  const pristine = sys.pristineCount;
  const fromPristine = Math.min(left, pristine);
  left -= fromPristine;
  // Then the living records, oldest ordinal first (front rank falls first).
  if (left > 0) {
    const living = roster
      .filter((m) => m.state === GROUP_STATE.materialized || m.state === GROUP_STATE.deployed)
      .sort((a, b) => (a.ordinal ?? 0) - (b.ordinal ?? 0));
    for (const m of living.slice(0, left)) {
      m.state = GROUP_STATE.dead;
      m.note = m.note || game?.i18n?.localize?.("ACKS-LIB.group.fellInBattle") || "fell in battle";
    }
  }
  await group.update({ "system.size.current": (sys.size.current ?? 0) - remove, "system.roster": roster });
  Hooks.callAll(GROUP_HOOKS.CASUALTY, group, remove);
  return remove;
}

/* -------------------------------------------- */
/*  Deploy / recall                              */
/* -------------------------------------------- */

/**
 * Put `count` members onto a scene as unlinked tokens, each carrying its member
 * delta. Pristine bodies materialize on the way out (they need a record to hold
 * their token link and rolled HP). Members already deployed are skipped.
 *
 * @param {Actor} group
 * @param {Scene} scene
 * @param {object} [opts] - { count, x, y }
 * @returns {Promise<TokenDocument[]>}
 */
export async function deploy(group, scene, { count = 1, x = 0, y = 0 } = {}) {
  if (!isGroup(group) || !scene) return [];
  const base = await ensureBaseActor(group);
  if (!base) return [];

  const created = [];
  const gridStep = scene.grid?.size ?? 100;
  for (let i = 0; i < count; i++) {
    // Prefer an already-materialized-but-resting member; else make a pristine
    // body into one. Nothing left → stop.
    let member =
      group.system.roster.find((m) => m.state === GROUP_STATE.materialized) ??
      (await materializeMember(group));
    if (!member) break;

    const tokenData = (await base.getTokenDocument({ x: x + (i % 5) * gridStep, y: y + Math.floor(i / 5) * gridStep })).toObject();
    delete tokenData._id;
    tokenData.actorLink = false;
    tokenData.delta = foundry.utils.deepClone(member.delta ?? {});
    tokenData.name = memberName(group.system, member);
    foundry.utils.setProperty(tokenData, `flags.${MODULE_ID}.${GROUP_FLAG}`, group.uuid);
    foundry.utils.setProperty(tokenData, `flags.${MODULE_ID}.${MEMBER_FLAG}`, member.key);

    // Persist the state flip BEFORE the token exists is wrong (we need its id);
    // create the token, then record it. A crash between leaves an orphan token
    // that recall's reconciliation (by flag) still finds.
    const [tokenDoc] = await scene.createEmbeddedDocuments("Token", [tokenData]);
    if (!tokenDoc) continue;
    await patchMember(group, member.key, (m) => {
      m.state = GROUP_STATE.deployed;
      m.tokenUuid = tokenDoc.uuid;
    });
    created.push(tokenDoc);
  }
  if (created.length) Hooks.callAll(GROUP_HOOKS.DEPLOYED, group, created);
  return created;
}

/**
 * Fold every deployed member back into the stack: read the token's delta (minus
 * derived effects), store it on the member, drop the member to a casualty if it
 * came back at ≤0 HP, and delete the token. Reconciles by the group flag so a
 * token orphaned by a crash is still collected.
 *
 * @returns {Promise<{recalled:number, casualties:number}>}
 */
export async function recall(group, { scene = null } = {}) {
  if (!isGroup(group)) return { recalled: 0, casualties: 0 };
  const scenes = scene ? [scene] : [...(game.scenes ?? [])];
  let recalled = 0;
  let casualties = 0;

  for (const sc of scenes) {
    const tokens = sc.tokens.filter((t) => t.getFlag(MODULE_ID, GROUP_FLAG) === group.uuid);
    for (const token of tokens) {
      const key = token.getFlag(MODULE_ID, MEMBER_FLAG);
      const delta = cleanDelta(token.delta?.toObject?.() ?? {});
      const hp = token.actor?.system?.hp?.value;
      const fell = typeof hp === "number" && hp <= 0;

      await patchMember(group, key, (m) => {
        m.delta = delta;
        m.tokenUuid = "";
        if (fell) {
          m.state = GROUP_STATE.dead;
          m.note = m.note || game?.i18n?.localize?.("ACKS-LIB.group.fellInBattle") || "fell in battle";
        } else {
          m.state = GROUP_STATE.materialized;
        }
      });
      await sc.deleteEmbeddedDocuments("Token", [token.id]);
      recalled++;
      if (fell) casualties++;
    }
  }
  // A member marked dead on recall is no longer a living body.
  if (casualties) await group.update({ "system.size.current": Math.max(0, (group.system.size.current ?? 0) - casualties) });
  Hooks.callAll(GROUP_HOOKS.RECALLED, group, { recalled, casualties });
  return { recalled, casualties };
}

/* -------------------------------------------- */
/*  Detach / absorb                              */
/* -------------------------------------------- */

/**
 * Promote a member to a standalone actor (snapshot ⊕ delta): the mercenary who
 * becomes a henchman, the kobold who becomes a named villain. The body leaves
 * the group — `size.current` drops by one and the record is kept as `detached`
 * for provenance, pointing at the new actor.
 *
 * @returns {Promise<Actor|null>}
 */
export async function detach(group, memberKey, { folder = null } = {}) {
  const member = group.system.roster.find((m) => m.key === memberKey);
  if (!member || member.state === GROUP_STATE.detached) return null;

  const snap = foundry.utils.deepClone(group.system.template?.snapshot ?? {});
  if (!snap.type) return null;
  delete snap._id;
  // The member delta overlays the snapshot. `system`/items/name from the delta win.
  const data = foundry.utils.mergeObject(snap, cleanDelta(member.delta), { inplace: false });
  data.name = member.name || memberName(group.system, member);
  data.folder = folder ?? null;
  foundry.utils.setProperty(data, "prototypeToken.actorLink", true);

  const actor = await Actor.implementation.create(data);
  if (!actor) return null;
  await patchMember(group, memberKey, (m) => {
    m.state = GROUP_STATE.detached;
    m.actorUuid = actor.uuid;
    m.tokenUuid = "";
  });
  await group.update({ "system.size.current": Math.max(0, (group.system.size.current ?? 0) - 1) });
  Hooks.callAll(GROUP_HOOKS.DETACHED, group, actor, member);
  return actor;
}

/* -------------------------------------------- */
/*  Storage helper                               */
/* -------------------------------------------- */

/**
 * Read-modify-write ONE roster member by key, re-reading fresh so concurrent
 * deploys of different members do not clobber each other's writes (the same
 * hazard acks-formation's patchFormation guards). `mutate` edits the member in
 * place; a missing key is a no-op.
 */
export async function patchMember(group, key, mutate) {
  const roster = group.system.toObject().roster;
  const member = roster.find((m) => m.key === key);
  if (!member) return false;
  mutate(member);
  await group.update({ "system.roster": roster });
  return true;
}

// sizeFromEcology lives in group-logic.mjs (Foundry-free) and is re-exported at
// the top of this file — the ecology runway is pure enough to unit-test offline.
