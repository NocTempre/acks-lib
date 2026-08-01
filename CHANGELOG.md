# Changelog

## 0.35.0

- **A third pill state: grey for "unset".** acks-equipment answers permissively
  when a character has no profile — `{all: true}` for weapons, `heavy` for armour
  — so it never penalises an un-set-up actor at roll time. Lighting the strip off
  that default claimed proficiencies nobody had granted: strip a character bare and
  it still read as proficient in everything. A group with no explicit profile (no
  flag, no granting effect) is now **entirely grey** — unknown, not "yes" and not
  "no". No assumptions are made for an unset group, not even the styles every class
  technically has; a configured group shows exactly what it was given.
- **Fixed the dark band under the card for good.** The sheet asks to size to its
  content, but a window the user has resized keeps that height, and bare
  window-content showed as a band below the card. The card now stretches to fill
  the frame whatever its size (and scrolls when it is the taller of the two) —
  verified by force-resizing the window to 830px: 6px of padding under the card,
  no void.

## 0.34.0

- **The weapon strip lists every weapon class (plus unarmed), lit by coverage.**
  0.33.0 showed the breadth ladder itself; the pills are now the classes — unarmed,
  axes, swords & daggers, flails/hammers/maces, spears & polearms, bows, crossbows,
  other — and the class-build selection lights the ones it *covers*, since one
  selection routinely covers several. Read through acks-equipment's documented
  token grammar: `all` lights everything, `melee:<size>` every melee class,
  `missile:all` every missile class, a category token its own class, and a bare
  weapon key the class that weapon belongs to. Unarmed always lights (anyone may
  strike unarmed) and golds with Unarmed Fighting. Verified: `axe` → UN+AX only;
  `melee:medium` → every melee class but no bows; `club,dagger,sling` → swords &
  daggers plus other.

## 0.33.0

- **The build strips now show the JJ class-build selections, and sit across the
  card's bottom.** 0.32.0 used acks-equipment's internal weapon *groupings*, which
  are not what a class picks. The strips are now the actual class-build choices
  (JJ pp. 290–291): the **weapon selection ladder** (restricted → narrow → broad →
  unrestricted, lit to the class's breadth, derived through acks-equipment's own
  documented token grammar), the **armour ladder** with all five rungs
  (unarmoured → very light → light → medium → heavy — very light had been missing),
  and the five fighting styles. **Shield is its own pill**, not a rung: RR pp.
  128/140–141 give it its own armour category, and RAW it only benefits a class
  with the Weapon & Shield style (JJ p. 291), so that style lights it.
  Specialization/focus still reads gold.
- They moved **out of the Powers/Prof panel into a labelled footer** (Style /
  Weapons / Armour) across the bottom of the card, which is what made that panel
  cluttered.

## 0.32.0

- **Fighting styles, weapon proficiency and armour become always-visible icon
  strips** instead of list rows. Every slot shows; a trained one lights up; a
  **specialized style or focused weapon group reads gold**. The state comes from
  acks-equipment's own profile API (effects + flags), never from item names, and
  the strips are omitted entirely when that module is absent rather than guessed.
  This alone took a real henchman's proficiency list from 11 rows to 5 — the five
  "Fighting Style: …" entries and "Armour Proficiency: Heavy" are now a strip.
- **A d20 button means "this rolls."** Proficiencies without a roll formula
  (Diplomacy, most social/knowledge entries) no longer show a button at all;
  entries covering several throws keep several (Adventuring's own section).
- **Weapons show their size as pips** (tiny ● → large ●●●●) on each attack row,
  read from acks-equipment's classifier.
- **Fixed: the empty bar under a short card.** `position.height: "auto"` only
  applies to the first render, so any resize (or a restored position) pinned a
  pixel height that showed as dead space. The card now re-fits its window on every
  render — verified on a real henchman: window 535px vs card 485px + padding,
  where it had been ~770px.

## 0.31.0

- **Weapons are damage-typed without an annotation step** (`damage-type.mjs`).
  Core items carry no damage type, and acks-equipment only stamped one when its
  annotate macro was run — so ordinary gear was untyped and nothing could show a
  damage-type affordance. The type now resolves LIVE through acks-equipment's own
  classifier (no second copy of the weapon table, no annotate step): an
  unannotated "Sword" resolves *slashing*, "Shortbow" *piercing*. Resolution order
  is acks-lib override flag → acks-equipment's stamped flag → its live classifier
  → null (a weapon the books do not type stays untyped and gets a neutral icon —
  no guessed types). `setDamageType(item, type)` sets an override for ad-hoc gear.
  Exposed as `acksLib.damageType` (resolver, icons, labels, attack options).
- **The Follower Card's attacks are now the options the body actually has**, one
  row per equipped weapon with its **damage-type icon** as the roll button: a
  thrown melee weapon lists twice (melee and thrown), and an empty-handed body
  lists only unarmed and improvised (including an improvised throw). Rows keep the
  target/bonus split (`Sword 10+ +1`) and roll the actual weapon, so
  acks-equipment's per-weapon RAW modifiers apply. A monster with no gear keeps
  its natural attack routine.

## 0.30.1

- **The core sheet's folded Melee/Ranged display is now fully superseded**
  (`patches/attack-display.mjs`). 0.30.0 fixed the roll; the character sheet still
  printed Melee/Ranged as a bonus-only number with the attack throw omitted — so
  the wrong figure stayed reachable and editing the throw appeared to do nothing.
  The patch layer now overwrites those boxes on every render with the same model
  the roll uses — `10+ +3` (throw target · roll bonus) — and a tooltip naming both
  halves. Core source is untouched (runtime replacement only, character sheets
  only); the rollable headers keep their own wiring. Live-verified: the box reads
  `10+ +3`, and moving the throw to 7 moves the display to `7+ +3`.

## 0.30.0

- **The attack roll is re-modeled at the engine root: throw = moving target,
  bonuses = auditable stack** (`patches/attack-roll.mjs`, acks-lib's patch-layer
  charter). ACKS distinguishes the attack THROW — a target that moves with class/
  level — from BONUSES added to the roll (ability, magic, situational). Core's
  `rollAttack` folded the target movement into the die pool (`bba = 10 − throw`),
  so the chat total silently contained the target-side adjustment and no modifier
  could be attributed. acks-lib now owns the method: the roll is
  `1d20 + labeled terms` (each visible in the dice tooltip), resolved as
  `die + Σbonuses ≥ throw + target AC`, with the die specials preserved (nat 1
  misses, nat 20 hits, neither under exploding 20s). **Hit outcomes are identical
  to core's for identical inputs** — a 14,000-case parity sweep against core's
  folded resolution runs in `npm test`. The chat card states the throw as a
  target ("Attack throw 8+ vs AC 4 → needs 12+"), itemizes the stack
  ("11 + 2 (Strength) + 1 (Weapon) = 14 → hits AC 6"), and renders core's own
  template so damage application and chat listeners are untouched.
- **The seam for planned effect logic:** `acksLibPreAttackRoll(actor, ctx)` fires
  before every attack with the mutable term stack (`ctx.terms`, stable keys), the
  movable target (`ctx.throwTarget`), and `ctx.targetAc` — replacer/deduplication
  effect logic operates there instead of fighting a folded total.
  acks-equipment's existing `rollAttack` WRAPPER composes on top unchanged (its
  RAW deltas arrive through the weapon term); registered via libWrapper OVERRIDE
  when available, plain method patch otherwise; world setting
  (`attackRollPatch`, default on) restores the stock roll. Exposed as
  `acksLib.attack` (terms/resolver/hook name).
- **Follower Card attack lines respect the distinction**: "Melee 8+ +2" — the
  throw target (moves with level) and the roll bonus (ability + adjustment),
  never folded into one number.

## 0.29.4

- **Follower Card sizes to its content.** The sheet had a fixed height taller than a
  short card, leaving an empty dark bar below it. It now grows to fit the card and
  scrolls only when it outgrows the viewport (capped at 88vh). Live-verified: the
  window content height matches the card (no filler bar).

## 0.29.3

- **Follower Card becomes a quick-roll surface with card-only overrides.**
  - Proficiencies/skills get a right-aligned roll button (its tooltip names the roll).
  - A dedicated **Adventuring** section (dungeon-bashing, climb, listening, searching,
    trap-breaking), shown only for a hireling trained in Adventuring; each throw rolls.
  - Every roll target (AC, adventuring throws) takes a **sticky card-only override** —
    stored in a flag the main character sheet ignores, so you can change a target for a
    quick roll without touching the actor's real data. **Reset** clears the overrides;
    **Commit** bakes them into the real base fields (AC via `aac.mod`, adventuring
    directly). An overridden roll uses the override target; otherwise the system's own
    roll runs.
  - **+Attack / +Skill** buttons add minimal weapon / ability items for ad-hocs.
  - Melee/Ranged now show the full attack bonus the roll actually uses (base throw
    included), not just the ability adjustment.
  Live-verified on acks 14.0.1. (Attacks-as-a-list-from-equipment, with damage-type
  icons and the unarmed/improvised fallback, is the next increment.)

## 0.29.2

- **Follower Card gains key actions: equip, roll, and edit AC.** On the editable
  card (a hireling's own sheet), each weapon/armour in the Equipment list gets an
  equip/unequip toggle; the Powers/Prof entries and the Melee/Missile (or monster
  attack) lines are now rollable (a proficiency rolls its formula or posts its
  card; an attack opens the system's attack roll); and AC is an editable field
  with a reset button — a character's edit adjusts `aac.mod` so the effective AC
  lands on the typed value and Reset zeroes it, while a monster's edit writes its
  stored `aac.value` directly. The read-only hirelings-tab grid cards are
  unchanged (still a view). Live-verified on acks 14.0.1.

## 0.29.1

- **Fixed dark-on-dark illegibility on `.acks-ui` sheets.** With the sheet-theme
  setting on and the client in dark mode, sheet-theme's body-class token overrides
  (which it deliberately does not flip dark — it keeps Foundry's own dark surfaces
  for the SYSTEM sheets it themes) out-specified acks-design's dark palette inside a
  `.acks-ui` component root, leaving dark `--acks-ink` text on acks-design's dark
  paper ground. The acks-design layer now re-asserts its dark palette on `.acks-ui`
  itself at a specificity that outranks the body class, isolating the component
  layer from the whole-client theme. Live-verified: location-sheet labels/inputs go
  from `#231f20` on `#1b1416` (illegible) to `#ede6df` on `#1b1416` (~13:1).

## 0.29.0

- **The acks-design system is now vendored and available family-wide.** Lifted a
  self-contained copy of the ACKS II design system (tokens, base typography,
  textures, ornaments, tables, callouts, controls, and the Foundry chrome layer,
  plus the OFL text fonts) from the local reference folder into
  `vendor/acks-design/`, loaded as an opt-in stylesheet. It is scoped entirely
  under `.acks-ui` and inert until a sheet adds that class to its application root,
  so it restyles nothing for players who never open an opted-in sheet — but any
  family module can now give a sheet the printed-book look (porphyry window header,
  Cinzel caps, ruled tables, tags, callouts) just by opting in and using the
  `.acks-*` component classes, with no per-module copy. The non-OFL "Acks Symbols"
  glyph font and the character-sheet geometry (glyphs/shapes) are deliberately not
  vendored. Nothing depends on the reference folder at runtime.

## 0.28.0

- **Follower Card — the printed henchman/follower card as a compact actor sheet.**
  A new `FollowerCardSheet` renders an actor as the half-page ACKS II follower card
  (name banner; class·level·xp·alignment; AC + HP + the six ability boxes;
  SPD/ENC/morale/loyalty; powers·prof; notes; equipment; melee/missile · #AT · DMG),
  built only from the sheet-theme tokens so it matches the printed look in light and
  dark. One template serves two surfaces: this editable sheet, and the read-only
  cards acks-henchmen re-skins the character sheet's hirelings tab into (via the new
  `acksLib.followerCard` api — `context` / `render` / `Sheet` / `TEMPLATE`). An
  **Expand / details** header button opens the full system sheet for what the card
  omits (items, spells, effects).
- **Hirelings default to the card.** Keyed on the core `system.retainer.enabled`
  flag — so it covers **character and monster** hirelings alike, with no dependency
  on acks-henchmen — the card is made a retainer's per-instance default sheet
  (`flags.core.sheetClass`) on creation, when a plain actor is flipped into service,
  and via a one-time GM sweep for existing retainers. It only ever sets the flag when
  unset (a hand-picked sheet is never clobbered) and never auto-reverts; PCs and wild
  monsters keep their full system sheet. The card is registered as an alternative
  sheet for both types, so anyone can switch to or from it by hand. No system files
  are touched — the card is a module-registered alternate sheet made default
  per-instance. See docs/FOLLOWER-CARD.md.

## 0.27.0

**The sheet theme moves onto the measured ACKS II palette.** `--acks-maroon:
#5c1f2b` and the cream banner lettering were *texture averages* of the sheet's
raster banner artwork — anti-aliased white over speckled stone reads as cream,
and the stone's mean reads as a muddy maroon — not colours the artwork
specifies. Measurement of the vector fills across all four core books plus the
character sheet gives a flat spot value of `#620730` (90% of all stroked line
work in the corpus), `#231f20` ink, a `#e6e7e8` sheet ground, and reversed
*white* banner lettering. The theme now carries those. The system's own
`--acks-purple` was already `#620630` — one channel unit away — so the old
palette here was overriding correct core chrome with an approximation.

The spot colour is now split into the two roles it actually plays:
`--acks-burgundy` for surfaces (bands, tags, active tabs, fills) and
`--acks-spot` for ink (borders, focus rings). They are one value in light and
deliberately diverge on a dark seat (`#8e1442` / `#e79bab`), because a surface
must stay dark enough to carry white banner text while ink must come up light
enough to read on a dark ground. The old single value, reused as a focus border
there, measured 1.46:1; it is now 7.9:1. The banner's hardcoded `url()` into the
system's own assets is replaced by a procedural porphyry gradient built from the
measured tonal stops, so the layer no longer reaches into another package's
private layout and the band follows the token.

**Fixed:** core ships an `.acks.sheet.actor` + `.window-header` rule at
specificity (0,4,0) that out-specified the theme's header rule (0,2,1), and
being a `background` shorthand it reset `background-image: none` — so the
banner texture never reached actor-sheet headers, only item sheets and dialogs.
The colour still looked right, because core reads the remapped `--acks-purple`,
which is what hid it.

Values and role discipline follow the measured token set in `acks-design`,
adopted as a contract rather than imported: that system is scoped to `.acks-ui`
on an application root the consuming module owns, while this layer restyles
markup owned by the `acks` system and loads unconditionally. Nothing is
vendored, so the theme still ships no fonts and stays inert until
`body.acks-lib-sheet-theme` lands.

## 0.25.0

**Sheet theme goes scheme-aware — no more white fields on dark seats.** The
printed paper ground and white boxed fields now apply only when the client
runs a light scheme (`body:not(.theme-dark)`, so an unthemed client still
reads as the printed page), and their text is forced to ink rather than
following a theme variable (light-on-white was illegible). A dark-schemed
seat keeps Foundry's dark surfaces and text and takes the printed look's
boxing (translucent dark fields with a subtle light rule), maroon banners,
and small-caps typography. Artwork-overlay inputs (shield/hearts, spinner
rows) are guarded with `!important` so neither field rule can box them.

## 0.24.0

**Printed-character-sheet theme.** New `styles/sheet-theme.css`, scoped under
`body.acks-lib-sheet-theme` and toggled by a per-client setting (default on):
the visual language of the official ACKS II character sheet PDF — deep maroon
banners (the system's red-glitter texture) with cream small-caps serif
lettering on every header band, a neutral light-gray sheet ground in place of
the papyrus webp, white input fields boxed by a thin dark rule (inputs drawn
over shield/heart artwork stay unboxed), and the system's one-off colors (tan
tabs, charcoal tags, green encumbrance fill) routed through the sheet's
maroon/paper palette. Implemented as an override layer here rather than in
core: the system's own CSS custom properties are redefined at body level, so
system chrome follows the theme without editing system files.

## 0.23.0

**The troops addendum gets real mechanics — command capacity and unit morale.**
Beyond the officer link, a stack now carries `mounted` (cavalry count double
toward command) and `baseMorale` (the troop type's RR 166 base), and `unit`
caches `officerLevel`. `GroupData` derives them into RAW skirmish rules:
`troopStrength` (infantry-equivalents), `commandCapacity` (RR 169 "personally
led": 3rd+ level = a platoon of 30 inf / 15 cav, 2nd = half-platoon, 1st = a
squad — `platoonCapacity` in `group-logic.mjs`, unit-tested), `overCommand` (the
group is larger than its officer can lead), and `unitMoraleOf(stack)` (troop base
+ officer + leader modifiers, clamped to RR 166 −4..+4). The group exposes the
morale VALUE; the 2d6 roll belongs to the morale owner (acks-influence). Past a
platoon the multi-unit army command structure is acks-troops, not skirmish scale.

## 0.22.0

**Group troops addendum: a commanding officer.** `unit` gains `officerUuid` (the
commanding officer's lone actor — an officer is a unique leveled individual who
COMMANDS the troop stacks, not a stack himself) and a cached `officerMoraleBonus`
(the RR 171 modifier), and `GroupData` gains a `commandMorale` getter (unit
morale + the officer's bonus, clamped). This is the skirmish-scale slice only;
domain-scale command and Battles integration remain acks-troops. acks-henchmen
consumes this to hire a whole unit from the market as one group (troops → stacks,
officer → linked commander).

## 0.21.0

**A group is now MANY stacks, not one prototype.** `GroupData` held a single
`template`/`size`/`roster`; it now holds a list of `stacks`, each with its own
base actor, headcount, and sparse roster. A mixed unit — 10 swordsmen beside 10
spearmen — is two stacks over two base actors, so different gear is a different
prototype, not a per-body override, while the ActorDelta layer still handles
divergence WITHIN a stack (one swordsman loots a better blade). Each stack keeps
the full per-body lifecycle — materialize / deploy / recall / detach /
casualties, HP rolled per body — so health is tracked per stack: every op takes
a stack key, deployed tokens carry a `stack` flag so recall routes each back to
the right roster, and the sheet shows one section per stack (drop an actor to add
a stack, drop onto one to re-point it). Group-level fields (collective noun, unit
wages/morale) stay shared. `migrateData` folds an existing single-stack group
into `stacks[0]` under a fixed key, so live groups upgrade in place. No external
consumers today (acks-troops is unbuilt), so nothing downstream moves.

## 0.15.0

**The `acks-lib.group` stackable actor.** A group is many near-identical
creatures held as one actor — a mercenary platoon, a pack of kobolds, a flight
of manes — carrying a headcount and a *sparse* roster. The load-bearing idea:
a member's individuality IS an `ActorDelta` source object (Foundry's own
per-instance override), so a member that has never diverged needs no record at
all, and a deployed member is an ordinary token over an ordinary actor that
every system/module reads unchanged. Adds `GroupData`, `GROUP_TYPE`, and the
`groups` lifecycle API (setPrototype / deploy / recall / detach / materialize /
casualties), a dedicated sheet, and the Foundry-free `group-logic.mjs` (unit
tested). Ecology consumption is one soft `sizeFromEcology` reader and otherwise
a documented, unimplemented seam. `apiVersion` → 9. See `docs/GROUPS.md`.
Mercenary-specific behaviour (leaders, training, unit wages) is deliberately
NOT here — it belongs to a consuming module (`acks-troops`).

## 0.14.0

**`speedsField` gains the full ACKS Speed row.** It described only
`{ type, run }` — an incomplete guess at the monster Speed table, and unused by
anything. It now carries `combat` (the encounter/combat speed, ⅓ of running) and
`hover` (whether a flyer can hover) alongside `type`/`run`, matching what a
creature's speed line actually holds, so acks-monsters can adopt it in place of
its own inline copy. `sensesField` and `visionField` were already the exact
shapes acks-monsters uses. Additive — the field had no consumers, so nothing
migrates.

## 0.13.0

**`NATURAL_WEAPONS` becomes the family superset.** acks-monsters kept its own
copy of six shared enums — damage / natural-weapon / vision / sense / movement
types and alignment — value-identical to acks-lib's except that its
natural-weapons list carried three keys acks-lib lacked: `sting`, `feeler`,
`envelopment`. Those three are added here so acks-lib is the single source of
truth acks-monsters can consume without losing anything. `sting` coexists with
the existing `stinger` (same concept, different key that predates the fold);
collapsing them would need a data migration, so both remain and any monster
that stored either resolves. Purely additive — existing consumers are
unaffected.

## 0.12.0

**Shared actor-read accessors (`actor-read.mjs`).** The small graceful-degradation
reads of the acks system's actor sheet — an ability modifier, class level, and a
monster's Hit Dice — lived in both acks-henchmen and acks-influence. They're one
definition now: `abilityMod`, `classLevel`, `monsterHd`, `hitDiceOrLevel`.

The `monsterHd` parser is the **union** of the two copies, which had each missed
a case the other handled: henchmen read a leading decimal (`"0.5d4"`→0.5) but not
the `"1/2"` fraction; influence read the fraction but mis-read a decimal and
matched a digit anywhere (`"d8"`→8, taking the die size for a rating). The union
handles a number, an `a/b` fraction, and a leading integer-or-decimal, anchored
so a die size can't be mistaken for a rating — fixing both latent bugs.

## 0.11.0

**Two shared primitives, each wired to real consumers.**

- `int` — a required-integer field-builder — joins `num`/`str` in `fields.mjs`.
  acks-henchmen had it copied verbatim in two data files; both now import it.
- `slug` — the lowercase-alphanumeric fold for name matching — joins
  `vocab.mjs` and now backs `capabilityForId` internally. acks-equipment
  (locks), acks-abilities (rank counting) and acks-formation (ability key)
  each carried an identical copy; all three now import it.

Additive only. `normalizeAlignment`, a `choicesOf` fold, and GM helpers were
built and then **dropped** — checking each found no clean consumer (influence's
alignment is a deliberately separate token set; henchmen's `choicesOf` assumes a
different enum shape), so shipping them would have been dead API.

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
