const MODULE_ID = "delta-green-clues";
const CLUE_TYPE = `${MODULE_ID}.clue`;
const { StringField } = foundry.data.fields;
const { ActorSheetV2 } = foundry.applications.sheets;
const { HandlebarsApplicationMixin } = foundry.applications.api;

class ClueDataModel extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      linkedJournalUuid: new StringField({ initial: "", blank: true, nullable: false })
    };
  }
}

function canEditDocument(document) {
  return game.user.isGM || document?.testUserPermission(game.user, "OWNER");
}

function journalOptions() {
  const options = [];
  for (const journal of game.journal) {
    if (!canEditDocument(journal)) continue;
    options.push({ value: journal.uuid, label: journal.name });
    for (const page of journal.pages) {
      options.push({ value: page.uuid, label: `${journal.name} — ${page.name}` });
    }
  }
  return options;
}

async function openLinkedHandout(actor) {
  const uuid = actor.system.linkedJournalUuid;
  if (!uuid) return ui.notifications.warn("This clue has no linked handout.");
  const linked = await fromUuid(uuid);
  if (!linked || !linked.testUserPermission(game.user, "OBSERVER")) {
    return ui.notifications.warn("You do not have permission to view this clue's linked handout.");
  }
  linked.sheet.render(true);
}

class ClueSheet extends HandlebarsApplicationMixin(ActorSheetV2) {
  static DEFAULT_OPTIONS = {
    classes: [MODULE_ID, "sheet", "clue-sheet"],
    position: { width: 460, height: "auto" },
    window: { title: "Clue Card", icon: "fa-solid fa-magnifying-glass", resizable: true },
    form: { submitOnChange: true, closeOnSubmit: false },
    actions: {
      openHandout: ClueSheet.openHandout,
      unlinkHandout: ClueSheet.unlinkHandout
    }
  };

  static PARTS = {
    form: { template: `modules/${MODULE_ID}/templates/clue-sheet.hbs`, root: true }
  };

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const linkedJournalUuid = this.actor.system.linkedJournalUuid;
    let linkedJournalName = "";
    if (linkedJournalUuid) {
      const linked = await fromUuid(linkedJournalUuid);
      if (linked && linked.testUserPermission(game.user, "OBSERVER")) {
        linkedJournalName = linked.documentName === "JournalEntryPage" ? `${linked.parent.name} — ${linked.name}` : linked.name;
      }
    }
    return {
      ...context,
      actor: this.actor,
      editable: this.isEditable,
      journalOptions: journalOptions(),
      linkedJournalUuid,
      linkedJournalName
    };
  }

  static async openHandout(_event, target) {
    return openLinkedHandout(this.actor);
  }

  static async unlinkHandout() {
    if (!this.isEditable) return;
    await this.actor.update({ "system.linkedJournalUuid": "" });
  }
}

function installClueTokenDoubleClick() {
  // CONFIG.Token.objectClass is the live canvas Token class. Using that rather
  // than an imported namespace keeps this compatible with systems that extend
  // Foundry's standard token placeable.
  // Prefer the class of a live canvas token. This is the exact prototype that
  // receives clicks, including when a game system provides its own Token class.
  const TokenClass = globalThis.canvas?.tokens?.placeables?.[0]?.constructor
    ?? CONFIG.Token?.objectClass
    ?? foundry.canvas?.placeables?.Token;
  if (!TokenClass?.prototype) {
    console.warn(`${MODULE_ID} | Could not locate the Token placeable class to install the clue handout handler.`);
    return false;
  }

  const wrapped = Symbol.for(`${MODULE_ID}.clueDoubleClickWrapped`);
  if (TokenClass.prototype[wrapped]) return true;

  const originalDoubleClick = TokenClass.prototype._onClickLeft2;
  if (typeof originalDoubleClick !== "function") {
    console.warn(`${MODULE_ID} | Token double-click handler was not found.`);
    return false;
  }

  TokenClass.prototype._onClickLeft2 = function clueTokenDoubleClick(event) {
    if (this.actor?.type !== CLUE_TYPE) return originalDoubleClick.call(this, event);
    if (!this._propagateLeftClick(event)) event.stopPropagation();
    void openLinkedHandout(this.actor);
  };
  Object.defineProperty(TokenClass.prototype, wrapped, { value: true });
  console.info(`${MODULE_ID} | Clue token double-clicks now open linked handouts.`);
  return true;
}

function installClueCreateDialogType() {
  const ActorClass = CONFIG.Actor?.documentClass;
  if (!ActorClass?.createDialog) {
    console.warn(`${MODULE_ID} | Could not locate the Actor create dialog.`);
    return false;
  }

  const wrapped = Symbol.for(`${MODULE_ID}.clueCreateDialogWrapped`);
  if (ActorClass[wrapped]) return true;

  const originalCreateDialog = ActorClass.createDialog;
  ActorClass.createDialog = function clueCreateDialog(data = {}, options = {}, dialogOptions = {}) {
    // Some systems (including PF2e) replace Foundry's default type list when
    // opening this dialog. Preserve their choices and append our module type.
    const availableTypes = dialogOptions.types
      ?? Object.keys(CONFIG.Actor.typeLabels);
    const types = new Set(availableTypes);
    types.add(CLUE_TYPE);
    return originalCreateDialog.call(this, data, options, { ...dialogOptions, types: [...types] });
  };
  Object.defineProperty(ActorClass, wrapped, { value: true });
  return true;
}

Hooks.once("init", () => {
  CONFIG.Actor.dataModels[CLUE_TYPE] = ClueDataModel;
  installClueCreateDialogType();
  Actors.registerSheet(MODULE_ID, ClueSheet, {
    types: [CLUE_TYPE],
    makeDefault: true,
    label: "DGCLUES.Sheet.Title"
  });
});

Hooks.once("ready", () => {
  installClueTokenDoubleClick();
  console.info(`${MODULE_ID} | Clue Actor type is ready.`);
});

Hooks.once("canvasReady", () => {
  installClueTokenDoubleClick();
});
