-- New ticket options: fallback categories (upstream #472), conditional ping roles (#386),
-- per-role ticket limits (#385), optional close requests (#406), ghost pings (#346),
-- holidays (#403) and a ticket number offset (#416).

-- AlterTable
ALTER TABLE "categories" ADD COLUMN     "fallbackCategories" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "pingRoleRules" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "roleLimits" JSONB NOT NULL DEFAULT '[]';

-- AlterTable
ALTER TABLE "guilds" ADD COLUMN     "closeRequests" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "ghostPing" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "holidays" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "ticketNumberOffset" INTEGER NOT NULL DEFAULT 0;

