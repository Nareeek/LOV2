# Missing And Deferred Assets

## Resolved Replacements

- `scene-character`: resolved with `_incoming_assets_missing/scenes/scene-character.jpg`.
- `scene-pets`: resolved with `_incoming_assets_missing/scenes/scene-pets.jpg`.
- `scene-journal`: resolved with `_incoming_assets_missing/scenes/scene-journal.jpg`.
- `icon-wyvern`: resolved with `_incoming_assets_transparent/items/icon-wyvern.png`.

## Missing Replacements

- No currently tracked v1 asset IDs are missing generated replacements.

## Deferred Wiring

- Enemy art for `mist-bandit`, `harbor-wraith`, and the extra rock golem was copied and mapped in `artManifest`, but is not wired into game data yet.
- Extra pet art for cat, wolf, and generic dragon was copied and mapped in `artManifest`, but is not wired into game data yet.
- Extra character portraits/classes were copied but are not wired into character creation yet.
- UI, appearance, achievement, gem, and VFX assets were copied and registered, but current React components still use code/CSS-rendered UI for those surfaces.

## Future Improvements

- `EnemyDefinition` and a future `PetDefinition` could later gain `assetId` fields.
- Character creation could later map class/gender selections to generated character asset IDs.
- UI assets need a design pass before replacing CSS/vector UI primitives.
