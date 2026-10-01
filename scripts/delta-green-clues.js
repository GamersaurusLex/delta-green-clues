const MODULE_ID = "delta-green-clues";
const CLUE_TYPE = `${MODULE_ID}.clue`;
const CLUE_FLAG = "isClue";
const LINKED_JOURNAL_FLAG = "linkedJournalUuid";
const CLUE_SHEET_ID = `${MODULE_ID}.ClueSheet`;
const BOARD_CATEGORY_FLAG = "boardCategory";
const PERSON_CLASSIFICATION_FLAG = "personClassification";
const CLASSIFICATION_PIN_SIZE_SETTING = "classificationPinSize";
const CLASSIFICATION_PIN_VERTICAL_OFFSET_SETTING = "classificationPinVerticalOffset";
const DEFAULT_CLASSIFICATION_PIN_SIZE = 19;
const PIN_SIZE_ADJUSTMENT_FLAG = "pinSizeAdjustment";
const PIN_VERTICAL_ADJUSTMENT_FLAG = "pinVerticalAdjustment";
const QUESTION_NOTE_COLOR_FLAG = "questionNoteColor";
const QUESTION_NOTE_VARIANT_FLAG = "questionNoteVariant";
const QUESTION_NOTE_KIND_FLAG = "questionNoteKind";
const QUESTION_NOTE_TILE_ID_FLAG = "questionNoteTileId";
const QUESTION_NOTE_DRAWING_ID_FLAG = "questionNoteDrawingId";
const QUESTION_NOTE_TEXT_INSET_FLAG = "questionNoteTextInset";
const STICKY_NOTE_COLOR_SETTING = "stickyNoteColor";
const STICKY_NOTE_STYLE_SETTING = "stickyNoteStyle";
const INDEX_CARD_COLOR_SETTING = "indexCardColor";
const INDEX_CARD_STYLE_SETTING = "indexCardStyle";
const QUESTION_NOTE_TEXT_INSET_SETTING = "questionNoteTextInset";
const MURDERBOARD_FLAG = "isMurderboard";
const DASHBOARD_FOLDER_IDS_SETTING = "dashboardFolderIds";
const { ApplicationV2, HandlebarsApplicationMixin, DialogV2 } = foundry.applications.api;
const DEFAULT_QUESTION_NOTE_TEXT_INSET = 20;
const { StringField } = foundry.data.fields;
const { ActorSheetV2 } = foundry.applications.sheets;

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

/**
 * PF2e deliberately rejects all module-defined Actor subtypes.  The closest
 * supported equivalent is a normal NPC Actor identified with module flags.
 * It retains every native Actor-directory, ownership, and Token behavior,
 * while our own sheet supplies the clue-card experience.
 */
function needsNativeActorFallback() {
  return game.system.id === "pf2e";
}

function fallbackActorType() {
  return ["npc", "loot", "character"].find((type) => CONFIG.Actor.typeLabels?.[type]) ?? "npc";
}

function isClueActor(actor) {
  return actor?.type === CLUE_TYPE || actor?.getFlag(MODULE_ID, CLUE_FLAG) === true;
}

function linkedJournalUuid(actor) {
  return actor?.type === CLUE_TYPE
    ? actor.system?.linkedJournalUuid ?? ""
    : actor?.getFlag(MODULE_ID, LINKED_JOURNAL_FLAG) ?? "";
}

function linkedJournalUpdate(actor, uuid) {
  return actor?.type === CLUE_TYPE
    ? { "system.linkedJournalUuid": uuid }
    : { [`flags.${MODULE_ID}.${LINKED_JOURNAL_FLAG}`]: uuid };
}

const BOARD_CATEGORIES = [
  { value: "", label: "Uncategorized" },
  { value: "people", label: "People" },
  { value: "places", label: "Places" },
  { value: "evidence", label: "Evidence" },
  { value: "questions", label: "Questions" }
];

const PERSON_CLASSIFICATIONS = [
  { id: "", label: "Clear Classification", icon: "fa-ban", cssClass: "" },
  { id: "suspect", label: "Suspect / Threat", icon: "fa-thumbtack", cssClass: "classification-suspect" },
  { id: "friendly", label: "Friendly", icon: "fa-thumbtack", cssClass: "classification-friendly" },
  { id: "witness", label: "Witness / Contact", icon: "fa-thumbtack", cssClass: "classification-witness" },
  { id: "victim", label: "Victim / Missing", icon: "fa-thumbtack", cssClass: "classification-victim" }
];

const QUESTION_NOTE_KINDS = {
  sticky: {
    label: "Sticky Note",
    colors: {
      blue: "Blue", green: "Green", "light-yellow": "Light Yellow", peach: "Peach",
      pink: "Pink", purple: "Purple", white: "White", yellow: "Yellow"
    },
    variants: { flat: "Flat", flip: "Flip" },
    width: 420,
    height: 420,
    font: "DG Patrick Hand",
    text: "#2b2417"
  },
  index: {
    label: "Index Card",
    colors: { blue: "Blue", green: "Green", pink: "Pink", purple: "Purple", white: "White", yellow: "Yellow" },
    variants: { blank: "Blank", coffee: "Coffee Stains", grunge: "Grunge" },
    width: 560,
    height: 398,
    font: "DG Kalam",
    text: "#26211c"
  }
};

function questionNoteStyle(kind, color, variant) {
  const definition = QUESTION_NOTE_KINDS[kind];
  if (!definition) return null;
  const safeColor = definition.colors[color] ? color : Object.keys(definition.colors)[0];
  const safeVariant = definition.variants[variant] ? variant : Object.keys(definition.variants)[0];
  return {
    ...definition,
    kind,
    color: safeColor,
    variant: safeVariant,
    texture: `modules/${MODULE_ID}/assets/question-notes/${kind}/${safeColor}-${safeVariant}.webp`
  };
}

function questionNoteDefaults(kind) {
  const settings = kind === "sticky"
    ? { color: STICKY_NOTE_COLOR_SETTING, variant: STICKY_NOTE_STYLE_SETTING }
    : { color: INDEX_CARD_COLOR_SETTING, variant: INDEX_CARD_STYLE_SETTING };
  return questionNoteStyle(kind, game.settings.get(MODULE_ID, settings.color), game.settings.get(MODULE_ID, settings.variant));
}

function questionNoteOptions(choices, selected) {
  return Object.entries(choices).map(([value, label]) =>
    `<option value="${value}"${value === selected ? " selected" : ""}>${label}</option>`
  ).join("");
}

function questionNotePicker(kind, style, { includeText = false } = {}) {
  const textField = includeText
    ? '<div class="form-group"><label>Question or Note</label><div class="form-fields"><textarea name="text" rows="5" autofocus placeholder="Write the question, theory, or reminder…"></textarea></div></div>'
    : "";
  return `${textField}
    <div class="form-group"><label>Color</label><div class="form-fields"><select name="flags.${MODULE_ID}.${QUESTION_NOTE_COLOR_FLAG}">${questionNoteOptions(style.colors, style.color)}</select></div></div>
    <div class="form-group"><label>${kind === "sticky" ? "Style" : "Condition"}</label><div class="form-fields"><select name="flags.${MODULE_ID}.${QUESTION_NOTE_VARIANT_FLAG}">${questionNoteOptions(style.variants, style.variant)}</select></div></div>`;
}

function clueBoardCategory(actor, tokenDocument) {
  return tokenDocument?.getFlag(MODULE_ID, BOARD_CATEGORY_FLAG)
    ?? actor?.getFlag(MODULE_ID, BOARD_CATEGORY_FLAG)
    ?? "";
}

function personClassification(tokenDocument) {
  return tokenDocument?.getFlag(MODULE_ID, PERSON_CLASSIFICATION_FLAG) ?? "";
}

function classificationPinSize() {
  const size = Number(game.settings.get(MODULE_ID, CLASSIFICATION_PIN_SIZE_SETTING));
  return Number.isFinite(size) ? Math.min(64, Math.max(12, size)) : DEFAULT_CLASSIFICATION_PIN_SIZE;
}

function classificationPinVerticalOffset() {
  const offset = Number(game.settings.get(MODULE_ID, CLASSIFICATION_PIN_VERTICAL_OFFSET_SETTING));
  return Number.isFinite(offset) ? Math.min(48, Math.max(-48, offset)) : 0;
}

function tokenPinAdjustment(tokenDocument, flag) {
  const adjustment = Number(tokenDocument?.getFlag(MODULE_ID, flag));
  return Number.isFinite(adjustment) ? adjustment : 0;
}

function addPrototypePinAppearanceFields(app, html) {
  const root = html instanceof HTMLElement ? html : html?.[0] ?? null;
  if (!root || root.querySelector(`[name="flags.${MODULE_ID}.${PIN_SIZE_ADJUSTMENT_FLAG}"]`)) return;

  const tokenDocument = app.token ?? app.document ?? app.object;
  if (!tokenDocument?.getFlag) return;

  const sizeAdjustment = tokenPinAdjustment(tokenDocument, PIN_SIZE_ADJUSTMENT_FLAG);
  const verticalAdjustment = tokenPinAdjustment(tokenDocument, PIN_VERTICAL_ADJUSTMENT_FLAG);
  const field = document.createElement("div");
  field.classList.add("form-group", "dg-clue-pin-adjustment-fields");
  field.innerHTML = `
    <label>Clue Pin Adjustments</label>
    <div class="form-fields">
      <label class="checkbox-label">Size <input type="number" name="flags.${MODULE_ID}.${PIN_SIZE_ADJUSTMENT_FLAG}" value="${sizeAdjustment}" min="-18" max="48" step="1"></label>
      <label class="checkbox-label">Vertical <input type="number" name="flags.${MODULE_ID}.${PIN_VERTICAL_ADJUSTMENT_FLAG}" value="${verticalAdjustment}" min="-48" max="48" step="1"></label>
    </div>
    <p class="hint">Adjust this Clue Actor's pin in scene pixels. Size: positive is larger. Vertical: positive moves down.</p>`;

  const appearanceTab = root.querySelector('.tab[data-tab="appearance"]');
  const insertionPoint = root.querySelector(".dg-handwriting-font-field")
    ?? appearanceTab?.querySelector('[name="texture.src"]')?.closest(".form-group");
  if (insertionPoint) insertionPoint.insertAdjacentElement("afterend", field);
  else (appearanceTab ?? root.querySelector("form") ?? root).append(field);
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
  const uuid = linkedJournalUuid(actor);
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

  get title() {
    return `Clue: ${this.actor.name}`;
  }

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const uuid = linkedJournalUuid(this.actor);
    let linkedJournalName = "";
    if (uuid) {
      const linked = await fromUuid(uuid);
      if (linked && linked.testUserPermission(game.user, "OBSERVER")) {
        linkedJournalName = linked.documentName === "JournalEntryPage" ? `${linked.parent.name} — ${linked.name}` : linked.name;
      }
    }
    return {
      ...context,
      actor: this.actor,
      editable: this.isEditable,
      journalOptions: journalOptions(),
      linkedJournalUuid: uuid,
      linkedJournalName,
      boardCategories: BOARD_CATEGORIES,
      clueBoardCategory: clueBoardCategory(this.actor),
      linkedJournalField: this.actor.type === CLUE_TYPE
        ? "system.linkedJournalUuid"
        : `flags.${MODULE_ID}.${LINKED_JOURNAL_FLAG}`
    };
  }

  static async openHandout(_event, target) {
    return openLinkedHandout(this.actor);
  }

  static async unlinkHandout() {
    if (!this.isEditable) return;
    await this.actor.update(linkedJournalUpdate(this.actor, ""));
  }
}

/**
 * The Clue HUD deliberately derives from the system's configured V14 HUD
 * class.  It keeps every native left-rail control and uses Foundry's own
 * palette action for classifications, while omitting token-combat controls
 * that have no meaning for an investigation clue.
 */
function installClueTokenHud() {
  const BaseTokenHUD = CONFIG.Token?.hudClass;
  if (!BaseTokenHUD) {
    console.warn(`${MODULE_ID} | Could not locate Foundry's TokenHUD class.`);
    return false;
  }

  const installed = Symbol.for(`${MODULE_ID}.clueTokenHudInstalled`);
  if (BaseTokenHUD[installed]) return true;

  class ClueTokenHUD extends BaseTokenHUD {
    static PARTS = foundry.utils.mergeObject(super.PARTS, {
      hud: { template: `modules/${MODULE_ID}/templates/clue-token-hud.hbs` }
    }, { inplace: false });

    static DEFAULT_OPTIONS = foundry.utils.mergeObject(super.DEFAULT_OPTIONS, {
      actions: { classifyPerson: ClueTokenHUD.classifyPerson }
    }, { inplace: false });

    async _prepareContext(options) {
      const context = await super._prepareContext(options);
      const tokenDocument = this.object?.document;
      const actor = this.object?.actor;
      const isClue = isClueActor(actor);
      const classification = personClassification(tokenDocument);
      return {
        ...context,
        isClue,
        personClassifications: PERSON_CLASSIFICATIONS.map((choice) => ({
          ...choice,
          cssClass: `${choice.cssClass} ${choice.id === classification ? "active" : ""}`.trim()
        }))
      };
    }

    static async classifyPerson(_event, target) {
      const tokenDocument = this.object?.document;
      if (!tokenDocument || !isClueActor(this.object?.actor)) return;
      const classification = target.dataset.classification ?? "";
      if (classification && clueBoardCategory(this.object.actor, tokenDocument) !== "people") {
        await this.object.actor.setFlag(MODULE_ID, BOARD_CATEGORY_FLAG, "people");
      }
      await tokenDocument.setFlag(MODULE_ID, PERSON_CLASSIFICATION_FLAG, classification);
      updateClueClassificationPin(this.object);
      this.render({ force: true });
    }
  }

  Object.defineProperty(ClueTokenHUD, installed, { value: true });
  CONFIG.Token.hudClass = ClueTokenHUD;
  console.info(`${MODULE_ID} | Native clue Token HUD installed.`);
  return true;
}

function updateClueClassificationPin(token) {
  if (!token?.effects) return;
  const pinName = `${MODULE_ID}-classification-pin`;
  const current = token.effects.getChildByName(pinName);
  const classification = personClassification(token.document);
  const category = clueBoardCategory(token.actor, token.document);
  if (!isClueActor(token.actor) || category !== "people" || !classification) {
    current?.destroy({ children: true });
    return;
  }

  const path = `modules/${MODULE_ID}/assets/clue-pins/${classification}.webp`;
  const texture = PIXI.Texture.from(path);
  const pin = current ?? new PIXI.Sprite(texture);
  if (!current) {
    pin.name = pinName;
    pin.eventMode = "none";
    pin.anchor.set(0.5, 0);
    token.effects.addChild(pin);
  } else pin.texture = texture;

  // Pins are physical board items, not part of a clue image. Keep their scene
  // size constant when a player enlarges or shrinks an individual token.
  const size = Math.min(96, Math.max(8, classificationPinSize() + tokenPinAdjustment(token.document, PIN_SIZE_ADJUSTMENT_FLAG)));
  pin.width = size;
  pin.height = size;
  pin.x = token.w / 2;
  pin.y = (-size * 0.38) + classificationPinVerticalOffset()
    + tokenPinAdjustment(token.document, PIN_VERTICAL_ADJUSTMENT_FLAG);
  pin.zIndex = 1000;
}

function refreshAllClueClassificationPins() {
  for (const token of canvas.tokens?.placeables ?? []) updateClueClassificationPin(token);
}

function boardNotePosition(width, height) {
  const pivot = canvas?.stage?.pivot;
  const scene = canvas?.scene;
  return {
    x: Math.max(0, Math.round((pivot?.x ?? scene?.dimensions?.width / 2 ?? width) - width / 2)),
    y: Math.max(0, Math.round((pivot?.y ?? scene?.dimensions?.height / 2 ?? height) - height / 2))
  };
}

function questionNoteTextInset(drawing = null) {
  const override = drawing?.getFlag?.(MODULE_ID, QUESTION_NOTE_TEXT_INSET_FLAG);
  const value = override === "" || override === null || override === undefined
    ? Number(game.settings.get(MODULE_ID, QUESTION_NOTE_TEXT_INSET_SETTING))
    : Number(override);
  return Number.isFinite(value) ? Math.min(96, Math.max(0, value)) : DEFAULT_QUESTION_NOTE_TEXT_INSET;
}

function questionNoteTextArea(style, dimensions, drawing = null) {
  const inset = questionNoteTextInset(drawing);
  return {
    width: Math.max(1, dimensions.width - (inset * 2)),
    height: Math.max(1, dimensions.height - (inset * 2))
  };
}

function questionNoteDrawingPlacement(style, card, drawing = null) {
  const inset = questionNoteTextInset(drawing);
  return {
    x: card.x + inset,
    y: card.y + inset,
    ...questionNoteTextArea(style, card, drawing)
  };
}

function questionNoteDrawingData(kind, color, variant, dimensions = null, fontSize = null) {
  const style = questionNoteStyle(kind, color, variant);
  if (!style) return {};
  const card = dimensions ?? style;
  const writingArea = questionNoteTextArea(style, card);
  return {
    shape: {
      type: foundry.canvas.placeables.Drawing.SHAPE_TYPES.RECTANGLE,
      width: writingArea.width,
      height: writingArea.height
    },
    fillType: CONST.DRAWING_FILL_TYPES.NONE,
    fillAlpha: 0,
    strokeWidth: 0,
    strokeAlpha: 0,
    fontFamily: style.font,
    fontSize: fontSize ?? (kind === "sticky" ? 30 : 28),
    textColor: style.text,
    textAlpha: 1,
    flags: {
      [MODULE_ID]: {
        boardNote: true,
        [QUESTION_NOTE_KIND_FLAG]: style.kind,
        [QUESTION_NOTE_COLOR_FLAG]: style.color,
        [QUESTION_NOTE_VARIANT_FLAG]: style.variant
      }
    }
  };
}

function questionNoteTextMetrics(text, { fontFamily, fontSize }, width) {
  const textStyle = new PIXI.TextStyle({
    fontFamily,
    fontSize,
    padding: 8,
    wordWrap: true,
    wordWrapWidth: Math.max(1, width)
  });
  return PIXI.TextMetrics.measureText(String(text ?? ""), textStyle);
}

/**
 * The card owns its dimensions; the Drawing is its inset writing area. When
 * a player makes a card smaller, reduce the text to fit rather than growing
 * the card back to its former size. Foundry's schema sets 8px as the smallest
 * legal Drawing font; only text that cannot fit even at 8px establishes a
 * lower bound for the card.
 */
function fitQuestionNoteText(style, text, { fontFamily, fontSize } = {}, dimensions, drawing = null) {
  let card = { width: Math.max(1, dimensions.width), height: Math.max(1, dimensions.height) };
  const requested = Math.max(8, Math.round(Number(fontSize) || (style.kind === "sticky" ? 30 : 28)));
  const family = fontFamily || style.font;
  const fits = (size, area) => {
    const metrics = questionNoteTextMetrics(text, { fontFamily: family, fontSize: size }, area.width);
    return { metrics, fits: metrics.width <= area.width && metrics.height <= area.height };
  };

  for (let size = requested; size >= 8; size -= 1) {
    const area = questionNoteTextArea(style, card, drawing);
    if (fits(size, area).fits) return { dimensions: card, fontSize: size };
  }

  const area = questionNoteTextArea(style, card, drawing);
  const {metrics} = fits(8, area);
  const inset = questionNoteTextInset(drawing);
  card = {
    width: Math.ceil(Math.max(card.width, metrics.width + (inset * 2))),
    height: Math.ceil(Math.max(card.height, metrics.height + (inset * 2)))
  };
  return {
    dimensions: card,
    fontSize: 8
  };
}

function questionNoteTileData(style, dimensions = style) {
  return {
    // Tiles use a centered texture anchor by default; Drawings use their
    // upper-left corner. Match the Drawing origin so both documents occupy
    // the same rectangle when given the same x/y coordinates.
    texture: { src: style.texture, anchorX: 0, anchorY: 0 },
    width: dimensions.width,
    height: dimensions.height,
    alpha: 1,
    hidden: false,
    locked: false,
    flags: {
      [MODULE_ID]: {
        boardNoteBackground: true,
        [QUESTION_NOTE_KIND_FLAG]: style.kind,
        [QUESTION_NOTE_COLOR_FLAG]: style.color,
        [QUESTION_NOTE_VARIANT_FLAG]: style.variant
      }
    }
  };
}

function clueQuestionNoteKind(drawing) {
  const kind = drawing?.getFlag(MODULE_ID, QUESTION_NOTE_KIND_FLAG);
  return QUESTION_NOTE_KINDS[kind] ? kind : null;
}

function isQuestionNoteDrawing(drawing) {
  return drawing?.getFlag(MODULE_ID, "boardNote") === true && !!clueQuestionNoteKind(drawing);
}

/**
 * Foundry V14 intentionally adds an adaptive outline and shadow to every
 * Drawing label so it remains readable on arbitrary scene art. A question
 * note has its own paper background, so suppress that safety treatment only
 * for our flagged note Drawings. Foundry exposes no per-Drawing text-stroke
 * setting in its native configuration UI.
 */
function installQuestionNoteTextStyle() {
  const DrawingClass = CONFIG.Drawing?.objectClass ?? foundry.canvas?.placeables?.Drawing;
  if (!DrawingClass?.prototype?._getTextStyle) {
    console.warn(`${MODULE_ID} | Could not locate Foundry's Drawing text renderer.`);
    return false;
  }
  const wrapped = Symbol.for(`${MODULE_ID}.questionNoteTextStyleWrapped`);
  if (DrawingClass.prototype[wrapped]) return true;

  const originalGetTextStyle = DrawingClass.prototype._getTextStyle;
  DrawingClass.prototype._getTextStyle = function clueQuestionNoteTextStyle() {
    const style = originalGetTextStyle.call(this);
    if (!isQuestionNoteDrawing(this.document)) return style;
    style.strokeThickness = 0;
    style.dropShadow = false;
    style.dropShadowAlpha = 0;
    style.dropShadowBlur = 0;
    return style;
  };
  Object.defineProperty(DrawingClass.prototype, wrapped, { value: true });
  return true;
}

function refreshQuestionNoteTextStyles() {
  for (const drawing of canvas.drawings?.placeables ?? []) {
    if (isQuestionNoteDrawing(drawing.document)) drawing.renderFlags.set({ refreshText: true });
  }
}

function escapeHtml(value) {
  const element = document.createElement("div");
  element.textContent = value ?? "";
  return element.innerHTML;
}

/**
 * Derive from Foundry's V14 Drawing HUD instead of replacing its controls.
 * Question notes gain one purpose-built pencil action on the expected right
 * rail; every other Drawing retains the unmodified native HUD.
 */
function installQuestionNoteDrawingHud() {
  const BaseDrawingHUD = CONFIG.Drawing?.hudClass;
  if (!BaseDrawingHUD) {
    console.warn(`${MODULE_ID} | Could not locate Foundry's Drawing HUD class.`);
    return false;
  }
  const installed = Symbol.for(`${MODULE_ID}.questionNoteDrawingHudInstalled`);
  if (BaseDrawingHUD[installed]) return true;

  class QuestionNoteDrawingHUD extends BaseDrawingHUD {
    static PARTS = foundry.utils.mergeObject(super.PARTS, {
      hud: { root: true, template: `modules/${MODULE_ID}/templates/question-note-drawing-hud.hbs` }
    }, { inplace: false });

    static DEFAULT_OPTIONS = foundry.utils.mergeObject(super.DEFAULT_OPTIONS, {
      actions: { editQuestionText: QuestionNoteDrawingHUD.editQuestionText }
    }, { inplace: false });

    async _prepareContext(options) {
      const context = await super._prepareContext(options);
      return { ...context, isQuestionNote: isQuestionNoteDrawing(this.document) };
    }

    static async editQuestionText() {
      const drawing = this.document;
      if (!drawing || !isQuestionNoteDrawing(drawing)) return;
      if (!canEditDocument(drawing)) return ui.notifications.warn("You do not have permission to edit this question note.");

      const formData = await foundry.applications.api.DialogV2.input({
        window: { title: "Edit Question Note" },
        content: `<textarea name="text" rows="10" autofocus>${escapeHtml(drawing.text)}</textarea>`,
        ok: { label: "Save Note", icon: "fa-solid fa-floppy-disk" },
        rejectClose: false,
        modal: true
      });
      const text = formData?.text ?? formData?.get?.("text");
      if (text === undefined) return;
      if (!text.trim()) return ui.notifications.warn("A question note cannot be blank.");
      await drawing.update({ text: text.trim() });
    }
  }

  Object.defineProperty(QuestionNoteDrawingHUD, installed, { value: true });
  CONFIG.Drawing.hudClass = QuestionNoteDrawingHUD;
  return true;
}

function addQuestionNoteDrawingFields(app, html) {
  const root = html instanceof HTMLElement ? html : html?.[0] ?? null;
  const drawing = app.document ?? app.object;
  const kind = clueQuestionNoteKind(drawing);
  if (!root || !kind || root.querySelector(".dg-question-note-style-fields")) return;

  const defaults = questionNoteDefaults(kind);
  const style = questionNoteStyle(
    kind,
    drawing.getFlag(MODULE_ID, QUESTION_NOTE_COLOR_FLAG) ?? defaults.color,
    drawing.getFlag(MODULE_ID, QUESTION_NOTE_VARIANT_FLAG) ?? defaults.variant
  );
  const insetOverride = drawing.getFlag(MODULE_ID, QUESTION_NOTE_TEXT_INSET_FLAG) ?? "";
  const field = document.createElement("div");
  field.classList.add("form-group", "dg-question-note-style-fields");
  field.innerHTML = `<label>${style.label} Appearance</label>
    <div class="form-fields dg-question-note-style-controls">${questionNotePicker(kind, style)}</div>
    <div class="form-fields"><label class="checkbox-label">Text Inset Override <input type="number" name="flags.${MODULE_ID}.${QUESTION_NOTE_TEXT_INSET_FLAG}" value="${insetOverride}" min="0" max="96" step="1" placeholder="World default"></label></div>
    <p class="hint">Choose the paper color and ${kind === "sticky" ? "style" : "condition"}. Leave Text Inset Override blank to use the world default.</p>`;

  const fillTab = root.querySelector('.tab[data-tab="fill"]');
  const insertionPoint = fillTab?.querySelector('[name="fillAlpha"]')?.closest(".form-group");
  if (insertionPoint) insertionPoint.insertAdjacentElement("afterend", field);
  else (fillTab ?? root.querySelector("form") ?? root).append(field);

}

async function createBoardNote(kind) {
  if (!canvas?.scene) return ui.notifications.warn("Open the investigation board before creating a note.");
  if (!game.user.can("DRAWING_CREATE")) return ui.notifications.warn("You do not have permission to create board notes.");

  const style = questionNoteDefaults(kind);
  const formData = await foundry.applications.api.DialogV2.input({
    window: { title: `New ${style.label}` },
    content: questionNotePicker(kind, style, { includeText: true }),
    ok: { label: "Create Note", icon: "fa-solid fa-plus" },
    rejectClose: false,
    modal: true
  });
  const text = formData?.text ?? formData?.get?.("text");
  if (!text?.trim()) return;

  const color = formData?.[`flags.${MODULE_ID}.${QUESTION_NOTE_COLOR_FLAG}`]
    ?? formData?.get?.(`flags.${MODULE_ID}.${QUESTION_NOTE_COLOR_FLAG}`)
    ?? style.color;
  const variant = formData?.[`flags.${MODULE_ID}.${QUESTION_NOTE_VARIANT_FLAG}`]
    ?? formData?.get?.(`flags.${MODULE_ID}.${QUESTION_NOTE_VARIANT_FLAG}`)
    ?? style.variant;
  const note = questionNoteStyle(kind, color, variant);
  const fit = fitQuestionNoteText(note, text.trim(), {}, note);
  const dimensions = fit.dimensions;
  const { x, y } = boardNotePosition(dimensions.width, dimensions.height);
  const [tile] = await canvas.scene.createEmbeddedDocuments("Tile", [{
    x,
    y,
    ...questionNoteTileData(note, dimensions)
  }]);
  const writingArea = questionNoteDrawingPlacement(note, { x, y, ...dimensions });
  const [drawing] = await canvas.scene.createEmbeddedDocuments("Drawing", [{
    author: game.user.id,
    x: writingArea.x,
    y: writingArea.y,
    text: text.trim(),
    interface: true,
    locked: false,
    hidden: false,
    ...questionNoteDrawingData(kind, note.color, note.variant, dimensions, fit.fontSize),
    flags: {
      [MODULE_ID]: {
        boardNote: true,
        [QUESTION_NOTE_KIND_FLAG]: note.kind,
        [QUESTION_NOTE_COLOR_FLAG]: note.color,
        [QUESTION_NOTE_VARIANT_FLAG]: note.variant,
        [QUESTION_NOTE_TILE_ID_FLAG]: tile.id
      }
    }
  }]);
  await tile.setFlag(MODULE_ID, QUESTION_NOTE_DRAWING_ID_FLAG, drawing.id);
}

function linkedQuestionNoteTile(drawing) {
  return drawing?.parent?.tiles?.get(drawing.getFlag(MODULE_ID, QUESTION_NOTE_TILE_ID_FLAG));
}

function linkedQuestionNoteDrawing(tile) {
  return tile?.parent?.drawings?.get(tile.getFlag(MODULE_ID, QUESTION_NOTE_DRAWING_ID_FLAG));
}

function questionNoteStyleFromDocument(document) {
  const kind = document?.getFlag(MODULE_ID, QUESTION_NOTE_KIND_FLAG);
  return questionNoteStyle(
    kind,
    document?.getFlag(MODULE_ID, QUESTION_NOTE_COLOR_FLAG),
    document?.getFlag(MODULE_ID, QUESTION_NOTE_VARIANT_FLAG)
  );
}

async function syncQuestionNoteTileFromDrawing(drawing, _changes, options) {
  if (options?.[MODULE_ID]) return;
  const tile = linkedQuestionNoteTile(drawing);
  const style = questionNoteStyleFromDocument(drawing);
  if (!tile || !style) return;
  const inset = questionNoteTextInset(drawing);
  const requestedCard = {
    width: drawing.shape.width + (inset * 2),
    height: drawing.shape.height + (inset * 2)
  };
  const fit = fitQuestionNoteText(style, drawing.text, drawing, requestedCard, drawing);
  const dimensions = fit.dimensions;
  const tilePosition = {
    x: drawing.x - inset,
    y: drawing.y - inset
  };
  const writingArea = questionNoteDrawingPlacement(style, { ...tilePosition, ...dimensions }, drawing);
  if (writingArea.x !== drawing.x || writingArea.y !== drawing.y
    || writingArea.width !== drawing.shape.width || writingArea.height !== drawing.shape.height
    || fit.fontSize !== drawing.fontSize) {
    await drawing.update({
      x: writingArea.x,
      y: writingArea.y,
      "shape.width": writingArea.width,
      "shape.height": writingArea.height,
      fontSize: fit.fontSize
    }, { [MODULE_ID]: true });
  }
  await tile.update({
    x: tilePosition.x,
    y: tilePosition.y,
    width: dimensions.width,
    height: dimensions.height,
    rotation: drawing.rotation,
    "texture.src": style.texture,
    "texture.anchorX": 0,
    "texture.anchorY": 0,
    [`flags.${MODULE_ID}.${QUESTION_NOTE_COLOR_FLAG}`]: style.color,
    [`flags.${MODULE_ID}.${QUESTION_NOTE_VARIANT_FLAG}`]: style.variant
  }, { [MODULE_ID]: true });
}

async function syncQuestionNoteDrawingFromTile(tile, _changes, options) {
  if (options?.[MODULE_ID]) return;
  const drawing = linkedQuestionNoteDrawing(tile);
  if (!drawing) return;
  const style = questionNoteStyleFromDocument(drawing);
  if (!style) return;
  const fit = fitQuestionNoteText(style, drawing.text, drawing, { width: tile.width, height: tile.height }, drawing);
  const dimensions = fit.dimensions;
  const writingArea = questionNoteDrawingPlacement(style, { x: tile.x, y: tile.y, ...dimensions }, drawing);
  await drawing.update({
    x: writingArea.x,
    y: writingArea.y,
    "shape.width": writingArea.width,
    "shape.height": writingArea.height,
    rotation: tile.rotation,
    fontSize: fit.fontSize
  }, { [MODULE_ID]: true });
  if (dimensions.width !== tile.width || dimensions.height !== tile.height) {
    await tile.update({ width: dimensions.width, height: dimensions.height }, { [MODULE_ID]: true });
  }
}

async function deleteQuestionNoteTile(drawing, options) {
  if (options?.[MODULE_ID]) return;
  const tile = linkedQuestionNoteTile(drawing);
  if (tile) await tile.delete({ [MODULE_ID]: true });
}

async function deleteQuestionNoteDrawing(tile, options) {
  if (options?.[MODULE_ID]) return;
  const drawing = linkedQuestionNoteDrawing(tile);
  if (drawing) await drawing.delete({ [MODULE_ID]: true });
}

async function refreshWorldDefaultQuestionNoteInsets() {
  if (!game.user.isGM) return;
  for (const tile of canvas.tiles?.placeables ?? []) {
    const drawing = linkedQuestionNoteDrawing(tile.document);
    const override = drawing?.getFlag(MODULE_ID, QUESTION_NOTE_TEXT_INSET_FLAG);
    if (!drawing || (override !== undefined && override !== null && override !== "")) continue;
    await syncQuestionNoteDrawingFromTile(tile.document, {}, {});
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
    if (!isClueActor(this.actor)) return originalDoubleClick.call(this, event);
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

function installNativeActorFallback() {
  if (!needsNativeActorFallback()) return true;

  const ActorClass = CONFIG.Actor?.documentClass;
  if (!ActorClass?.createDocuments) {
    console.warn(`${MODULE_ID} | Could not locate Actor creation to install the PF2e Clue fallback.`);
    return false;
  }

  const wrapped = Symbol.for(`${MODULE_ID}.nativeActorFallbackWrapped`);
  if (ActorClass[wrapped]) return true;

  const originalCreateDocuments = ActorClass.createDocuments;
  ActorClass.createDocuments = function createClueAsNativeActor(sources = [], options = {}) {
    const converted = sources.map((source) => {
      if (source?.type !== CLUE_TYPE) return source;

      const clueSource = foundry.utils.deepClone(source);
      const handoutUuid = clueSource.system?.linkedJournalUuid ?? "";
      clueSource.type = fallbackActorType();
      clueSource.system = {};
      clueSource.flags = foundry.utils.mergeObject(clueSource.flags ?? {}, {
        [MODULE_ID]: {
          [CLUE_FLAG]: true,
          [LINKED_JOURNAL_FLAG]: handoutUuid
        },
        core: { sheetClass: CLUE_SHEET_ID }
      }, { inplace: false });
      return clueSource;
    });

    return originalCreateDocuments.call(this, converted, options);
  };
  Object.defineProperty(ActorClass, wrapped, { value: true });
  console.info(`${MODULE_ID} | PF2e Clues will be created as flagged native ${fallbackActorType()} Actors.`);
  return true;
}

const CLUE_OWNERSHIP_LEVELS = [
  { key: "inherit", value: CONST.DOCUMENT_OWNERSHIP_LEVELS.INHERIT, label: "Inherit", cssClass: "inherit" },
  { key: "none", value: CONST.DOCUMENT_OWNERSHIP_LEVELS.NONE, label: "GM-Only", cssClass: "gm-only" },
  { key: "limited", value: CONST.DOCUMENT_OWNERSHIP_LEVELS.LIMITED, label: "Limited", cssClass: "limited" },
  { key: "observer", value: CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER, label: "Player-Read", cssClass: "player-read" },
  { key: "owner", value: CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER, label: "Player-Write", cssClass: "player-write" }
];

function murderboardScenes() {
  return game.scenes.filter((scene) => scene.getFlag(MODULE_ID, MURDERBOARD_FLAG) === true);
}

async function journalEntryForClue(actor) {
  const uuid = linkedJournalUuid(actor);
  if (!uuid) return null;
  const document = await fromUuid(uuid);
  if (document?.documentName === "JournalEntryPage") return document.parent;
  return document?.documentName === "JournalEntry" ? document : null;
}

function dashboardPlayers() {
  return game.users.filter((user) => user.active && !user.isGM);
}

function ownershipStatus(document, audience = "default") {
  const ownership = document?.ownership ?? {};
  const value = Number(audience === "default" ? ownership.default : ownership[audience]);
  return CLUE_OWNERSHIP_LEVELS.find((status) => status.value === value)
    ?? CLUE_OWNERSHIP_LEVELS[0];
}

function hasPlayerOverrides(document) {
  const ownership = document?.ownership ?? {};
  return dashboardPlayers().some((player) => Object.hasOwn(ownership, player.id));
}

function pageStatusSummary(journal) {
  const counts = new Map();
  for (const page of journal.pages) {
    const status = ownershipStatus(page);
    counts.set(status.key, (counts.get(status.key) ?? 0) + 1);
  }
  const detail = CLUE_OWNERSHIP_LEVELS
    .filter((status) => counts.has(status.key))
    .map((status) => `${counts.get(status.key)} ${status.label}`)
    .join(" · ");
  return `${journal.pages.size} page${journal.pages.size === 1 ? "" : "s"}${detail ? `: ${detail}` : ""}`;
}

function murderboardClueRecords() {
  const records = new Map();
  for (const scene of murderboardScenes()) {
    for (const token of scene.tokens) {
      const actor = token.actor;
      if (!isClueActor(actor)) continue;
      const key = actor.uuid ?? token.uuid;
      const record = records.get(key) ?? { key, actor, tokens: [], scenes: new Set() };
      record.tokens.push(token);
      record.scenes.add(scene.name);
      records.set(key, record);
    }
  }
  return [...records.values()].sort((left, right) => left.actor.name.localeCompare(right.actor.name));
}

function dashboardFolderJournals() {
  const roots = new Set(game.settings.get(MODULE_ID, DASHBOARD_FOLDER_IDS_SETTING) ?? []);
  if (!roots.size) return [];
  const included = new Set([...roots]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const folder of game.folders.filter((entry) => entry.type === "JournalEntry")) {
      if (folder.folder && included.has(folder.folder.id) && !included.has(folder.id)) {
        included.add(folder.id);
        changed = true;
      }
    }
  }
  return game.journal.filter((journal) => journal.folder && included.has(journal.folder.id));
}

function addMurderboardSceneField(app, html) {
  const root = html instanceof HTMLElement ? html : html?.[0] ?? null;
  const scene = app.document ?? app.object;
  if (!root || !scene?.documentName || scene.documentName !== "Scene"
    || root.querySelector(`[name="flags.${MODULE_ID}.${MURDERBOARD_FLAG}"]`)) return;

  const group = document.createElement("div");
  group.classList.add("form-group");
  group.innerHTML = `<label>Clue Murderboard</label>
    <div class="form-fields"><input type="checkbox" name="flags.${MODULE_ID}.${MURDERBOARD_FLAG}" ${scene.getFlag(MODULE_ID, MURDERBOARD_FLAG) ? "checked" : ""}></div>
    <p class="hint">Include this scene in the Clue Dashboard.</p>`;
  (root.querySelector("form") ?? root).append(group);
}

/**
 * Foundry V14 exposes a public extension hook for canvas Scene Controls, but
 * not for the Scene Directory's document-action row. Keep this one insertion
 * deliberately narrow: the global dashboard belongs beside Create Scene,
 * where a GM manages murderboards, rather than in the canvas tool palette.
 */
function addClueDashboardSceneDirectoryButton(app, html) {
  const root = html instanceof HTMLElement ? html : html?.[0] ?? null;
  if (!game.user.isGM || !root || app !== ui.scenes
    || root.querySelector(`[data-action="${MODULE_ID}-open-dashboard"]`)) return;

  const createButton = root.querySelector('[data-action="createDocument"]');
  const actions = createButton?.parentElement ?? root.querySelector(".directory-header .header-actions");
  if (!actions) return;

  const button = document.createElement("button");
  button.type = "button";
  button.dataset.action = `${MODULE_ID}-open-dashboard`;
  button.innerHTML = '<i class="fa-solid fa-table-list"></i> Clue Dashboard';
  button.addEventListener("click", () => {
    const existing = foundry.applications.instances.get(`${MODULE_ID}-dashboard`);
    if (existing) return existing.bringToFront();
    return new ClueDashboard().render({ force: true });
  });
  actions.insertBefore(button, createButton?.nextSibling ?? null);
}

class ClueDashboardSettings extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: `${MODULE_ID}-dashboard-settings`,
    classes: [MODULE_ID, "clue-dashboard-settings"],
    position: { width: 480, height: "auto" },
    window: { title: "Clue Dashboard Sources", icon: "fa-solid fa-folder-tree", resizable: true },
    actions: { save: ClueDashboardSettings.save }
  };

  static PARTS = { form: { template: `modules/${MODULE_ID}/templates/clue-dashboard-settings.hbs`, root: true } };

  async _prepareContext() {
    const selected = new Set(game.settings.get(MODULE_ID, DASHBOARD_FOLDER_IDS_SETTING) ?? []);
    return {
      folders: game.folders.filter((folder) => folder.type === "JournalEntry")
        .sort((left, right) => left.name.localeCompare(right.name))
        .map((folder) => ({ id: folder.id, name: folder.name, selected: selected.has(folder.id) }))
    };
  }

  static async save(_event, target) {
    const ids = [...this.element.querySelectorAll('input[name="folderIds"]:checked')].map((input) => input.value);
    await game.settings.set(MODULE_ID, DASHBOARD_FOLDER_IDS_SETTING, ids);
    await this.close();
  }
}

class ClueDashboard extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: `${MODULE_ID}-dashboard`,
    classes: [MODULE_ID, "clue-dashboard"],
    position: { width: 900, height: 720 },
    window: { title: "Clue Dashboard", icon: "fa-solid fa-table-list", resizable: true },
    actions: {
      toggleClue: ClueDashboard.toggleClue,
      toggleEntry: ClueDashboard.toggleEntry,
      togglePage: ClueDashboard.togglePage,
      togglePages: ClueDashboard.togglePages,
      toggleAllClues: ClueDashboard.toggleAllClues,
      showTokens: ClueDashboard.showTokens,
      hideTokens: ClueDashboard.hideTokens,
      setEntryOwnership: ClueDashboard.setEntryOwnership,
      setAllPagesOwnership: ClueDashboard.setAllPagesOwnership,
      setPageOwnership: ClueDashboard.setPageOwnership,
      clearSelection: ClueDashboard.clearSelection
    }
  };

  static PARTS = { main: { template: `modules/${MODULE_ID}/templates/clue-dashboard.hbs`, root: true } };

  constructor(options = {}) {
    super(options);
    this.selectedClues = new Set();
    this.selectedEntries = new Set();
    this.selectedPages = new Set();
    this.expandedEntries = new Set();
    this.audience = "default";
  }

  async _prepareContext() {
    const rows = [];
    const linkedJournalIds = new Set();
    for (const record of murderboardClueRecords()) {
      const journal = await journalEntryForClue(record.actor);
      if (journal) linkedJournalIds.add(journal.id);
      const visible = record.tokens.filter((token) => !token.hidden).length;
      rows.push({
        ...record,
        journal,
        selected: this.selectedClues.has(record.key),
        visibility: visible === record.tokens.length ? "Visible" : visible === 0 ? "Hidden" : "Mixed",
        visibilityClass: visible === record.tokens.length ? "visible" : visible === 0 ? "hidden" : "mixed",
        tokenCount: record.tokens.length,
        tokenLabel: `token${record.tokens.length === 1 ? "" : "s"}`,
        sceneNames: [...record.scenes].join(", "),
        journalSelected: journal ? this.selectedEntries.has(journal.id) : false,
        entryStatus: journal ? ownershipStatus(journal, this.audience) : null,
        entryMixed: journal ? hasPlayerOverrides(journal) : false,
        pageSummary: journal ? pageStatusSummary(journal) : "No linked Journal Entry",
        expanded: journal ? this.expandedEntries.has(journal.id) : false,
        pages: journal ? journal.pages.map((page) => ({
          id: page.id,
          uuid: page.uuid,
          name: page.name,
          selected: this.selectedPages.has(page.uuid),
          status: ownershipStatus(page, this.audience),
          mixed: hasPlayerOverrides(page)
        })) : []
      });
    }

    const additionalJournals = dashboardFolderJournals().filter((journal) => !linkedJournalIds.has(journal.id)).map((journal) => ({
      journal,
      selected: this.selectedEntries.has(journal.id),
      entryStatus: ownershipStatus(journal, this.audience),
      entryMixed: hasPlayerOverrides(journal),
      pageSummary: pageStatusSummary(journal),
      expanded: this.expandedEntries.has(journal.id),
      pages: journal.pages.map((page) => ({
        id: page.id,
        uuid: page.uuid,
        name: page.name,
        selected: this.selectedPages.has(page.uuid),
        status: ownershipStatus(page, this.audience),
        mixed: hasPlayerOverrides(page)
      }))
    }));

    return {
      murderboards: murderboardScenes().map((scene) => scene.name).join(" · ") || "No murderboards marked",
      rows,
      additionalJournals,
      hasAdditionalJournals: additionalJournals.length > 0,
      levels: CLUE_OWNERSHIP_LEVELS,
      audience: this.audience,
      audienceOptions: [{ id: "default", label: "All Players", selected: this.audience === "default" }, ...dashboardPlayers().map((player) => ({ id: player.id, label: player.name, selected: this.audience === player.id }))],
      hasRows: rows.length > 0
    };
  }

  _onRender(context, options) {
    super._onRender(context, options);
    this.element.querySelector('[name="audience"]')?.addEventListener("change", async (event) => {
      this.audience = event.currentTarget.value;
      await this.render();
    });
  }

  static toggleClue(_event, target) {
    target.checked ? this.selectedClues.add(target.value) : this.selectedClues.delete(target.value);
  }

  static toggleEntry(_event, target) {
    target.checked ? this.selectedEntries.add(target.value) : this.selectedEntries.delete(target.value);
  }

  static togglePage(_event, target) {
    target.checked ? this.selectedPages.add(target.value) : this.selectedPages.delete(target.value);
  }

  static async togglePages(_event, target) {
    const id = target.dataset.entryId;
    this.expandedEntries.has(id) ? this.expandedEntries.delete(id) : this.expandedEntries.add(id);
    await this.render();
  }

  static async toggleAllClues(_event, target) {
    const rows = await this._prepareContext();
    if (target.checked) rows.rows.forEach((row) => this.selectedClues.add(row.key));
    else this.selectedClues.clear();
    await this.render();
  }

  async _selectedRows() {
    return (await this._prepareContext()).rows.filter((row) => this.selectedClues.has(row.key));
  }

  static async showTokens() { return this._setTokenVisibility(false); }
  static async hideTokens() { return this._setTokenVisibility(true); }

  async _setTokenVisibility(hidden) {
    const rows = await this._selectedRows();
    const byScene = new Map();
    for (const row of rows) for (const token of row.tokens) {
      const updates = byScene.get(token.parent) ?? [];
      updates.push({ _id: token.id, hidden });
      byScene.set(token.parent, updates);
    }
    if (!byScene.size) return ui.notifications.warn("Select at least one clue first.");
    for (const [scene, updates] of byScene) await scene.updateEmbeddedDocuments("Token", updates);
    ui.notifications.info(`${hidden ? "Hidden" : "Shown"} ${rows.length} clue${rows.length === 1 ? "" : "s"}.`);
    await this.render();
  }

  _ownershipUpdate(level) {
    const property = this.audience === "default" ? "ownership.default" : `ownership.${this.audience}`;
    return { [property]: Number(level) };
  }

  async _selectedEntries() {
    return game.journal.filter((journal) => this.selectedEntries.has(journal.id));
  }

  static async setEntryOwnership(_event, target) {
    const entries = await this._selectedEntries();
    if (!entries.length) return ui.notifications.warn("Select at least one Journal Entry first.");
    await JournalEntry.updateDocuments(entries.map((entry) => ({ _id: entry.id, ...this._ownershipUpdate(target.dataset.level) })));
    await this.render();
  }

  static async setAllPagesOwnership(_event, target) {
    const entries = await this._selectedEntries();
    if (!entries.length) return ui.notifications.warn("Select at least one Journal Entry first.");
    for (const entry of entries) await entry.updateEmbeddedDocuments("JournalEntryPage", entry.pages.map((page) => ({ _id: page.id, ...this._ownershipUpdate(target.dataset.level) })));
    await this.render();
  }

  static async setPageOwnership(_event, target) {
    const selected = new Set(this.selectedPages);
    if (!selected.size) return ui.notifications.warn("Select at least one Journal page first.");
    for (const entry of game.journal) {
      const pages = entry.pages.filter((page) => selected.has(page.uuid));
      if (pages.length) await entry.updateEmbeddedDocuments("JournalEntryPage", pages.map((page) => ({ _id: page.id, ...this._ownershipUpdate(target.dataset.level) })));
    }
    await this.render();
  }

  static async clearSelection() {
    this.selectedClues.clear();
    this.selectedEntries.clear();
    this.selectedPages.clear();
    await this.render();
  }
}

Hooks.once("init", () => {
  game.settings.register(MODULE_ID, DASHBOARD_FOLDER_IDS_SETTING, {
    scope: "world",
    config: false,
    type: Array,
    default: []
  });
  game.settings.registerMenu(MODULE_ID, "dashboardSources", {
    name: "Clue Dashboard sources",
    hint: "Include Journal Entries from these folders, including their nested folders, in the Clue Dashboard.",
    label: "Configure sources",
    icon: "fa-solid fa-folder-tree",
    type: ClueDashboardSettings,
    restricted: true
  });
  game.settings.register(MODULE_ID, QUESTION_NOTE_TEXT_INSET_SETTING, {
    name: "Question note text inset",
    hint: "The empty border in scene pixels between a question note's paper edge and its editable text. Individual notes may override this in Drawing Configuration.",
    scope: "world",
    config: true,
    type: Number,
    range: { min: 0, max: 96, step: 1 },
    default: DEFAULT_QUESTION_NOTE_TEXT_INSET,
    onChange: () => void refreshWorldDefaultQuestionNoteInsets()
  });
  game.settings.register(MODULE_ID, STICKY_NOTE_COLOR_SETTING, {
    name: "Sticky note default color",
    hint: "The starting color selected when a player creates a sticky-note question.",
    scope: "world",
    config: true,
    type: String,
    choices: QUESTION_NOTE_KINDS.sticky.colors,
    default: "yellow"
  });
  game.settings.register(MODULE_ID, STICKY_NOTE_STYLE_SETTING, {
    name: "Sticky note default style",
    hint: "The starting paper style selected when a player creates a sticky-note question.",
    scope: "world",
    config: true,
    type: String,
    choices: QUESTION_NOTE_KINDS.sticky.variants,
    default: "flat"
  });
  game.settings.register(MODULE_ID, INDEX_CARD_COLOR_SETTING, {
    name: "Index card default color",
    hint: "The starting color selected when a player creates an index-card question.",
    scope: "world",
    config: true,
    type: String,
    choices: QUESTION_NOTE_KINDS.index.colors,
    default: "white"
  });
  game.settings.register(MODULE_ID, INDEX_CARD_STYLE_SETTING, {
    name: "Index card default condition",
    hint: "The starting condition selected when a player creates an index-card question.",
    scope: "world",
    config: true,
    type: String,
    choices: QUESTION_NOTE_KINDS.index.variants,
    default: "blank"
  });
  game.settings.register(MODULE_ID, CLASSIFICATION_PIN_SIZE_SETTING, {
    name: "Classification pin size",
    hint: "The size in scene pixels of the physical pushpins shown on classified People clues.",
    scope: "world",
    config: true,
    type: Number,
    range: { min: 12, max: 64, step: 1 },
    default: DEFAULT_CLASSIFICATION_PIN_SIZE,
    onChange: refreshAllClueClassificationPins
  });
  game.settings.register(MODULE_ID, CLASSIFICATION_PIN_VERTICAL_OFFSET_SETTING, {
    name: "Classification pin vertical offset",
    hint: "Moves every classification pushpin in scene pixels. Positive values move pins down; negative values move them up.",
    scope: "world",
    config: true,
    type: Number,
    range: { min: -48, max: 48, step: 1 },
    default: 0,
    onChange: refreshAllClueClassificationPins
  });
  CONFIG.Actor.dataModels[CLUE_TYPE] = ClueDataModel;
  installClueCreateDialogType();
  installNativeActorFallback();
  installClueTokenHud();
  installQuestionNoteDrawingHud();
  Actors.registerSheet(MODULE_ID, ClueSheet, {
    types: needsNativeActorFallback() ? [CLUE_TYPE, fallbackActorType()] : [CLUE_TYPE],
    makeDefault: !needsNativeActorFallback(),
    label: "DGCLUES.Sheet.Title"
  });
});

Hooks.once("ready", () => {
  installClueTokenDoubleClick();
  installQuestionNoteTextStyle();
  refreshQuestionNoteTextStyles();
  console.info(`${MODULE_ID} | Clue Actor type is ready.`);
});

Hooks.on("drawToken", updateClueClassificationPin);
Hooks.on("refreshToken", updateClueClassificationPin);
Hooks.on("updateToken", (document) => updateClueClassificationPin(document.object));
Hooks.on("updateActor", refreshAllClueClassificationPins);
Hooks.on("renderTokenConfig", addPrototypePinAppearanceFields);
Hooks.on("renderPrototypeTokenConfig", addPrototypePinAppearanceFields);
Hooks.on("renderTokenConfigV2", addPrototypePinAppearanceFields);
Hooks.on("renderPrototypeTokenConfigV2", addPrototypePinAppearanceFields);
Hooks.on("renderSceneConfig", addMurderboardSceneField);
Hooks.on("renderSceneConfigV2", addMurderboardSceneField);
Hooks.on("renderSceneDirectory", addClueDashboardSceneDirectoryButton);
Hooks.on("renderSceneDirectoryV2", addClueDashboardSceneDirectoryButton);
Hooks.on("renderApplicationV2", addClueDashboardSceneDirectoryButton);
Hooks.on("renderDrawingConfig", addQuestionNoteDrawingFields);
Hooks.on("renderDrawingConfigV2", addQuestionNoteDrawingFields);
Hooks.on("updateDrawing", syncQuestionNoteTileFromDrawing);
Hooks.on("updateTile", syncQuestionNoteDrawingFromTile);
Hooks.on("deleteDrawing", deleteQuestionNoteTile);
Hooks.on("deleteTile", deleteQuestionNoteDrawing);
Hooks.on("getSceneControlButtons", (controls) => {
  const drawings = controls.drawings;
  if (!drawings?.tools) return;
  const order = Object.keys(drawings.tools).length;
  drawings.tools.dgStickyNote = {
    name: "dgStickyNote",
    title: "Create Sticky Note",
    icon: "fa-solid fa-note-sticky",
    order,
    button: true,
    visible: true,
    onChange: () => createBoardNote("sticky")
  };
  drawings.tools.dgIndexCard = {
    name: "dgIndexCard",
    title: "Create Index Card",
    icon: "fa-solid fa-rectangle-list",
    order: order + 1,
    button: true,
    visible: true,
    onChange: () => createBoardNote("index")
  };
});

Hooks.once("canvasReady", () => {
  installClueTokenDoubleClick();
  installQuestionNoteTextStyle();
  refreshQuestionNoteTextStyles();
  refreshAllClueClassificationPins();
});
