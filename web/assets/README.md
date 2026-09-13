# Artwork folder

Put PNG pictures here and the game uses them automatically:

```
web/assets/units/<unit id>.png        e.g. units/warrior.png, units/legion is NOT needed (unique units reuse the base unit's id)
web/assets/buildings/<building id>.png
web/assets/wonders/<wonder id>.png
web/assets/national/<national wonder id>.png
web/assets/natural/<natural wonder id>.png
web/assets/leaders/<leader id>.png
web/assets/resources/<resource id>.png
web/assets/civs/<civ id>.png
```

`PROMPTS.md` lists every file the game looks for, with a ready-made prompt for an AI image generator.
`manifest.json` is the same list in machine-readable form. Regenerate both with `node tools/asset-manifest.js`.
