# Changelog

## 0.4.0

- **An ability can offer MANY rolls.** `rollField()` / `rollsField()` — each roll
  has its own label, formula, roll type, target and progression. A single
  roll/target cannot express Animal Husbandry, which diagnoses, cures, cures
  serious injury and extracts venom, three of those on their own ladder.
- **`rank` is a value scale.** Several RR proficiencies are rated by how many
  times they have been taken rather than by class level — 11+ at one rank, 7+ at
  two, 3+ at three — so a target ladder can key on rank and resolve against it.

## 0.3.0

- **Capabilities — the gate pattern.** An ability can now declare what it lets
  you *do*, named independently of the entry granting it (`kw:` tokens), and
  prerequisites can be written against the capability instead of one specific
  ability. This is what makes a gate survive the books printing the same
  capability several ways: "Searching" is a thief skill, a proficiency, and the
  thing several class powers hand out, and an alias prints it under another name
  again. A gate naming one id misses the rest; a capability gate catches them
  all. `satisfies()` / `satisfiesAll()` resolve them, and an ability always
  implicitly provides its own id's capability, so gates work before anything is
  tagged.
- **Non-stacking falls out of the same data.** Two abilities providing one
  capability are that capability twice; `nonStackingGroups()` reports them
  rather than requiring a per-pair assertion.

## 0.2.0

- **Renames are marked too.** `renamed` is no longer silent: every conversion
  status now carries an `icon` and a `severity`, and `tip` is a template —
  `conversionTip(status, name)` fills `{name}`, so a renamed entry reads
  "*Detect Traps* has been renamed for ACKS II."
- **Reroll primitive** — `{type:"reroll", keep, times}` with `resolveReroll()`
  and `rerollTotal()`. `times` counts the *extra* rolls (so "roll twice" needs
  no field set), and "better" follows the throw's own direction: the maximum on
  a roll-high throw, the minimum on a roll-low one.
- **Companion primitive** — `{type:"companion", ref, actorUuid, amount}`. `ref`
  points at the monster entry; `actorUuid` is a bucket that stays empty until
  the citing book is available or a GM drops an actor in, so a bookless seat
  still gets the slot.
- **Conditional values** — a LevelValue may key its breakpoint ladder on a
  `VALUE_SCALES` scale instead of class level; `resolveLevelValue` takes a third
  `scales` argument.
- Built ahead of the magic work and deliberately **not consumed yet**:
  `VALUE_SCALES.arcaneValue` / `.divineValue` (conditional power cost) and
  `spellRefField()` (a placeholder pointing at the core system's existing spell
  item). Both carry TODOs; see *Not yet consumed* in `docs/API.md`.

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
