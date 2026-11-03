-- Webhooks for ticket events (upstream #474). The secret is encrypted by the bot.

-- AlterTable
ALTER TABLE "guilds" ADD COLUMN "webhookSecret" TEXT;
ALTER TABLE "guilds" ADD COLUMN "webhookUrl" TEXT;

