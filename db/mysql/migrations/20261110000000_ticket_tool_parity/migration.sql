-- Ticket Tool parity, batch A: kept closed channels, claiming options, transcript channel, log event choices,
-- and the opening message style (embed, plain text or off).
-- Every new option is off (or matches the old behaviour) for existing servers and categories.

-- AlterTable
ALTER TABLE `categories` ADD COLUMN `claimHide` BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE `categories` ADD COLUMN `claimReleaseLocked` BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE `categories` ADD COLUMN `claimTakeover` BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE `categories` ADD COLUMN `claimedCategory` VARCHAR(19);
ALTER TABLE `categories` ADD COLUMN `claimedChannelName` VARCHAR(191);
ALTER TABLE `categories` ADD COLUMN `keepClosedFor` INTEGER;
ALTER TABLE `categories` ADD COLUMN `openingStyle` VARCHAR(191) NOT NULL DEFAULT 'EMBED';

-- AlterTable
-- MySQL JSON columns can't have a default value, so logExclude is added as nullable, filled in, then made NOT NULL.
ALTER TABLE `guilds` ADD COLUMN `logExclude` JSON NULL;
UPDATE `guilds` SET `logExclude` = JSON_ARRAY();
ALTER TABLE `guilds` MODIFY `logExclude` JSON NOT NULL;
ALTER TABLE `guilds` ADD COLUMN `transcriptChannel` VARCHAR(19);
ALTER TABLE `guilds` ADD COLUMN `transcriptDm` BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE `tickets` ADD COLUMN `channelDeleteAt` DATETIME(3);
