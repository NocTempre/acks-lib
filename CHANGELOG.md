# Changelog

## 0.10.1

**Animal saves match the RELEASED system, not its dev branch.** `savingThrowFields()`
built the animal sub-type's saves as {paralysis, death, blast, implements, spell},
copied from foundryvtt-acks-core's unreleased master. But the running system
(acks 14.0.1) stores saves as {paralysis, death, breath, implements, spell, wand}
— verified live against a fresh monster. So an animal reusing the monster sheet
had a blank Blast box (the sheet reads `saves.breath`; the animal had `blast`)
and a missing Wand save. Now mirrors the released schema exactly (breath + wand);
flip to blast when the system RELEASES that rename. Caught by live-testing the
consolidation — the offline mocks and the dev source both said blast.

## 0.8.2

- Add the `url` field to the manifest (GitHub repo link), matching the rest of
  the family.

## 0.8.1

- Fix mojibake in the module title: `module.json` `title` was double-encoded
  (a UTF-8 em dash read as Windows-1252 and re-saved), showing as
  `ACKS II â€" Library` on the Foundry module chip. Restored the proper em
  dash so it matches `ACKS-LIB.Title` in `lang/en.json`.

## 0.7.0

- **Layered tables registry** (`scripts/tables.mjs`, Foundry-free) — the
  FAMILY.md §3a registry pulled forward for the table extraction program
  (template docs/CONTENT-EXTRACTION.md): documents register per priority
  layer (sample 0 < catalog 10 < world 20), reads resolve the highest,
  same-layer re-registration replaces, unregistering falls back. Henchmen's
  `getDoc/getTable/getThrowDef/bracketRow` contract kept verbatim (plus an
  `initTables` drop-in alias) so consumer adoption is a shim. `docInfo()` /
  `hasDoc()` feed missing-tables UX — with NO samples shipping anywhere
  (ruling 1), "absent" is a state every consumer must render.
- **Service-contract registry** (`scripts/services.mjs`) — providers
  register named contracts at `init`; consumers `get()` them from hooks
  onward; absent contract is `null`, never a throw. First contract defined:
  **`ruledata-import` v1** (provider: acks-location; consumers: content
  import flows) — `importDoc`/`removeDoc`/`listDocs`, persistence entirely
  provider-side.
- **Ruledata loader** (`scripts/ruledata.mjs`, Foundry-only) —
  `loadRuledata(moduleId, ids, {priority})`; a missing file is a normal,
  reported state (`{loaded, missing}`), not an error.
- `apiVersion: 3`. FAMILY.md §3c's plan to ship `ruledata/economy.json` in
  the lib is superseded: no book-read value ships in any repo.

## 0.6.0

- **Scoping primitives — WHEN a modifier applies.** The model could say what a
  modifier adjusts but not when it applies to a particular roll, so six axes
  had no home and acks-influence carried them in its own ActiveEffect flags
  where nothing else could read them. Adds `ALIGNMENTS` (mirroring
  acks-monsters, value-identical), `INFLUENCE_TONES`, `SCOPE_ALIGNMENT_MODES`
  and `scopeApplies(effect, ctx)`; effect fields gain `vsKinds`,
  `vsAlignment`, `vsAlignmentMode`, `tones`, `optionalRule`, `kickerAt` and
  `kickerNote`.
  - **Gate and sign are different things, not a flag.** Ancient Pacts is +1
    versus Chaotic monsters and nothing otherwise; Deathly Visage is +2 versus
    Chaotic and −2 versus everyone else. Storing either as the other is wrong
    by double the value, in the direction that matters most. Default is gate.
  - **`undetermined` is not `false`.** A scope the context cannot settle — an
    untyped target, no tone chosen — has not failed. Collapsing the two makes
    a bonus silently vanish against a target the GM merely hasn't classified,
    so callers can offer undetermined modifiers as manual toggles.
- Compiled LevelDB packs are no longer committed; they are build output.

## 0.5.0

- **`appliesTo` — whose roll an effect modifies.** `self` (the default),
  `opponent` or `ally`. The thief skill Hiding penalises the OPPONENT's surprise
  roll and their attacks against the hidden thief; stored as
  `{target:"surprise", value:-2}` that read as a penalty on the thief, inverting
  the ability, and nothing in the schema could tell the two apart. It is the
  Blind Fighting failure mode wearing a different costume. Existing effects are
  unaffected — the default is `self`, which is what they already meant.

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
