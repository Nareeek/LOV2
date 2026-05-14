ALTER TABLE "Character"
  ADD COLUMN "petFood" INTEGER NOT NULL DEFAULT 10;

CREATE TABLE "CharacterPet" (
  "id" TEXT NOT NULL,
  "characterId" TEXT NOT NULL,
  "petId" TEXT NOT NULL,
  "food" INTEGER NOT NULL DEFAULT 0,
  "experience" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CharacterPet_pkey" PRIMARY KEY ("id")
);

INSERT INTO "CharacterPet" ("id", "characterId", "petId", "food", "experience", "createdAt", "updatedAt")
SELECT
  concat('pet_', md5(concat("Character"."id", ':', pets."petId"))),
  "Character"."id",
  pets."petId",
  0,
  0,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "Character"
CROSS JOIN (
  VALUES ('foxling'), ('wyrmlet'), ('kitten'), ('ember-whelp')
) AS pets("petId")
ON CONFLICT DO NOTHING;

ALTER TABLE "CombatEncounter"
  ADD COLUMN "source" TEXT NOT NULL DEFAULT 'legacy';

ALTER TABLE "InventoryStack" DROP CONSTRAINT IF EXISTS "InventoryStack_characterId_itemId_key";
DROP INDEX IF EXISTS "InventoryStack_characterId_itemId_key";

INSERT INTO "InventoryStack" (
  "id",
  "characterId",
  "itemId",
  "quantity",
  "enhancementLevel",
  "equippedSlot",
  "createdAt",
  "updatedAt"
)
SELECT
  concat(original."id", '_copy_', copies.copy_number),
  original."characterId",
  original."itemId",
  1,
  0,
  NULL,
  original."createdAt",
  CURRENT_TIMESTAMP
FROM "InventoryStack" original
CROSS JOIN LATERAL generate_series(2, GREATEST(original."quantity", 1)) AS copies(copy_number)
WHERE original."quantity" > 1;

UPDATE "InventoryStack"
SET "quantity" = 1
WHERE "quantity" > 1;

CREATE INDEX "InventoryStack_characterId_itemId_idx" ON "InventoryStack"("characterId", "itemId");
CREATE UNIQUE INDEX "CharacterPet_characterId_petId_key" ON "CharacterPet"("characterId", "petId");
ALTER TABLE "CharacterPet" ADD CONSTRAINT "CharacterPet_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;
