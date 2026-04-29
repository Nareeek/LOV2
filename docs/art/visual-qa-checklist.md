# Visual QA Checklist

- Backgrounds load through `artManifest` and render in the scene viewport.
- No fallback icon appears for mapped scene, character, enemy, pet, or item IDs.
- Hardcoded SVG paths are removed where appropriate; login and character creation use `assetPath()`.
- Character and enemy images are not cropped in creation, combat, inventory, profile, and pet views.
- JPG transparency needs review for characters, enemies, pets, VFX, icons, and UI parts that may need cutout alpha.
- Item icons remain readable at small chip/slot sizes.
- UI assets have no baked gibberish text or unusable placeholder labels.
- Assets have no watermarks, logos, or visible generator artifacts.
- Assets are not screenshots or copies from other original games.
- Generated art direction remains visually consistent with the existing LOV2 UI.

