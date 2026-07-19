# acks-lib API (v0.6)

`acks-lib` is the family's shared-primitives library. **Scope is the
effect/ability vocabulary** the abilities program needs, plus the scoping
primitives the social rolls need (v0.6) — deliberately *not* the full
[FAMILY.md](../../acks-module-template/docs/FAMILY.md) §3 plumbing (tables
registry, socket relay, economy data), which stays that refactor's Phase 1
backlog. `library: true`, `socket: false`, requires only the `acks` system.

## Exposure

- `globalThis.acksLib` — assigned at module evaluation via the core-deferral
  shim `game.acks?.lib ?? localImpl`; re-affirmed at `init`.
- `game.modules.get("acks-lib").api` — the same object, set at `init`.
- Node/offline tooling imports the files directly (sibling-relative), e.g.
  `import { resolveLevelValue } from "../../acks-lib/scripts/vocab.mjs"`.

```
acksLib = {
  apiVersion: 2,
  vocab,               // scripts/vocab.mjs — enums + resolvers (Foundry-free)
  fields,              // scripts/fields.mjs — DataModel field-builders (Foundry-only)
  resolveLevelValue,   // (levelValue, level, scales?) → number | null
}
```

## `vocab` — Foundry-free enums (Node-importable)

Enum objects are `{ key: { label, … } }`; `vocab.choicesOf(enumObj)` maps them
to `{ key: label }` for DataModel `choices`.

- **Shared with acks-monsters** (value-identical mirror until its deferred
  migration): `DAMAGE_TYPES`, `MOVEMENT_TYPES`, `VISION_TYPES`, `SENSE_TYPES`,
  `NATURAL_WEAPONS`, `ALIGNMENTS`.
- **Ability effect model** (new): `ABILITY_CATEGORIES`, `EFFECT_TYPES`,
  `MODIFIER_TARGETS`, `EFFECT_KEYS`, `CONDITION_KEYS`, `PROGRESSION_CLASSES`,
  `PROGRESSION_LEVELS`, `SPELL_LIKE_FREQ`, `RESOURCE_KINDS`, `ROLL_TYPES`,
  `REROLL_KEEP`, `VALUE_SCALES`, `CONVERSION_STATUS`.
- **Scoping** (v0.6): `INFLUENCE_TONES`, `SCOPE_ALIGNMENT_MODES`.

### Scoping — when a modifier applies

`condition` on an effect is free text a human reads. The scoping fields are the
part a machine can decide, and `scopeApplies(effect, ctx)` is the one place
that decides them.

| field | meaning |
|---|---|
| `vsKinds` | target kind tokens (`animal`, `dwarf`, `human`, `demi-human`, `monster`). The token vocabulary belongs to the **consumer** — lib carries the list and matches it. |
| `vsAlignment` | an `ALIGNMENTS` key the target must be |
| `vsAlignmentMode` | `gate` (default) — applies only versus that alignment; `sign` — applies always, negated otherwise |
| `tones` | restrict to some of the three `INFLUENCE_TONES` |
| `optionalRule` | obeys a world setting of this name; **absent means enabled** |
| `kickerAt` / `kickerNote` | a rider that fires when the roll total reaches `kickerAt` (Mystic Aura's 12+ bewitched) |

```js
scopeApplies({ vsKinds: ["animal"] }, { kinds: ["animal"] })
// → { applies: true, sign: 1, undetermined: false }
```

`gate` and `sign` are separate modes because the books write both and they are
different rules: Ancient Pacts is +1 versus Chaotic monsters and nothing
otherwise; Deathly Visage is +2 versus Chaotic and −2 versus everyone else.
Storing either as the other is wrong by double the value, in the direction that
matters most.

**`undetermined` is the field to respect.** It means a scope was declared but
`ctx` could not settle it — an untyped target, no tone chosen yet. That is not
the same as a scope that failed, and collapsing the two makes a bonus vanish
against a target the GM simply has not classified. Offer an undetermined
modifier as a manual toggle; never drop it and never auto-apply it.

### LevelValue

A value that may be flat or a function of class level. `resolveLevelValue(lv,
level, scales)` returns the number at `level`:

| shape | example | @level → |
|---|---|---|
| flat number | `5` | `5` |
| `{ kind:"perLevel", base, per }` | `{base:18, per:-1}` | `18 + per·(level−1)` |
| `{ kind:"breakpoints", breakpoints:[{atLevel,value}] }` | `+1/+2/+3 @1/7/13` | last `value` whose `atLevel ≤ level` |
| `{ kind:"progression", as, atLevel }` | thief skills | `null` — caller resolves via the class table |
| `{ kind:"conditional", on, breakpoints }` | cost by Arcane Value | ladder keyed on `scales[on]`, not level |

A `conditional` reuses the breakpoint ladder unchanged — only the number fed
into it differs — so `atLevel` there reads *"at this value of `on`"*. `on` is a
`VALUE_SCALES` key. Returns `null` when the caller did not supply that scale.

### Rerolls

`{type:"reroll", keep, times, target, rollType}` — `times` counts the *extra*
rolls and defaults to 1, so the common "roll twice" needs no field set.
`resolveReroll(results, keep, rollType)` picks the result that stands, and
`rerollTotal(effect)` says how many to roll.

**"Better" is not "higher."** ACKS throws run both ways: an attack or
proficiency throw is roll-high (`above`), so better is the maximum; a roll
measured against a ceiling (`below`) is roll-low, so better is the minimum.
Pass the effect's own `rollType` and the polarity stays honest.

### Companions

`{type:"companion", ref, actorUuid, amount}` — `ref` is the **monster entry id**
the ability confers. The pointer ships; the creature's text does not. `actorUuid`
is the bucket the actor lands in, empty until the citing book is available or a
GM drops one in, so a bookless seat still gets the slot and can fill it later.

### Capabilities — the gate pattern

A **capability** is what an ability lets you do, named independently of which
ability grants it. Abilities declare what they `provide`; prerequisites, gates
and stacking are written against the capability.

| token | meaning |
|---|---|
| `def.<class>.<slug>` | one exact ability |
| `kw:<slug>` | a capability — any ability providing it |

Either form works anywhere a ref is accepted (`requires`, `ifHas`,
`stacksWith`, `notStacksWith`).

```js
satisfies(abilities, token)       // abilities: [{ id, provides }]
satisfiesAll(abilities, tokens)
capabilityForId("def.prof.sensingEvil")   // "kw:sensingevil"
nonStackingGroups(abilities)      // { capability: [ids] } held more than once
```

This exists because the books print one capability several ways. *Searching* is
a thief skill, a proficiency, and what several class powers hand out — and an
alias prints it under another name again. A gate naming `def.prof.searching`
misses every other route to it; `kw:searching` catches them all. An ability
always implicitly provides its own id's capability, so a gate resolves before
anything has been tagged.

It also collapses aliases and non-stacking into one mechanism: two abilities
providing the same capability *are* that capability twice, so they do not stack.
That falls out of the data instead of being asserted per pair.

### Conversion status

`CONVERSION_STATUS[status]` → `{ label, severity, icon, tip }`, and
`conversionTip(status, name)` fills the `{name}` placeholder. All three are
marked: `renamed` is a note (*"{name} has been renamed for ACKS II"*), `deleted`
a caution, `absent` an info. Read the wording from here so the family says the
same thing everywhere.

## `fields` — DataModel field-builders (Foundry-only, lazy)

Each is a function dereferencing `foundry.data.fields` only when called (at model
definition). Leaf helpers `num/str/bool/html/choice/choiceSet`, plus:

- `levelValueField()` — a LevelValue SchemaField.
- `spellRefField()` — **placeholder** (`{uuid, name}`) pointing at the core
  system's existing spell item. See *Not yet consumed* below.
- `defensesField()` — `{ immunities, resistances, susceptibilities }`, each
  `{ damage:Set, effects:Set, conditions:Set, mundane, extraordinary }`
  (the shape acks-monsters' defenses adopt on migration).
- `speedsField()` / `sensesField()` / `visionField()` — Speed/Senses/Vision
  shapes shared with the monster sheet.
- `effectField()` / `effectsField()` — one typed effect primitive (wide
  all-optional schema discriminated by `type` ∈ `EFFECT_TYPES`) and the array of
  them. This is what acks-abilities stores as an ability's `effects[]`.

### Relational effects — requires / grants / modifies, stacking and chaining

ACKS abilities constantly depend on, confer, or alter *other* abilities, so
these are structured refs rather than free text. Any effect may carry:

| field | meaning |
|---|---|
| `ref` / `refs` | the ability this effect targets (`modifies`), requires, or grants |
| `ifHas` | gate — applies only while the character *also* has these |
| `mode` | `add` \| `replace` \| `set` ("instead of" is a replace variant) |
| `stacksWith` / `notStacksWith` | explicit stacking rules |
| `choose` | for `grants`: pick N of `refs` |

How the book's recurring shapes map:

- **Modifies another ability** — Skulking's *+2 to Hiding and Sneaking throws*:
  `{type:"modifies", refs:[hiding, sneaking], target:"proficiencyThrow", value:2, mode:"add"}`.
- **Conditional override ("instead")** — Alertness searches at 14+, *but if you
  are separately proficient in Searching you get +2 to that throw instead*: a
  base `throw` effect plus
  `{type:"modifies", refs:[searching, listening], ifHas:[searching, listening], value:2, mode:"replace"}`.
- **Stacking rules** — Diplomacy's *+1 reaction stacks with Mystic Aura but not
  Intimidation or Seduction*:
  `{type:"modifier", target:"reaction", value:1, stacksWith:[mysticAura], notStacksWith:[intimidation, seduction]}`.
- **Chaining / partial stack** — Counterspelling is +2 caster levels, *three
  rather than two* with Bright Lore of Aura: the base
  `spellcastingMod` plus `{…, ifHas:[brightLoreOfAura], casterLevelDelta:3, mode:"replace"}`.
- **Prerequisite** — Eldritch Warrior *requires* Eldritch Talent:
  `{type:"requires", refs:[eldritchTalent]}`.
- **Grants a choice** — Expert Traveler *begins play with Driving or Seafaring*:
  `{type:"grants", refs:[driving, seafaring], choose:1}`.

## Not yet consumed (built ahead of the magic work)

These exist so the shape is agreed before anything depends on it. Nothing reads
them today; treat a change here as cheap until magic lands.

- **`VALUE_SCALES.arcaneValue` / `.divineValue` + `conditional` LevelValue.** A
  custom-class power can cost differently by the class's spellcasting value
  ("1 power at Arcane Value 1–2, 2 at Arcane Value 3–4"). The resolver handles
  it; acks-abilities still stores a plain numeric `powerValue`. **TODO(magic):**
  move `powerValue` onto `levelValueField()`.
- **`spellRefField()`.** Points at the core system's spell item by uuid with the
  printed name as a fallback — enough to link and display, but it models nothing
  about the spell. **TODO(magic):** replace with a real spell primitive (school,
  range, duration, save, reversibility, ritual cost) and retire the free-text
  `spell` string on `effectField`.

## Versioning

Semver + `apiVersion`. Additive enum/field growth is a minor bump; a shape
change to an existing field is a major bump with coordinated consumer updates.
Consumers pin `compatibility.minimum` on their `requires acks-lib`.
