/* global foundry */
/**
 * System compatibility stubs for module-provided actor sub-types.
 *
 * The acks system's `AcksActor` document class runs for EVERY actor, and a few
 * of its methods touch fields unguarded (the rest bail on `type !== "character"`):
 *
 *  - `computeAAB`               — `thac0.bba = 10 - thac0.throw`
 *  - `computeAdditionnalData`   — `initiative.value`, `movement.encounter`
 *                                 (derived from `movement.base`)
 *  - `AcksActor.create`         — seeds `system.isNew`
 *  - the setup-time `updateWeightsLanguages` sweep, whose `updateImplements()`
 *    reads `system.saves.implements` / `.wand` on every actor in the world.
 *    Without the stub it throws and aborts the system's own ready work — so a
 *    single module actor with an incomplete schema breaks the whole world, not
 *    just that actor.
 *
 * So any actor sub-type a module registers must carry these fields whether or
 * not they mean anything for it. This is the family's ONE definition of that
 * set: acks-domains, acks-formation and acks-henchmen each grew their own copy
 * (four in total, already drifting), and a system patch that four modules
 * maintain separately is one system update away from three of them being wrong.
 *
 * `saves` values are 0 rather than -1 deliberately: that makes the system's
 * implements/wand migration a no-op on these actors.
 *
 * @see docs/API.md — "actorCompat"
 */

const F = () => foundry.data.fields;
const int = (initial) => new (F().NumberField)({ required: true, integer: true, initial });

/**
 * The fields the system touches on every actor.
 *
 * Spread into a sub-type's `defineSchema()`. A sub-type that has a REAL value
 * for one of these (an animal genuinely has movement and saving throws) should
 * spread this first and then declare its own — later keys win, so the stub is
 * only ever a floor.
 *
 * @returns {object} schema fields
 */
export function acksCompatStubs() {
  const { BooleanField, SchemaField } = F();
  return {
    isNew: new BooleanField({ initial: false }),
    thac0: new SchemaField({
      throw: int(10),
      bba: int(0),
    }),
    initiative: new SchemaField({
      value: int(0),
      mod: int(0),
    }),
    movement: new SchemaField({
      base: int(0),
      encounter: int(0),
    }),
    saves: new SchemaField({
      implements: new SchemaField({ value: int(0) }),
      wand: new SchemaField({ value: int(0) }),
    }),
  };
}

/**
 * The system's five saving throws, for a sub-type that actually saves.
 *
 * Separate from the stubs above because most module actors (a domain, a party,
 * a location) never save and should not pretend to — but a creature does, and
 * it needs the same field paths the system's own monsters use so anything
 * reading a monster's saves reads an animal's identically.
 *
 * @returns {object} schema fields
 */
export function savingThrowFields() {
  const { NumberField, SchemaField } = F();
  // Initials mirror the system's own SavingThrowsTemplate exactly, so an animal
  // rolled straight out of the box saves like any other fresh creature rather
  // than at some number this library invented.
  const save = (initial) => new SchemaField({ value: new NumberField({ required: true, initial }) });
  return {
    saves: new SchemaField({
      paralysis: save(13),
      death: save(14),
      blast: save(15),
      implements: save(16),
      spell: save(17),
    }),
    save: new SchemaField({ mod: new NumberField({ initial: 0 }) }),
  };
}
