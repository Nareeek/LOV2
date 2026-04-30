# Game UI Component Map

- `GameShell.tsx` — top-level game state, stage selection, intent handling, replay/reward timing.
- `GameWindowRouter.tsx` — maps world/info window ids to concrete window components.
- `GamePanels.tsx` — barrel export for the panel modules.
- `GameWindowShell.tsx` — shared framed world-window chrome.
- `GameWorldWindows.tsx` — tavern, arena, store, forge, tower, boatman, fountain, journal, settings.
- `GameStages.tsx` — travel, combat, and combat result screens.
- `GameCharacterPanels.tsx` — character sheet, hero info, paperdoll, inventory, item hover cards.
- `GamePanels.data.ts` — static labels, panel copy, option lists, and UI constants.
- `GamePanels.logic.ts` — stat breakdowns, inventory ordering, drag payload readers, formatting helpers.
- `HudFrame.tsx`, `TaskRail.tsx`, `ActionDock.tsx`, `BottomTray.tsx` — stage chrome pieces.
- `ui.tsx` — small shared UI atoms.

When adding a feature, keep data in `GamePanels.data.ts`, pure display helpers in `GamePanels.logic.ts`, and only component markup/state in the component file.
