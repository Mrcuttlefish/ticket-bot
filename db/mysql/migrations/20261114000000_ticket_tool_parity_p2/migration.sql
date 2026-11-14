-- Ticket Tool parity, P2: creator role changes, lifecycle messages, staff threads, /move options, closed channel
-- names, per-category working hours, server-wide and closed ticket limits, and button customisation.
-- Every new option is off (or matches the old behaviour) for existing servers and categories.

-- AlterTable
-- MySQL JSON columns can't have a default value, so JSON columns are added as nullable, filled in, then made NOT NULL.
ALTER TABLE `categories` ADD COLUMN `buttonLabel` VARCHAR(191) NULL;
ALTER TABLE `categories` ADD COLUMN `buttonStyle` VARCHAR(191) NULL;
ALTER TABLE `categories` ADD COLUMN `closedChannelName` VARCHAR(191) NULL;
ALTER TABLE `categories` ADD COLUMN `closedLimit` INTEGER NOT NULL DEFAULT 0;
ALTER TABLE `categories` ADD COLUMN `closedMessage` TEXT NULL;
ALTER TABLE `categories` ADD COLUMN `creatorRoles` JSON NULL;
UPDATE `categories` SET `creatorRoles` = JSON_OBJECT();
ALTER TABLE `categories` MODIFY `creatorRoles` JSON NOT NULL;
ALTER TABLE `categories` ADD COLUMN `openDm` TEXT NULL;
ALTER TABLE `categories` ADD COLUMN `outOfHours` VARCHAR(191) NOT NULL DEFAULT 'WARN';
ALTER TABLE `categories` ADD COLUMN `reopenedMessage` TEXT NULL;
ALTER TABLE `categories` ADD COLUMN `staffThread` BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE `categories` ADD COLUMN `workingHours` JSON NULL;

-- AlterTable
ALTER TABLE `guilds` ADD COLUMN `buttons` JSON NULL;
UPDATE `guilds` SET `buttons` = JSON_OBJECT();
ALTER TABLE `guilds` MODIFY `buttons` JSON NOT NULL;
ALTER TABLE `guilds` ADD COLUMN `moveRelease` BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE `guilds` ADD COLUMN `moveResend` BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE `guilds` ADD COLUMN `userLimit` INTEGER NOT NULL DEFAULT 0;
