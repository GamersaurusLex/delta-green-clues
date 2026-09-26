# Clues

Clues adds **Clue** as a native Actor type in Foundry VTT 14. It lets an ordinary Foundry scene serve as an investigation board: create Clues in the normal Actors directory, link each one to a Journal Entry or Journal Page, then drag them onto any scene as ordinary tokens.

## What it does

- Registers a persistent `Clue` Actor subtype without changing system files.
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
- Any Foundry VTT game system that supports Foundry's standard Actor and Token documents
