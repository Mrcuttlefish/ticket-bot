-- Ticket Tool parity, P3: automations (what happens when the creator leaves, and inactivity rules), thread
-- tickets, auto-responses (wildcard triggers and DMs), a stored history of dashboard changes, and dashboard roles.
-- Every new option matches the old behaviour for existing servers, categories and tags.

-- AlterTable
ALTER TABLE "categories" ADD COLUMN "automations" TEXT NOT NULL DEFAULT '[]';
ALTER TABLE "categories" ADD COLUMN "channelType" TEXT NOT NULL DEFAULT 'CHANNEL';
ALTER TABLE "categories" ADD COLUMN "onCreatorLeave" TEXT NOT NULL DEFAULT 'CLOSE';
ALTER TABLE "categories" ADD COLUMN "threadParent" TEXT;

-- AlterTable
ALTER TABLE "guilds" ADD COLUMN "dashboardRoles" TEXT NOT NULL DEFAULT '[]';

-- AlterTable
ALTER TABLE "tags" ADD COLUMN "autoDm" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "tags" ADD COLUMN "matchType" TEXT NOT NULL DEFAULT 'REGEX';

-- AlterTable
ALTER TABLE "tickets" ADD COLUMN "automatedAt" DATETIME;
ALTER TABLE "tickets" ADD COLUMN "waitingOn" TEXT;

-- CreateTable
CREATE TABLE "audit_logs" (
    "action" TEXT NOT NULL,
    "changes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "guildId" TEXT NOT NULL,
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "targetId" TEXT NOT NULL,
    "targetName" TEXT,
    "targetType" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    CONSTRAINT "audit_logs_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "guilds" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "audit_logs_guildId_createdAt_idx" ON "audit_logs"("guildId", "createdAt");
