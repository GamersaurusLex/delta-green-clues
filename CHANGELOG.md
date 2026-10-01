# Changelog

## 0.3.22 — 2026-10-01

- Corrected the Clue Dashboard grid so selection, clue/journal, token visibility, Journal ownership, and page controls occupy matching columns.

## 0.3.21 — 2026-10-01

- Made the Clue Dashboard's clue list independently scrollable while keeping its audience selector and bulk-action controls visible.

## 0.3.20

- Added the GM-only Clue Dashboard for marked Murderboard scenes. It bulk-manages clue-token visibility and Journal Entry/Page ownership using Foundry's native ownership levels.
- Added a Scene Configuration Murderboard checkbox and a Clue Dashboard source-folder setting.

## 0.3.19 — 2026-09-28

- Replaced the hard-coded question-note paper gutters with a 20px world-level Text Inset setting.
- Added an optional per-note Text Inset Override to the native Drawing Configuration sheet. Blank values inherit the world setting.

## 0.3.18 — 2026-09-28

- Corrected question-note resizing so the Tile dimensions control the inset Drawing writing area rather than expanding to fit the current text size.
- When a player makes a note smaller, its font is automatically reduced to keep the text within the paper gutters. The Tile grows only if the note cannot fit even at Foundry's 8px minimum Drawing font size.

## 0.3.17 — 2026-09-28

- Question-note paper now expands to preserve artwork gutters around the text. This is enforced when creating or editing a note and when either linked document is resized, so handwritten text cannot spill beyond the card or sticky-note art.

## 0.3.16 — 2026-09-28

- Added a native-HUD pencil action on the right rail of question notes. It opens a roomy multiline editor for the note text without changing the normal Foundry Drawing configuration workflow.

## 0.3.15 — 2026-09-28

- Removed Foundry's automatic text outline and drop shadow from question-note Drawings only. Ordinary Foundry Drawings retain their native readability treatment.

## 0.3.14 — 2026-09-28

- Fixed linked question-note alignment by using the same upper-left origin for the Tile artwork and editable Drawing text.

## 0.3.13 — 2026-09-28

- Corrected question-note rendering: each editable Drawing now controls a linked native Tile carrying the paper art.
- The artwork is no longer tinted by Foundry's Drawing fill color, and resizing either the note text or its background Tile now scales the full paper image instead of cropping or tiling it.

## 0.3.12 — 2026-09-28

- Replaced the plain question-note Drawings with native Foundry V14 textured Drawings using the supplied sticky-note and index-card art.
- Sticky Notes now offer eight colors and separate Flat / Flip style choices; Index Cards offer six colors and separate Blank / Coffee Stains / Grunge condition choices.
- Added world defaults for each question-note color and style, plus per-Drawing color/style overrides in the native Drawing Configuration sheet.

## 0.3.11 — 2026-09-28

- Added a world-level classification pin vertical offset, applied before any token or prototype adjustment.

## 0.3.10 — 2026-09-28

- Reduced the default classification pin size from 26px to 19px.

## 0.3.9 — 2026-09-28

- Fixed Appearance-tab control placement to target Foundry V14's tab content pane instead of the navigation tab.

## 0.3.8 — 2026-09-28

- Added pin size and vertical-position adjustments to the Appearance tab. Placed-token controls affect only that token; Prototype Token controls become defaults for future tokens of that Actor.

## 0.3.7 — 2026-09-28

- Added a native world setting for classification pin size, adjustable from 12 to 64 scene pixels.

## 0.3.6 — 2026-09-28

- Made classification pushpins a fixed scene-pixel size so resizing a clue card no longer enlarges its pin.

## 0.3.5 — 2026-09-28

- Reduced and raised the acrylic classification pins so they sit on the top edge of a clue card instead of obscuring its portrait.

## 0.3.4 — 2026-09-28

- Added the Friendly person classification with a green acrylic pushpin.

## 0.3.3 — 2026-09-28

- Replaced the vector classification pin overlays with the matching supplied red, blue, and yellow acrylic pushpin art.

## 0.3.2 — 2026-09-28

- Show the native Person Classification palette on every Clue token. Choosing a colored classification automatically categorizes that Clue Actor as People, removing a needless setup step.

## 0.3.1 — 2026-09-28

- Moved the native Sticky Note and Index Card drawing controls into Clues. The handwriting-font module no longer owns investigation-board features.

## 0.3.0 — 2026-09-28

- Added an Investigation Board Category to the native Clue sheet: People, Places, Evidence, or Questions.
- Added a native Foundry V14 Token HUD for Clues. Clue tokens retain the normal left rail but hide combat, targeting, movement, and status-effect controls that do not apply to investigation cards.
- Added the native palette-based Person Classification control for People clues: Suspect / Threat, Witness / Contact, or Victim / Missing.
- Classification is stored on the scene token, allowing the same Clue Actor to carry a different board status on different scenes.
- Added a small colored pushpin overlay to People clues with a classification.

## 0.2.1 — 2026-09-26

- Fixed the PF2e New Actor dialog so **Clue** appears alongside all normal actor types.

## 0.2.0 — 2026-09-26

- Made Clues system-agnostic: it can now be enabled in worlds running any supported system.
- Removed the Delta Green-only manifest requirement and runtime guards.
- Renamed the public module title to **Clues**.

## 0.1.1 — 2026-09-26

- Fixed the published manifest so Foundry and Forge can install the module correctly.

## 0.1.0 — 2026-09-26

- First prototype of the native Delta Green **Clue** Actor type.
- Added a linked Journal Entry/Journal Page field and clue-card sheet.
- Added ordinary Actor-token support for using scenes as investigation boards.
- Double-clicking a Clue token opens its linked handout instead of its Actor sheet.
