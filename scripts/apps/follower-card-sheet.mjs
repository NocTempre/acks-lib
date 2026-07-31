/* global foundry, game, ui, CONFIG, document */
/**
 * FollowerCardSheet — the compact "Follower Card" as an actor's own sheet.
 *
 * Registered (at `ready`, in module.mjs) for `character` and `monster` as an
 * ALTERNATIVE sheet — never makeDefault, so PCs and wild monsters keep their full
 * system sheet. acks-lib makes it the per-instance default for retainers
 * (flags.core.sheetClass), so a hireling opens as the card. The injected
 * "Expand / details" header button resolves and opens the full system sheet for
 * everything the card does not cover (items, spells, effects, deep monster stats).
 *
 * The card is the SAME template the hirelings-tab grid uses, rendered here in its
 * `editable` mode: the essentials (name, scores, hp, class/level/xp, alignment,
 * morale, loyalty, notes) submit through this sheet's own form; derived values
 * (mods, AC, encumbrance, attack numbers) are display-only.
 */
import { followerCardContext, FOLLOWER_CARD_TEMPLATE } from "../follower-card.mjs";

export class FollowerCardSheet extends foundry.applications.api.HandlebarsApplicationMixin(
  foundry.applications.sheets.ActorSheetV2,
) {
  static DEFAULT_OPTIONS = {
    classes: ["acks", "acks-lib-follower-card-sheet"],
    position: { width: 600, height: 640 },
    window: { resizable: true },
    form: { submitOnChange: true, closeOnSubmit: false },
    actions: {
      fcToggleEquip: FollowerCardSheet.#onToggleEquip,
      fcRollProficiency: FollowerCardSheet.#onRollProficiency,
      fcRollAttack: FollowerCardSheet.#onRollAttack,
      fcResetAc: FollowerCardSheet.#onResetAc,
    },
  };

  static PARTS = {
    card: { template: FOLLOWER_CARD_TEMPLATE, scrollable: [".acks-lib-follower-card"] },
  };

  /** @override */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    return { ...context, ...followerCardContext(this.actor, { editable: this.isEditable }) };
  }

  /** @override — inject a visible "Expand / details" button into the header. */
  async _onRender(context, options) {
    await super._onRender(context, options);

    // The AC bucket writes the EFFECTIVE AC: a character adjusts aac.mod (so
    // core's computeAC lands on the typed value and Reset zeroes it); a monster's
    // AC is stored, so it writes aac.value directly. It carries no name=, so it is
    // not a form field and must not ride submitOnChange.
    this.element?.querySelector("input[data-fc-ac]")?.addEventListener("change", (ev) => this.#onAcInput(ev));

    const header = this.element?.querySelector(".window-header");
    if (!header || header.querySelector(".acks-lib-fc-expand")) return;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "header-control icon fa-solid fa-up-right-from-square acks-lib-fc-expand";
    btn.dataset.tooltip = game.i18n.localize("ACKS-LIB.followerCard.expand");
    btn.addEventListener("click", () => this.#openFull());
    const close = header.querySelector('[data-action="close"]');
    if (close) header.insertBefore(btn, close);
    else header.append(btn);
  }

  /** Open the full system sheet for this actor's type — never this card. */
  #openFull() {
    const entries = Object.values(CONFIG.Actor?.sheetClasses?.[this.actor.type] ?? {});
    const other = entries.filter((e) => e.cls !== FollowerCardSheet);
    const full = (other.find((e) => e.default) ?? other[0])?.cls ?? null;
    if (!full) {
      ui.notifications.warn(game.i18n.localize("ACKS-LIB.followerCard.noFullSheet"));
      return;
    }
    new full({ document: this.actor }).render(true);
  }

  /* -------------------------------------------- */
  /*  Card actions                                */
  /* -------------------------------------------- */

  /** Toggle a weapon/armour item's worn/wielded state. */
  static async #onToggleEquip(_event, target) {
    const item = this.actor.items.get(target.dataset.itemId);
    if (item && "equipped" in (item.system ?? {})) {
      await item.update({ "system.equipped": !item.system.equipped });
    }
  }

  /** Roll a proficiency/power the way the system does (formula, else show). */
  static #onRollProficiency(event, target) {
    const item = this.actor.items.get(target.dataset.itemId);
    if (!item) return;
    if (item.system?.roll) item.rollFormula?.({ event });
    else item.show?.();
  }

  /** Roll a melee/missile (or monster) attack — mirrors the core sheet. */
  static #onRollAttack(event, target) {
    const type = target.dataset.attack || "melee";
    let skip = false;
    try {
      skip = !!event?.[game.settings.get("acks", "skip-dialog-key")];
    } catch {
      /* setting absent — show the dialog */
    }
    this.actor.targetAttack?.({ actor: this.actor, roll: {} }, type, { type, skipDialog: skip });
  }

  /** Reset a character's AC to its computed base (clears the manual adjustment). */
  static async #onResetAc() {
    if (this.actor.type === "monster") return;
    await this.actor.update({ "system.aac.mod": 0 });
  }

  /** AC bucket change (wired in _onRender — not a form field). */
  async #onAcInput(ev) {
    ev.stopPropagation();
    const v = Math.round(Number(ev.target.value));
    if (!Number.isFinite(v)) return;
    if (this.actor.type === "monster") {
      await this.actor.update({ "system.aac.value": v });
    } else {
      const sys = this.actor.system;
      const base = Number(sys.aac?.value ?? 0) - Number(sys.aac?.mod ?? 0);
      await this.actor.update({ "system.aac.mod": v - base });
    }
  }
}
