-- Ticket Tool parity, P3: automations (what happens when the creator leaves, and inactivity rules), thread
-- tickets, auto-responses (wildcard triggers and DMs), a stored history of dashboard changes, and dashboard roles.
-- Every new option matches the old behaviour for existing servers, categories and tags.

-- AlterTable
ALTER TABLE "categories" ADD COLUMN     "automations" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "channelType" TEXT NOT NULL DEFAULT 'CHANNEL',
ADD COLUMN     "onCreatorLeave" TEXT NOT NULL DEFAULT 'CLOSE',
ADD COLUMN     "threadParent" VARCHAR(19);

-- AlterTable
ALTER TABLE "guilds" ADD COLUMN     "dashboardRoles" JSONB NOT NULL DEFAULT '[]';

-- AlterTable
ALTER TABLE "tags" ADD COLUMN     "autoDm" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "matchType" TEXT NOT NULL DEFAULT 'REGEX';

-- AlterTable
ALTER TABLE "tickets" ADD COLUMN     "automatedAt" TIMESTAMP(3),
ADD COLUMN     "waitingOn" TEXT;

-- CreateTable
CREATE TABLE "audit_logs" (
    "action" TEXT NOT NULL,
    "changes" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "guildId" VARCHAR(19) NOT NULL,
    "id" SERIAL NOT NULL,
    "targetId" TEXT NOT NULL,
    "targetName" TEXT,
    "targetType" TEXT NOT NULL,
    "userId" VARCHAR(19) NOT NULL,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "audit_logs_guildId_createdAt_idx" ON "audit_logs"("guildId", "createdAt");

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "guilds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

