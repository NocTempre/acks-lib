# acks-lib API (v0.1)

`acks-lib` is the family's shared-primitives library. **v0.1 scope is the
effect/ability vocabulary** the abilities program needs — deliberately *not* the
full [FAMILY.md](../../acks-module-template/docs/FAMILY.md) §3 plumbing (tables
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
  apiVersion: 1,
  vocab,               // scripts/vocab.mjs — enums + resolveLevelValue (Foundry-free)
  fields,              // scripts/fields.mjs — DataModel field-builders (Foundry-only)
  resolveLevelValue,   // (levelValue, level) → number | null
}
```

## `vocab` — Foundry-free enums (Node-importable)

Enum objects are `{ key: { label, … } }`; `vocab.choicesOf(enumObj)` maps them
to `{ key: label }` for DataModel `choices`.

- **Shared with acks-monsters** (value-identical mirror until its deferred
  migration): `DAMAGE_TYPES`, `MOVEMENT_TYPES`, `VISION_TYPES`, `SENSE_TYPES`,
  `NATURAL_WEAPONS`.
- **Ability effect model** (new): `ABILITY_CATEGORIES`, `EFFECT_TYPES`,
  `MODIFIER_TARGETS`, `EFFECT_KEYS`, `CONDITION_KEYS`, `PROGRESSION_CLASSES`,
  `PROGRESSION_LEVELS`, `SPELL_LIKE_FREQ`, `RESOURCE_KINDS`, `ROLL_TYPES`.

### LevelValue

A value that may be flat or a function of class level. `resolveLevelValue(lv,
level)` returns the number at `level`:

| shape | example | @level → |
|---|---|---|
| flat number | `5` | `5` |
| `{ kind:"perLevel", base, per }` | `{base:18, per:-1}` | `18 + per·(level−1)` |
| `{ kind:"breakpoints", breakpoints:[{atLevel,value}] }` | `+1/+2/+3 @1/7/13` | last `value` whose `atLevel ≤ level` |
| `{ kind:"progression", as, atLevel }` | thief skills | `null` — caller resolves via the class table |

## `fields` — DataModel field-builders (Foundry-only, lazy)

Each is a function dereferencing `foundry.data.fields` only when called (at model
definition). Leaf helpers `num/str/bool/html/choice/choiceSet`, plus:

- `levelValueField()` — a LevelValue SchemaField.
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

## Versioning

Semver + `apiVersion`. Additive enum/field growth is a minor bump; a shape
change to an existing field is a major bump with coordinated consumer updates.
Consumers pin `compatibility.minimum` on their `requires acks-lib`.
