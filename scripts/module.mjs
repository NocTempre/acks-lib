/**
 * acks-lib — shared primitives for the ACKS II module family.
 *
 * v0.1 scope: the effect/vocabulary primitives the abilities work needs
 * (see docs/API.md). Plumbing/interop contracts from FAMILY.md §3 (tables
 * registry, socket relay, economy data) are NOT part of this build — they
 * remain the family-refactor Phase 1 backlog.
 */
import { MODULE_ID } from "./constants.mjs";
import * as vocab from "./vocab.mjs";
import * as fields from "./fields.mjs";
import { resolveLevelValue } from "./vocab.mjs";

/** The library's own implementation of its API surface. */
const localImpl = Object.freeze({
  apiVersion: 1,
  vocab,
  fields,
  resolveLevelValue,
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
