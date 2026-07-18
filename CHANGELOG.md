# Changelog

## 0.1.0

- Initial scaffold from acks-module-template.
- **Shared effect/ability primitives** — `scripts/vocab.mjs` (Foundry-free
  enums: damage/movement/vision/sense/natural-weapon mirrors of acks-monsters,
  plus the new ability-effect vocabulary — effect types, modifier targets,
  effect/condition keywords, progressions, spell-like frequencies, resources,
  roll types — and the `LevelValue` resolver) and `scripts/fields.mjs`
  (DataModel field-builders: `levelValueField`, `defensesField`, `speedsField`,
  `sensesField`, `visionField`, `effectField`/`effectsField`).
- Weapon/armor/fighting-style proficiency support (categories +
  `proficiencyGrant` effect over `PROFICIENCY_DOMAINS`) and a cross-cutting
  `limitation` effect (restriction/drawback attachable to any ability).
- `library: true`, `socket: false`; exposes `globalThis.acksLib` +
  `game.modules.get("acks-lib").api` with a core-deferral shim. Contract in
  `docs/API.md`; Node logic tests in `tools/test-logic.mjs` (`npm test`).
