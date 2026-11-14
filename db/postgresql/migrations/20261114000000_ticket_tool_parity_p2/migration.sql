-- Ticket Tool parity, P2: creator role changes, lifecycle messages, staff threads, /move options, closed channel
-- names, per-category working hours, server-wide and closed ticket limits, and button customisation.
-- Every new option is off (or matches the old behaviour) for existing servers and categories.

-- AlterTable
ALTER TABLE "categories" ADD COLUMN "buttonLabel" TEXT;
ALTER TABLE "categories" ADD COLUMN "buttonStyle" TEXT;
ALTER TABLE "categories" ADD COLUMN "closedChannelName" TEXT;
ALTER TABLE "categories" ADD COLUMN "closedLimit" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "categories" ADD COLUMN "closedMessage" TEXT;
ALTER TABLE "categories" ADD COLUMN "creatorRoles" JSONB NOT NULL DEFAULT '{}';
ALTER TABLE "categories" ADD COLUMN "openDm" TEXT;
ALTER TABLE "categories" ADD COLUMN "outOfHours" TEXT NOT NULL DEFAULT 'WARN';
ALTER TABLE "categories" ADD COLUMN "reopenedMessage" TEXT;
ALTER TABLE "categories" ADD COLUMN "staffThread" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "categories" ADD COLUMN "workingHours" JSONB;

-- AlterTable
ALTER TABLE "guilds" ADD COLUMN "buttons" JSONB NOT NULL DEFAULT '{}';
ALTER TABLE "guilds" ADD COLUMN "moveRelease" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "guilds" ADD COLUMN "moveResend" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "guilds" ADD COLUMN "userLimit" INTEGER NOT NULL DEFAULT 0;
