/* global game, CONFIG, Hooks, Actor, foundry */
/**
 * acks-lib — shared primitives for the ACKS II module family, and the family's
 * PATCH LAYER on the acks system.
 *
 * The system is an unmodifiable reference (every module's CLAUDE.md). Anything
 * the family needs that the system does not provide — a new actor sub-type, a
 * compatibility stub the system's own code demands, a baseline the system spells
 * out per type instead of sharing — lands here, once, rather than in each module
 * that happens to need it first. A module patches core directly only for
 * behaviour unique to its own domain.
 *
 * Scope now:
 *   - the effect/ability vocabulary and field-builders (abilities program)
 *   - the scoping primitives the social rolls need
 *   - the layered tables registry, service registry, ruledata loader
 *   - **actor compatibility stubs** — one definition of the fields the system
 *     touches on every actor, replacing four drifting copies across the family
 *   - **the `acks-lib.animal` actor sub-type** — an animal is a monster you can
 *     also buy, load and ride, so its combat block uses the monster's own field
 *     paths and everything that reads a monster reads it unchanged
 *   - **mount binding** — the "who is riding what" fact acks-equipment's
 *     mounted-combat overlay has been blocked on
 *   - **the shared item baseline** — one answer to "is this physical / can it
 *     be equipped / what does it weigh", which the system spells out per type
 */
import { MODULE_ID } from "./constants.mjs";
import * as vocab from "./vocab.mjs";
import * as fields from "./fields.mjs";
import * as tables from "./tables.mjs";
import * as services from "./services.mjs";
import * as itemModel from "./item-model.mjs";
import * as mount from "./mount.mjs";
import * as actorRead from "./actor-read.mjs";
import { loadRuledata } from "./ruledata.mjs";
import { resolveLevelValue } from "./vocab.mjs";
import { acksCompatStubs, savingThrowFields } from "./actor-compat.mjs";
import AnimalData from "./data/animal-data.mjs";
import GroupData from "./data/group-data.mjs";
import TemplateData from "./data/template-data.mjs";
import * as groups from "./group.mjs";
import * as templateLogic from "./template-logic.mjs";
import { GroupSheet } from "./apps/group-sheet.mjs";
import { TemplateSheet } from "./apps/template-sheet.mjs";
import { registerMountCleanup } from "./mount.mjs";

/** The actor sub-types this library adds to the system. */
export const ANIMAL_TYPE = `${MODULE_ID}.animal`;
export const GROUP_TYPE = `${MODULE_ID}.group`;
export const TEMPLATE_TYPE = `${MODULE_ID}.template`;

/** The library's own implementation of its API surface. */
const localImpl = Object.freeze({
  apiVersion: 9,
  vocab,
  fields,
  resolveLevelValue,
  tables,
  services,
  loadRuledata,
  // --- patch layer ---
  acksCompatStubs,
  savingThrowFields,
  AnimalData,
  ANIMAL_TYPE,
  /** The `acks-lib.group` stackable actor: model + lifecycle ops. */
  GroupData,
  GROUP_TYPE,
  groups,
  /** The `acks-lib.template` generator actor: model + pure roll/resolve. */
  TemplateData,
  TEMPLATE_TYPE,
  templateLogic,
  /** Mount binding: mountOf / riderOf / isMounted / mountActor / dismount / unseat. */
  mount,
  /** Shared item baseline: isPhysical / isEquippable / weight6Of / … */
  itemModel,
  /** System actor reads: abilityMod / classLevel / monsterHd / hitDiceOrLevel. */
  actorRead,
});

// Core-deferral shim (FAMILY.md §3d): if/when a surface is upstreamed into the
// system, `game.acks.lib` provides it and consumers transparently defer. At
// module-evaluation time `game` is undefined, so this resolves to localImpl.
//
// MERGED, not replaced: the system may upstream ONE surface (it currently has
// none) long before it has all of them, and swapping wholesale would take the
// rest of this library away with it. Core's version of a name wins; everything
// core does not define stays local.
function resolveApi() {
  const fromCore = globalThis.game?.acks?.lib;
  return fromCore ? Object.freeze({ ...localImpl, ...fromCore }) : localImpl;
}

globalThis.acksLib = resolveApi();

Hooks.once("init", () => {
  const api = resolveApi();
  globalThis.acksLib = api;
  const mod = game.modules.get(MODULE_ID);
  if (mod) mod.api = api;

  registerMountCleanup();

  console.log(`${MODULE_ID} | primitives ready (apiVersion ${api.apiVersion}).`);
});

/**
 * Register the animal data model in `setup`, NOT `init`.
 *
 * The system is not modified: this ADDS a type alongside its own, declared in
 * module.json `documentTypes` and given its model here.
 *
 * WHY setup and not init: acks-lib is `library: true`, so Foundry loads it
 * before dependent modules and runs its `init` hook FIRST — before Foundry
 * finalizes `CONFIG.Actor.dataModels` from the manifests' `documentTypes`. An
 * assignment made in acks-lib's init is therefore overwritten by that
 * finalization (verified live: the init assignment logged success but the entry
 * was gone by `ready`, and the actor's system data fell back to a plain
 * Object). A non-library module's init runs after the finalization, which is
 * why the sibling sub-types survive. `setup` runs strictly after init for every
 * module, so the assignment lands after the overwrite and before any actor of
 * this type is constructed (world actors load at ready; imports are later
 * still).
 */
Hooks.once("setup", () => {
  CONFIG.Actor.dataModels[ANIMAL_TYPE] = AnimalData;
  CONFIG.Actor.dataModels[GROUP_TYPE] = GroupData;
  CONFIG.Actor.dataModels[TEMPLATE_TYPE] = TemplateData;
  console.log(`${MODULE_ID} | ${ANIMAL_TYPE}, ${GROUP_TYPE}, ${TEMPLATE_TYPE} data models registered.`);
});

/**
 * Give animals the SYSTEM'S OWN monster sheet.
 *
 * This library ships no sheet, and should not: an animal is a monster you can
 * also buy, its schema mirrors the monster's field paths for exactly that
 * reason, and a second sheet rendering the same fields would be a second thing
 * to keep in step. So the system's monster sheet is registered for the animal
 * type as well.
 *
 * At READY, not init: Foundry defers every registerSheet call made before
 * `game.ready` into a pending queue, so `CONFIG.Actor.sheetClasses` is empty
 * during init and the system's sheet cannot be resolved yet. Same reason
 * acks-abilities resolves its base class here.
 *
 * If it cannot be found, the animal type simply has no sheet rather than the
 * world failing to load — and the console says which.
 */
Hooks.once("ready", () => {
  if (game.system?.id !== "acks") return;
  const registered = CONFIG.Actor?.sheetClasses?.monster ?? {};
  const entries = Object.values(registered);
  const MonsterSheet = entries.find((e) => e.default)?.cls ?? entries[0]?.cls ?? null;
  if (!MonsterSheet) {
    console.warn(`${MODULE_ID} | could not resolve the acks monster sheet; ${ANIMAL_TYPE} has no sheet.`);
    return;
  }
  foundry.applications.apps.DocumentSheetConfig.registerSheet(Actor, MODULE_ID, MonsterSheet, {
    types: [ANIMAL_TYPE],
    makeDefault: true,
    label: "ACKS-LIB.sheet.animal",
  });
  console.log(`${MODULE_ID} | ${ANIMAL_TYPE} uses the system's monster sheet.`);

  // The group ships its OWN sheet: a stack is a headcount and a roster, not a
  // stat block, so unlike the animal it does not borrow the monster sheet.
  foundry.applications.apps.DocumentSheetConfig.registerSheet(Actor, MODULE_ID, GroupSheet, {
    types: [GROUP_TYPE],
    makeDefault: true,
    label: "ACKS-LIB.sheet.group",
  });
  console.log(`${MODULE_ID} | ${GROUP_TYPE} sheet registered.`);

  // The template is a BUILDER, not a stat block: axis pins, an optional base
  // actor, and Generate (see apps/template-sheet.mjs).
  foundry.applications.apps.DocumentSheetConfig.registerSheet(Actor, MODULE_ID, TemplateSheet, {
    types: [TEMPLATE_TYPE],
    makeDefault: true,
    label: "ACKS-LIB.sheet.template",
  });
  console.log(`${MODULE_ID} | ${TEMPLATE_TYPE} sheet registered.`);
});
