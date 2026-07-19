/**
 * acks-lib — shared primitives for the ACKS II module family.
 *
 * Scope: the effect/vocabulary primitives the abilities work needs, plus —
 * pulled forward by the table extraction program (template
 * docs/CONTENT-EXTRACTION.md) — the layered tables registry, the named-
 * contract service registry, and the ruledata loader. Remaining FAMILY.md §3
 * plumbing (socket relay, sheet helpers) stays the family-refactor Phase 1
 * backlog; §3c's economy.json is SUPERSEDED (no book values ship in the lib).
 */
import { MODULE_ID } from "./constants.mjs";
import * as vocab from "./vocab.mjs";
import * as fields from "./fields.mjs";
import * as tables from "./tables.mjs";
import * as services from "./services.mjs";
import { loadRuledata } from "./ruledata.mjs";
import { resolveLevelValue } from "./vocab.mjs";

/** The library's own implementation of its API surface. */
const localImpl = Object.freeze({
  apiVersion: 3,
  vocab,
  fields,
  resolveLevelValue,
  tables,
  services,
  loadRuledata,
});

// Core-deferral shim (FAMILY.md §3d): if/when a surface is upstreamed into the
// system, `game.acks.lib` provides it and consumers transparently defer. At
// module-evaluation time `game` is undefined, so this resolves to localImpl.
globalThis.acksLib = globalThis.game?.acks?.lib ?? localImpl;

Hooks.once("init", () => {
  const api = globalThis.game?.acks?.lib ?? localImpl;
  globalThis.acksLib = api;
  const mod = game.modules.get(MODULE_ID);
  if (mod) mod.api = api;
  console.log(`${MODULE_ID} | primitives ready (apiVersion ${api.apiVersion})`);
});
