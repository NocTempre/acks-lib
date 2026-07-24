/* global game, foundry, ui, fromUuid, CONST */
/**
 * The `acks-lib.group` sheet.
 *
 * A group is not a creature you read a stat block off — it is a HEADCOUNT and a
 * ROSTER — so it gets its own sheet rather than the monster sheet an animal
 * borrows. The sheet shows the prototype, the living count (with the pristine
 * remainder made explicit), the members interesting enough to have a record,
 * and the fallen; its buttons drive the lifecycle in group.mjs.
 *
 * Editable fields submit to the actor through the default document-sheet
 * pipeline (they ARE `system.*` paths). The lifecycle buttons — deploy, recall,
 * casualties, detach — are actions that call group.mjs, which owns `size.current`
 * and the roster so the invariant is never edited into an inconsistent state.
 */
import { MODULE_ID } from "../constants.mjs";
import { GROUP_CATEGORY, GROUP_STATE } from "../data/group-data.mjs";
import * as groups from "../group.mjs";

const { HandlebarsApplicationMixin } = foundry.applications.api;

export const GROUP_TYPE = `${MODULE_ID}.group`;

export class GroupSheet extends HandlebarsApplicationMixin(foundry.applications.sheets.ActorSheetV2) {
  static DEFAULT_OPTIONS = {
    classes: ["acks-lib", "acks-lib-group-sheet"],
    position: { width: 560, height: 640 },
    window: { resizable: true },
    form: { submitOnChange: true, closeOnSubmit: false },
    actions: {
      deploy: GroupSheet.#onDeploy,
      recall: GroupSheet.#onRecall,
      materialize: GroupSheet.#onMaterialize,
      addCasualty: GroupSheet.#onAddCasualty,
      detach: GroupSheet.#onDetach,
      openMember: GroupSheet.#onOpenMember,
      deleteRecord: GroupSheet.#onDeleteRecord,
      clearPrototype: GroupSheet.#onClearPrototype,
    },
  };

  static PARTS = {
    body: { template: `modules/${MODULE_ID}/templates/group-sheet.hbs`, scrollable: [".acks-lib-group-body"] },
  };

  /** @override */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const sys = this.actor.system;
    const tmpl = sys.template ?? {};

    context.isGM = game.user.isGM;
    context.editable = this.isEditable;
    context.system = sys;
    context.template = tmpl;
    context.hasTemplate = !!(tmpl.uuid || tmpl.label);
    context.noun = sys.noun || this.#defaultNoun(sys);

    context.size = {
      current: sys.size.current ?? 0,
      initial: sys.size.initial ?? 0,
      pristine: sys.pristineCount,
    };
    context.invariantBroken = !sys.invariantHolds;

    const view = (m) => ({
      key: m.key,
      ordinal: m.ordinal,
      name: groups.memberName(sys, m),
      state: m.state,
      note: m.note,
      hp: m.delta?.system?.hp ?? null,
      hasActor: !!m.actorUuid,
    });
    context.members = sys.livingRecorded.map(view).sort((a, b) => a.ordinal - b.ordinal);
    context.dead = sys.dead.map(view).sort((a, b) => a.ordinal - b.ordinal);
    context.detached = sys.roster.filter((m) => m.state === GROUP_STATE.detached).map(view);

    // Category choices for the select: {key: localized label}.
    context.categories = Object.fromEntries(
      Object.entries(GROUP_CATEGORY).map(([k, label]) => [k, game.i18n.has(label) ? game.i18n.localize(label) : k])
    );
    return context;
  }

  #defaultNoun(sys) {
    const cat = sys.unit?.category;
    const key = `ACKS-LIB.group.noun.${cat || "monster"}`;
    return game.i18n.has(key) ? game.i18n.localize(key) : "group";
  }

  /**
   * @override — bind actor drag-drop the way the family's other ActorSheetV2
   * sheets do (formation's PartySheet), rather than overriding _onDrop: an Actor
   * dropped on the sheet becomes the prototype.
   */
  async _onRender(context, options) {
    await super._onRender(context, options);
    if (!this.isEditable) return;
    new foundry.applications.ux.DragDrop.implementation({
      permissions: { drop: () => this.isEditable },
      callbacks: { drop: (event) => this.#onDropActor(event) },
    }).bind(this.element);
  }

  async #onDropActor(event) {
    const data = foundry.applications.ux.TextEditor.implementation.getDragEventData(event);
    if (data?.type !== "Actor") return;
    const source = await foundry.utils.getDocumentClass("Actor").fromDropData(data);
    if (!source) return;
    if (source.uuid === this.actor.uuid || groups.isGroup(source)) {
      return ui.notifications.warn(game.i18n.localize("ACKS-LIB.group.warn.badPrototype"));
    }
    await groups.setPrototype(this.actor, source);
    ui.notifications.info(game.i18n.format("ACKS-LIB.group.info.prototypeSet", { name: source.name }));
    this.render();
  }

  /* -------------------------------------------- */
  /*  Actions                                     */
  /* -------------------------------------------- */

  #count(fallback = 1) {
    const input = this.element?.querySelector("input.deploy-count");
    const n = Number(input?.value);
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
  }

  static async #onDeploy() {
    const scene = game.scenes?.viewed;
    if (!scene) return ui.notifications.warn(game.i18n.localize("ACKS-LIB.group.warn.noScene"));
    const token = scene.tokens.find((t) => t.actorId === this.actor.id);
    const x = token?.x ?? Math.floor((scene.width ?? 0) / 2);
    const y = token?.y ?? Math.floor((scene.height ?? 0) / 2);
    const made = await groups.deploy(this.actor, scene, { count: this.#count(), x, y });
    ui.notifications.info(game.i18n.format("ACKS-LIB.group.info.deployed", { n: made.length }));
    this.render();
  }

  static async #onRecall() {
    const { recalled, casualties } = await groups.recall(this.actor);
    ui.notifications.info(game.i18n.format("ACKS-LIB.group.info.recalled", { n: recalled, dead: casualties }));
    this.render();
  }

  static async #onMaterialize() {
    const member = await groups.materializeMember(this.actor);
    if (!member) ui.notifications.warn(game.i18n.localize("ACKS-LIB.group.warn.noPristine"));
    this.render();
  }

  static async #onAddCasualty() {
    const n = await groups.applyCasualties(this.actor, this.#count());
    if (!n) ui.notifications.warn(game.i18n.localize("ACKS-LIB.group.warn.noBodies"));
    this.render();
  }

  static async #onDetach(event, target) {
    const key = target.closest("[data-member-key]")?.dataset.memberKey;
    if (!key) return;
    const actor = await groups.detach(this.actor, key);
    if (actor) {
      actor.sheet.render(true);
      ui.notifications.info(game.i18n.format("ACKS-LIB.group.info.detached", { name: actor.name }));
    }
    this.render();
  }

  static async #onOpenMember(event, target) {
    const key = target.closest("[data-member-key]")?.dataset.memberKey;
    const member = this.actor.system.roster.find((m) => m.key === key);
    if (member?.actorUuid) {
      const actor = await fromUuid(member.actorUuid);
      actor?.sheet?.render(true);
    }
  }

  static async #onDeleteRecord(event, target) {
    const key = target.closest("[data-member-key]")?.dataset.memberKey;
    if (!key) return;
    // Dropping a DEAD or DETACHED record is pure bookkeeping — it never touches
    // size.current (those bodies already left the headcount).
    const roster = this.actor.system.toObject().roster.filter((m) => m.key !== key);
    await this.actor.update({ "system.roster": roster });
    this.render();
  }

  static async #onClearPrototype() {
    await this.actor.update({
      "system.template.uuid": null,
      "system.template.label": "",
      "system.template.snapshot": {},
    });
    this.render();
  }
}
