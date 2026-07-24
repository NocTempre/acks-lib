/* global game, foundry, ui, Actor, fromUuid */
/**
 * The `acks-lib.template` BUILDER sheet.
 *
 * A template is not a creature — it is the book's generation procedure held as
 * a document — so its sheet is a builder: one select per axis (defaulting to
 * "Roll", the book's own procedure), a drop zone for an optional BASE actor
 * (the vampire thrall's victim), and Generate. Pins and the base are
 * per-window UI state, never actor data: closing the sheet forgets them, the
 * template document stays pure.
 *
 * Generation itself is the pure half (template-logic.mjs): pinned > derived >
 * rolled, merged into one engine-ready payload, created as ONE actor. The
 * provenance rides in `flags["acks-lib"].generated` so a sheet can later say
 * "derived from Dragon (Adult · Wyvern)".
 */
import { MODULE_ID } from "../constants.mjs";
import { chooseAxes, resolveActor, rollMenu } from "../template-logic.mjs";
import { hitDiceOrLevel } from "../actor-read.mjs";

const { HandlebarsApplicationMixin } = foundry.applications.api;

export const TEMPLATE_TYPE = `${MODULE_ID}.template`;

export class TemplateSheet extends HandlebarsApplicationMixin(foundry.applications.sheets.ActorSheetV2) {
  static DEFAULT_OPTIONS = {
    classes: ["acks-lib", "acks-lib-template-sheet"],
    position: { width: 520, height: 600 },
    window: { resizable: true },
    form: { submitOnChange: true, closeOnSubmit: false },
    actions: {
      generate: TemplateSheet.#onGenerate,
      clearBase: TemplateSheet.#onClearBase,
    },
  };

  static PARTS = {
    body: { template: `modules/${MODULE_ID}/templates/template-sheet.hbs`, scrollable: [".acks-lib-template-body"] },
  };

  /** Per-window build state (never persisted): axis pins + the dropped base. */
  #pins = {};
  #baseUuid = null;
  #baseName = "";

  /** @override */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const sys = this.actor.system;
    context.editable = this.isEditable;
    context.system = sys;
    context.isStub = sys.isStub;
    context.base = this.#baseUuid ? { uuid: this.#baseUuid, name: this.#baseName } : null;

    context.axes = (sys.axes ?? []).map((axis) => ({
      key: axis.key,
      label: axis.label || axis.key,
      rollLabel: axis.roll
        ? game.i18n.format("ACKS-LIB.template.rollDie", { die: axis.roll })
        : game.i18n.localize("ACKS-LIB.template.rollUniform"),
      derived: !!axis.derive?.from && !!this.#baseUuid,
      pinned: this.#pins[axis.key] ?? "",
      options: (axis.options ?? []).map((o) => ({
        key: o.key,
        label: o.label || o.key,
        selected: (this.#pins[axis.key] ?? "") === o.key,
      })),
    }));

    const budgetAxis = sys.menu?.budgetAxis;
    context.hasMenu = !!(sys.menu?.rows ?? []).length;
    context.menuNote = context.hasMenu
      ? game.i18n.format("ACKS-LIB.template.menuNote", { n: sys.menu.rows.length, axis: budgetAxis || "?" })
      : "";

    context.biographyHTML = await foundry.applications.ux.TextEditor.implementation.enrichHTML(
      sys.details?.biography ?? "",
      { relativeTo: this.actor, secrets: this.actor.isOwner }
    );
    return context;
  }

  /** @override — record pin changes; they are UI state, not document fields. */
  async _onRender(context, options) {
    await super._onRender(context, options);
    for (const sel of this.element.querySelectorAll("select.acks-lib-template-pin")) {
      sel.addEventListener("change", (ev) => {
        const key = ev.currentTarget.dataset.axis;
        const value = ev.currentTarget.value;
        if (value) this.#pins[key] = value;
        else delete this.#pins[key];
      });
    }
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
    if (!source || source.uuid === this.actor.uuid) return;
    this.#baseUuid = source.uuid;
    this.#baseName = source.name;
    ui.notifications.info(game.i18n.format("ACKS-LIB.template.baseSet", { name: source.name }));
    this.render();
  }

  static async #onClearBase() {
    this.#baseUuid = null;
    this.#baseName = "";
    this.render();
  }

  static async #onGenerate() {
    const sys = this.actor.system;
    if (sys.isStub) return ui.notifications.warn(game.i18n.localize("ACKS-LIB.template.warn.stub"));

    // Values an axis may derive from a dropped base (the thrall's victim HD).
    let base = null;
    const baseValues = {};
    if (this.#baseUuid) {
      base = await fromUuid(this.#baseUuid);
      if (base) {
        const hd = hitDiceOrLevel(base);
        if (hd != null) baseValues.hd = hd;
      }
    }

    const { choices, log } = chooseAxes(sys, { pinned: this.#pins, baseValues });
    const resolved = resolveActor(sys, choices, { baseName: base?.name ?? "", templateName: this.actor.name });

    // The rolled ability menu: budget printed on the budget axis's chosen row.
    let menuPicks = [];
    if ((sys.menu?.rows ?? []).length) {
      const axis = (sys.axes ?? []).find((a) => a.key === sys.menu.budgetAxis);
      const option = axis?.options?.find((o) => o.key === choices[axis.key]);
      const budget = option?.menuBudget ?? 0;
      menuPicks = rollMenu(sys.menu, budget).picks;
    }

    // Description: the option snippets, then the rolled abilities — each a
    // lazy tag the importer authored; a bookless viewer sees stubs, as ever.
    const htmlParts = [...resolved.htmlParts];
    for (const pick of menuPicks) {
      htmlParts.push(pick.html || `<p>${pick.label}</p>`);
    }
    const biography = htmlParts.join("");

    const type = sys.output?.actorType || "monster";
    const system = resolved.system;
    if (biography) {
      system.details = { ...(system.details ?? {}), biography: `${system.details?.biography ?? ""}${biography}` };
    }

    const created = await Actor.create({
      name: resolved.name || this.actor.name,
      type,
      folder: this.actor.folder?.id ?? null,
      ...(resolved.art ? { img: resolved.art, prototypeToken: { texture: { src: resolved.art } } } : {}),
      system,
      items: resolved.items,
      flags: {
        [MODULE_ID]: {
          generated: {
            templateUuid: this.actor.uuid,
            choices,
            log,
            menu: menuPicks.map((p) => p.label),
          },
        },
      },
    });
    if (!created) {
      return ui.notifications.warn(game.i18n.localize("ACKS-LIB.template.warn.rejected"));
    }
    ui.notifications.info(game.i18n.format("ACKS-LIB.template.info.generated", { name: created.name }));
    created.sheet?.render(true);
  }
}
