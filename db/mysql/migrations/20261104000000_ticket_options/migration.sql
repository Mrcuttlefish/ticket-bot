-- New ticket options: fallback categories (upstream #472), conditional ping roles (#386),
-- per-role ticket limits (#385), optional close requests (#406), ghost pings (#346),
-- holidays (#403) and a ticket number offset (#416).

-- MySQL JSON columns can't have a default value, so the columns are added as nullable,
-- filled in, and then made NOT NULL. Prisma sets the default for new rows.

-- AlterTable
ALTER TABLE `categories` ADD COLUMN `fallbackCategories` JSON NULL,
    ADD COLUMN `pingRoleRules` JSON NULL,
    ADD COLUMN `roleLimits` JSON NULL;

UPDATE `categories` SET `fallbackCategories` = JSON_ARRAY(), `pingRoleRules` = JSON_ARRAY(), `roleLimits` = JSON_ARRAY();

ALTER TABLE `categories` MODIFY `fallbackCategories` JSON NOT NULL,
    MODIFY `pingRoleRules` JSON NOT NULL,
    MODIFY `roleLimits` JSON NOT NULL;

-- AlterTable
ALTER TABLE `guilds` ADD COLUMN `closeRequests` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `ghostPing` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `holidays` JSON NULL,
    ADD COLUMN `ticketNumberOffset` INTEGER NOT NULL DEFAULT 0;

UPDATE `guilds` SET `holidays` = JSON_ARRAY();

ALTER TABLE `guilds` MODIFY `holidays` JSON NOT NULL;
