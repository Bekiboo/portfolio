# Archive

Assets and code that the app no longer loads, kept here so nothing is lost.
Files in this folder are **outside** `static/` and `src/`, so they are neither
served nor bundled — they add zero weight to the site.

## `static-unused/`

The former contents of `static/sprites` and the stray `static/Biker/` folder.
The platformer only ever drew **10** of these images (punk character, one smoke
frame, one gun, one hand, one bullet); everything else was downloaded on every
page load for nothing (~3.4 MB, incl. a 2.2 MB `Icons/` set referenced nowhere).

Only the 10 used files were copied back into `static/sprites`. To restore a
character/effect, copy its files back and re-add the entry in
`src/routes/platformer-logic/spritesData.ts`.

## `platformer/Sprite.ts`

An unused `Sprite` class — never imported by the game (which draws via
`spritesData` + `getSprite` instead). Kept for reference.
