# Art Pipeline Agent Instructions

This package contains asset manifest and metadata helpers.

## Key Files

- `src/index.ts`
  - art manifest records
  - asset IDs, public paths, kinds, license labels, and source/provenance notes

- `../../scripts/validate-assets.mjs`
  - checks generated asset files exist
  - checks game-data asset references against the art manifest

## Responsibility

The art pipeline owns shippable asset metadata and validation helpers.

Correct place for:

- asset manifest entries
- asset ID to public path mapping
- asset kind and license metadata
- prompt/source/provenance notes

## Rules

- Do not inspect `_incoming_assets*` folders unless the task is specifically about asset provenance, asset archival, or replacing/validating those intake files.
- Keep asset IDs stable once referenced by game data.
- Do not put gameplay rules or UI component logic here.
- Do not reference local-only intake paths as runtime asset paths.
- If adding or changing asset references, keep `packages/game-data/src/index.ts` and the art manifest in sync.
- Preserve provenance notes for generated, owned, or third-party-licensed assets.

## Checks

```bash
pnpm --filter @lov2/art-pipeline check
pnpm assets:check
```
