/* global foundry */
/**
 * `acks-lib.group` — a STACK of near-identical creatures held as one actor:
 * a mercenary platoon, a pack of kobolds, a flight of manes.
 *
 * THE PROBLEM. A hired mercenary platoon is, in the system today, ONE
 * `character` actor with `system.retainer.quantity = 30`. The 30 is a label:
 * there is no per-body hit points, no casualties, no "this one has a different
 * sword". The same gap swallows every monster group. But the books stat these
 * as many individuals who happen to be alike, and play needs them to diverge —
 * one takes an arrow, one loots a better blade, one becomes a named villain.
 *
 * THE MODEL. Foundry already has a sparse per-instance override document: an
 * unlinked token's `ActorDelta` stores only what differs from its base actor,
 * embedded item overrides included, and the acks system already writes into it
 * (an unlinked monster token rolls its HP straight into `token.delta`). So a
 * member's individuality IS an ActorDelta source object — same shape, same
 * merge rules — and a member that has never diverged needs NO record at all.
 *
 * THE INVARIANT. `size.current` counts living bodies. The `roster` holds a
 * record ONLY for members that have become interesting (materialized, deployed
 * to the canvas, detached to their own actor, or fallen). Pristine bodies are
 * the DIFFERENCE:
 *
 *     pristine = size.current − (materialized + deployed records)
 *
 * A 30-strong platoon that has never fought is `size.current: 30, roster: []`.
 * Storage is proportional to how interesting the group has become, not to its
 * headcount. That is the whole point.
 *
 * THE COMPAT STRATEGY is deploy/recall (see group.mjs): a deployed member is an
 * ordinary token over an ordinary actor, so combat, acks-equipment and
 * acks-formation all work on it with no special-casing. Undeployed, the stack
 * carries a REPRESENTATIVE INDIVIDUAL's stat block (one body's hp/aac/saves) so
 * the token is still attackable and shows a sensible bar — the same reason
 * `acks-lib.animal` mirrors the monster field paths (see actor-compat.mjs).
 */
import { acksCompatStubs, savingThrowFields } from "../actor-compat.mjs";

/** A roster member's lifecycle. Records only ever exist for non-pristine bodies. */
export const GROUP_STATE = Object.freeze({
  materialized: "materialized", // has a record, resting in the stack (not on canvas)
  deployed: "deployed", // a token exists for this member right now
  detached: "detached", // promoted out to a standalone actor; no longer a body of this group
  dead: "dead", // a casualty, retained for the after-action report
});

/** What the stack represents. Drives wages, morale, and default collective noun. */
export const GROUP_CATEGORY = Object.freeze({
  mercenary: "ACKS-LIB.group.category.mercenary",
  monster: "ACKS-LIB.group.category.monster",
  specialist: "ACKS-LIB.group.category.specialist",
  follower: "ACKS-LIB.group.category.follower",
});

export default class GroupData extends foundry.abstract.TypeDataModel {
  /**
   * Array paths, so a sheet's FormDataExtended (numeric-keyed objects) round-trips
   * back to arrays. The system's own models declare the same.
   */
  static ARRAY_PATHS = ["roster"];

  static defineSchema() {
    const { ArrayField, BooleanField, DocumentUUIDField, NumberField, ObjectField, SchemaField, StringField } =
      foundry.data.fields;
    const int = (initial, opts = {}) => new NumberField({ required: true, integer: true, initial, ...opts });
    const str = (opts = {}) => new StringField({ required: false, blank: true, initial: "", ...opts });
    // Money and wages: null = "not stated" (never 0, which would claim "free").
    const coin = () => new NumberField({ required: false, nullable: true, initial: null, min: 0 });

    return {
      // Schema-version marker, matching the system + animal convention so a
      // future migration can tell an unmigrated group from a current one.
      _schemaVersion: new NumberField({ required: true, initial: 0, integer: true, min: 0 }),

      /**
       * The stat block every member is a copy of. `uuid` points at a WORLD actor
       * (ActorDelta needs a real world base to merge onto — a compendium entry
       * cannot be that base), minted from `snapshot` on first deploy if absent.
       * `snapshot` is a cached `toObject()` so the group survives the source
       * being deleted, and so a player with no permission to the source still
       * sees what the group is.
       *
       * NAMED `template`, NOT `prototype`: Foundry blocks `prototype` (with
       * `__proto__` and `constructor`) as a forbidden key in dotted-path
       * expansion — a prototype-pollution guard — so a field named `prototype`
       * can never be written via `actor.update({"system.prototype.x": …})`; the
       * key is silently dropped. Verified live against acks 14.0.1.
       */
      template: new SchemaField({
        uuid: new DocumentUUIDField({ required: false, blank: true, nullable: true, initial: null }),
        type: str({ initial: "monster" }), // the base actor's type: monster | character | acks-lib.animal
        label: str(),
        snapshot: new ObjectField(),
        snapshotTime: int(0),
      }),

      size: new SchemaField({
        current: int(0, { min: 0 }), // living bodies
        initial: int(0, { min: 0 }),
        // Ecology seam (group.mjs sizeFromEcology): a dice formula, NOT auto-rolled.
        formula: str(),
      }),

      /**
       * The displayed collective noun is DATA, not a hardcoded word: a *pack* of
       * kobolds wandering, a *tribe* in its lair, a *unit* of mercenaries. Filled
       * from acks-monsters ecology (`encounter.*.noun`) or the unit category, and
       * always GM-overridable. Blank → the sheet falls back to a category default.
       */
      noun: str(),

      /**
       * THE SPARSE ROSTER. One entry per member that has diverged; pristine
       * bodies are absent by design (see the class comment's invariant).
       */
      roster: new ArrayField(
        new SchemaField({
          key: str(), // randomID, stable for the member's whole life
          ordinal: int(0), // "Kobold #7" — assigned once, never reused
          name: str(), // "" → prototype label + ordinal at display time
          // ActorDelta-shaped sparse override. Validated by ActorDelta when
          // applied to a token, not here — an ObjectField holds it verbatim.
          delta: new ObjectField(),
          state: new StringField({ required: true, initial: "materialized", choices: GROUP_STATE }),
          tokenUuid: str(), // while deployed
          actorUuid: str(), // if detached to a standalone actor
          note: str(), // free text for the report ("felled by the ogre")
        })
      ),

      /** Unit-level bookkeeping — the mercenary/specialist half. */
      unit: new SchemaField({
        category: new StringField({ required: true, initial: "monster", choices: GROUP_CATEGORY }),
        troopType: str(), // keys into the henchmen availability/wages tables
        wageGpEach: coin(),
        wageUnit: str({ initial: "month" }),
        employerUuid: str(),
        locationUuid: str(),
        // Unit morale / loyalty (mercenary side). Same signed range the system
        // uses for a monster's morale and a retainer's loyalty.
        morale: int(0, { min: -6, max: 4 }),
        loyalty: int(0, { min: -4, max: 4 }),
      }),

      // --- The representative individual (design §8). ---
      // The compat stubs are the FLOOR the system touches on every actor
      // (isNew, thac0, initiative, movement, a saves stub); savingThrowFields
      // then supplies the FULL five-save block (later keys win, so it upgrades
      // the stub's partial saves). hp/aac/details are declared explicitly so the
      // stack token shows one body's bar and an abstract-mode attack has a target.
      ...acksCompatStubs(),
      ...savingThrowFields(),
      hp: new SchemaField({
        hd: new StringField({ required: true, initial: "1d8", blank: false }),
        value: new NumberField({ required: true, initial: 4 }),
        max: new NumberField({ required: true, initial: 4 }),
        bhr: new StringField({ required: true, initial: "1d3", blank: false }),
      }),
      aac: new SchemaField({
        value: new NumberField({ initial: 0 }),
        mod: new NumberField({ initial: 0 }),
      }),
      details: new SchemaField({
        biography: new StringField({ blank: true, initial: "" }),
        alignment: new StringField({ blank: true, initial: "Neutral" }),
        xp: new NumberField({ initial: 0 }),
        morale: new NumberField({ integer: true, min: -6, max: 4, initial: 0 }),
      }),
    };
  }

  /**
   * The same two values the system derives for every actor, so a group is not
   * the one token on the table with an empty attack bonus or encounter speed.
   * Mirrors AnimalData.prepareDerivedData exactly.
   * @override
   */
  prepareDerivedData() {
    this.thac0.bba = 10 - (this.thac0.throw ?? 10);
    this.movement.encounter = Math.floor((this.movement.base ?? 0) / 3);
  }

  /* -------------------------------------------- */
  /*  Derived roster views (pure — safe offline)   */
  /* -------------------------------------------- */

  /** Members with a record that are still living bodies of this group. */
  get livingRecorded() {
    return this.roster.filter((m) => m.state === "materialized" || m.state === "deployed");
  }

  /**
   * Living bodies that have NO record — the sparse difference. Never negative:
   * a corrupt world where records outnumber the headcount reads as zero pristine
   * rather than a negative count.
   */
  get pristineCount() {
    return Math.max(0, (this.size.current ?? 0) - this.livingRecorded.length);
  }

  /** Casualties retained for the after-action report. */
  get dead() {
    return this.roster.filter((m) => m.state === "dead");
  }

  /**
   * The invariant that must always hold: every living-and-recorded member is a
   * living body, so the headcount cannot be smaller than the records claiming to
   * be alive. Callers assert this after any mutation; the sheet surfaces a
   * warning if a hand-edited world breaks it.
   */
  get invariantHolds() {
    return (this.size.current ?? 0) >= this.livingRecorded.length;
  }
}
