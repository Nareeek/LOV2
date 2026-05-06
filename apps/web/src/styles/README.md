# Style Map

`../styles.css` is the cascade entrypoint. Keep imports ordered from broadest/base styles to narrowest overrides.

- `00-base.css` — global tokens, reset, legacy base surfaces.
- `10-unified-shell.css` and `20-reference-shell.css` — older shell passes kept in cascade order.
- `30-shell-reset-base.css` — shell grid/chrome grammar.
- `31-lov-auth-creation.css` — auth and character creation screens.
- `32-lov-hud-scene.css` — HUD, bottom tray base, scene hotspots, window base.
- `33-lov-window-world-panels.css` — tavern, store, forge, arena, tower, boatman, fountain, journal.
- `34-lov-travel-combat-reward.css` — travel, combat, and reward screens.
- `35-lov-sheet-profile-paperdoll.css` — character sheet, inventory, pets, profile, paperdoll.
- `36-lov-responsive.css` — responsive rules from the reference surface pass.
- `40-*` — later visual polish passes grouped by feature.
- `50-bottom-tray-and-overrides.css` — final bottom tray and short-viewport arena overrides.
- `51-world-window-containment.css` — world/modal containment, compact arena, and enemy info window overrides.

When adding new styles, prefer the most specific feature file. Use `50-*` only for deliberate final overrides.
