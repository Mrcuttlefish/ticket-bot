-- Ticket Tool parity, batch A: kept closed channels, claiming options, transcript channel, log event choices,
-- and the opening message style (embed, plain text or off).
-- Every new option is off (or matches the old behaviour) for existing servers and categories.

-- AlterTable
ALTER TABLE "categories" ADD COLUMN "claimHide" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "categories" ADD COLUMN "claimReleaseLocked" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "categories" ADD COLUMN "claimTakeover" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "categories" ADD COLUMN "claimedCategory" TEXT;
ALTER TABLE "categories" ADD COLUMN "claimedChannelName" TEXT;
ALTER TABLE "categories" ADD COLUMN "keepClosedFor" INTEGER;
ALTER TABLE "categories" ADD COLUMN "openingStyle" TEXT NOT NULL DEFAULT 'EMBED';

-- AlterTable
ALTER TABLE "guilds" ADD COLUMN "logExclude" TEXT NOT NULL DEFAULT '[]';
ALTER TABLE "guilds" ADD COLUMN "transcriptChannel" TEXT;
ALTER TABLE "guilds" ADD COLUMN "transcriptDm" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "tickets" ADD COLUMN "channelDeleteAt" DATETIME;
