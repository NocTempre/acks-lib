# Library — Design Model

acks-lib is the family's shared-primitives library (`library: true`). It ships
**no sheets and no world data** — it exposes vocabulary + DataModel field-
builders that consumer modules assemble into their own models.

- **Reuse**: the `acks` system's damage/save vocabulary and (via the core-
  deferral shim `game.acks?.lib`) any surface later upstreamed into core.
- **Extend**: the shared ACKS effect/ability vocabulary (`scripts/vocab.mjs`)
  and its DataModel field-builders (`scripts/fields.mjs`) — the target both
  acks-abilities and (deferred) acks-monsters build their models from.
- **Enhance**: nothing yet — the FAMILY.md §3 plumbing (tables registry, socket
  relay, effects collector, economy data) is deliberately **out of v0.1 scope**
  and remains the family-refactor Phase 1 backlog.
- **Invent**: `LevelValue` — the level-scaling value type + its resolver — the
  one genuinely new primitive, spanning thief skills, per-level throws, and
  attack/save progressions.

## Decisions

- **2026-07-18 — v0.1 scope is effect/ability primitives only.** Created ahead
  of the full family-refactor Phase 1 to unblock the abilities program (see the
  program memory + template REFACTOR_PLAN.md status note). The plumbing/interop
  contracts stay pending; this lib is additive to that plan, not a divergence.
- **Vocab enums mirror acks-monsters value-identically** (DAMAGE/MOVEMENT/
  VISION/SENSE/NATURAL_WEAPONS). acks-monsters keeps its own copy for now
  (published; migration deferred) — a documented sanctioned mirror, reconciled
  when it adopts the lib. `tools/test-logic.mjs` guards the DAMAGE_TYPES set.
- **Foundry-free split:** `vocab.mjs` (enums + resolver) imports in Node so the
  acks-content cookbook compiler/executor share one definition; `fields.mjs`
  (Foundry field-builders) is lazy so the module still evaluates under Node.
