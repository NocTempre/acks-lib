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
- **Relational primitives** — `requires` / `grants` / `modifies` with `ifHas`,
  `stacksWith` / `notStacksWith`, and an explicit `mode` (add | replace | set),
  so one ability can point at another instead of restating it. Adds the
  `drawback` category and `forWhat` (what a bonus applies *to*).
- **Conversion vocabulary** — `CONVERSION_STATUS` grades content carried in
  from earlier editions / generic OSR: `renamed` (silent), `deleted` (caution:
  not advised for a typical ACKS II campaign), `absent` (info: not designed for
  ACKS II, use with care). Consumers read the severity and tooltip from here
  rather than inventing their own wording.
- `library: true`, `socket: false`; exposes `globalThis.acksLib` +
  `game.modules.get("acks-lib").api` with a core-deferral shim. Contract in
  `docs/API.md`; Node logic tests in `tools/test-logic.mjs` (`npm test`).
