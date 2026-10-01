# Clues

## Investigation-board question notes

The Drawing Controls toolbar includes native **Create Sticky Note** and **Create Index Card** buttons. Both create a linked native Tile and editable Foundry Drawing: the Tile supplies scalable paper art while the Drawing keeps the question text editable. Moving, resizing, or deleting either member of the pair updates the other.

The Drawing's writing area is inset from the paper artwork, preserving safe margins. Set the campaign default under **Question Note Text Inset** in the module settings; an individual note can override it on the native Drawing Configuration's Fill tab. Reducing a note's size automatically reduces its Drawing font as needed; the note does not grow back merely because its prior font size no longer fits.

- Sticky Notes: Blue, Green, Light Yellow, Peach, Pink, Purple, White, or Yellow; Flat or Flip.
- Index Cards: Blue, Green, Pink, Purple, White, or Yellow; Blank, Coffee Stains, or Grunge.

Choose the starting selection in the module's world settings. To change one existing question note, open its native Drawing Configuration sheet and use its appearance fields on the Fill tab.

Select a question note and use the pencil button on its native Drawing HUD to edit its text in a multiline editor. Foundry's ordinary Drawing Configuration remains available for its font, size, color, and other placement controls.

The linked paper automatically grows as needed to retain a visible writing gutter on all four sides of the text. This same minimum is enforced if either the Drawing or its Tile is resized.

Clues adds **Clue** as a native Actor type in Foundry VTT 14. It lets an ordinary Foundry scene serve as an investigation board: create Clues in the normal Actors directory, link each one to a Journal Entry or Journal Page, then drag them onto any scene as ordinary tokens.

## What it does

- Registers a persistent `Clue` Actor subtype where the active system permits it. PF2e explicitly disallows module-defined Actor subtypes, so there Clues are created as native NPC Actors marked internally as Clues; the Actors directory, ownership, tokens, clue sheet, and player workflow remain the same.
- Provides a compact clue-card sheet with a linked-handout picker and an **Open Handout** control.
- Uses Foundry’s ordinary Actor ownership, folder, search, duplicate, delete, token, and visibility behaviors.
- Supports any number of tokens for a clue across any number of scenes.

## Player setup

Players need Foundry’s ordinary **Create New Actors** and **Create New Journal Entries** permissions if you want them to make their own Clues and handouts. A player can only choose Journal Entries or Pages for which they are an Owner; normal Actor ownership controls who can see, move, and edit each Clue.

## Use

1. Create an Actor and choose **Clue**.
2. Set its image and choose a linked Journal Entry or Journal Page on its clue card.
3. Configure Actor ownership normally.
4. Drag the Clue from the Actors directory onto any scene.

Double-clicking a Clue token opens its linked handout instead of the clue-card sheet. The normal Token Configuration window controls whether a clue token is visible to players. No separate board, sidebar, map-note system, or PDF workflow is involved.

## Compatibility

- Foundry VTT 14
- Any Foundry VTT game system that supports Foundry's standard Actor and Token documents. Systems that reject module Actor subtypes use a compatible native-Actor fallback.
