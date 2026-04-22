ALTER TABLE "Character"
ADD COLUMN "gender" TEXT NOT NULL DEFAULT 'male',
ADD COLUMN "classId" TEXT NOT NULL DEFAULT 'swordsman';

ALTER TABLE "Character"
ALTER COLUMN "energy" SET DEFAULT 30,
ALTER COLUMN "maxEnergy" SET DEFAULT 30;

UPDATE "Character"
SET "energy" = 30,
    "maxEnergy" = 30;
