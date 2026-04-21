CREATE TYPE "QuestStatus" AS ENUM ('available', 'active', 'completed', 'claimed');
CREATE TYPE "TravelStatus" AS ENUM ('traveling', 'arrived', 'claimed');
CREATE TYPE "CombatStatus" AS ENUM ('pending', 'won', 'lost');
CREATE TYPE "PaymentStatus" AS ENUM ('created', 'paid', 'failed', 'refunded');

CREATE TABLE "User" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "displayName" TEXT NOT NULL,
  "passwordHash" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Session" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Character" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "raceId" TEXT NOT NULL,
  "level" INTEGER NOT NULL DEFAULT 1,
  "experience" INTEGER NOT NULL DEFAULT 0,
  "rebirths" INTEGER NOT NULL DEFAULT 0,
  "health" INTEGER NOT NULL,
  "maxHealth" INTEGER NOT NULL,
  "unspentStatPoints" INTEGER NOT NULL DEFAULT 0,
  "stats" JSONB NOT NULL,
  "gold" INTEGER NOT NULL DEFAULT 120,
  "gems" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Character_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "InventoryStack" (
  "id" TEXT NOT NULL,
  "characterId" TEXT NOT NULL,
  "itemId" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL DEFAULT 1,
  "equippedSlot" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "InventoryStack_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "QuestProgress" (
  "id" TEXT NOT NULL,
  "characterId" TEXT NOT NULL,
  "questId" TEXT NOT NULL,
  "status" "QuestStatus" NOT NULL DEFAULT 'active',
  "progress" INTEGER NOT NULL DEFAULT 0,
  "target" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "QuestProgress_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TravelTask" (
  "id" TEXT NOT NULL,
  "characterId" TEXT NOT NULL,
  "locationId" TEXT NOT NULL,
  "questId" TEXT,
  "status" "TravelStatus" NOT NULL DEFAULT 'traveling',
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completesAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TravelTask_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CombatEncounter" (
  "id" TEXT NOT NULL,
  "characterId" TEXT NOT NULL,
  "enemyId" TEXT NOT NULL,
  "questId" TEXT,
  "status" "CombatStatus" NOT NULL DEFAULT 'pending',
  "log" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CombatEncounter_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CurrencyLedgerEntry" (
  "id" TEXT NOT NULL,
  "characterId" TEXT NOT NULL,
  "currency" TEXT NOT NULL,
  "amount" INTEGER NOT NULL,
  "reason" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CurrencyLedgerEntry_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PaymentOrder" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "stripeSessionId" TEXT,
  "status" "PaymentStatus" NOT NULL DEFAULT 'created',
  "gems" INTEGER NOT NULL,
  "amountMinor" INTEGER NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'usd',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PaymentOrder_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PaymentWebhookEvent" (
  "id" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "payloadSummary" JSONB NOT NULL,
  CONSTRAINT "PaymentWebhookEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "GameEvent" (
  "id" TEXT NOT NULL,
  "characterId" TEXT,
  "type" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "GameEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "Session_tokenHash_key" ON "Session"("tokenHash");
CREATE UNIQUE INDEX "Character_userId_name_key" ON "Character"("userId", "name");
CREATE UNIQUE INDEX "InventoryStack_characterId_itemId_key" ON "InventoryStack"("characterId", "itemId");
CREATE UNIQUE INDEX "QuestProgress_characterId_questId_key" ON "QuestProgress"("characterId", "questId");
CREATE UNIQUE INDEX "PaymentOrder_stripeSessionId_key" ON "PaymentOrder"("stripeSessionId");

ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Character" ADD CONSTRAINT "Character_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InventoryStack" ADD CONSTRAINT "InventoryStack_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "QuestProgress" ADD CONSTRAINT "QuestProgress_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TravelTask" ADD CONSTRAINT "TravelTask_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CombatEncounter" ADD CONSTRAINT "CombatEncounter_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CurrencyLedgerEntry" ADD CONSTRAINT "CurrencyLedgerEntry_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PaymentOrder" ADD CONSTRAINT "PaymentOrder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GameEvent" ADD CONSTRAINT "GameEvent_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;

