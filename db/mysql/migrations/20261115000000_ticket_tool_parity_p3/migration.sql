-- Ticket Tool parity, P3: automations (what happens when the creator leaves, and inactivity rules), thread
-- tickets, auto-responses (wildcard triggers and DMs), a stored history of dashboard changes, and dashboard roles.
-- Every new option matches the old behaviour for existing servers, categories and tags.

-- AlterTable
-- MySQL JSON columns can't have a default value, so JSON columns are added as nullable, filled in, then made NOT NULL.
ALTER TABLE `categories` ADD COLUMN `automations` JSON NULL;
UPDATE `categories` SET `automations` = JSON_ARRAY();
ALTER TABLE `categories` MODIFY `automations` JSON NOT NULL;
ALTER TABLE `categories` ADD COLUMN `channelType` VARCHAR(191) NOT NULL DEFAULT 'CHANNEL';
ALTER TABLE `categories` ADD COLUMN `onCreatorLeave` VARCHAR(191) NOT NULL DEFAULT 'CLOSE';
ALTER TABLE `categories` ADD COLUMN `threadParent` VARCHAR(19) NULL;

-- AlterTable
ALTER TABLE `guilds` ADD COLUMN `dashboardRoles` JSON NULL;
UPDATE `guilds` SET `dashboardRoles` = JSON_ARRAY();
ALTER TABLE `guilds` MODIFY `dashboardRoles` JSON NOT NULL;

-- AlterTable
ALTER TABLE `tags` ADD COLUMN `autoDm` BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE `tags` ADD COLUMN `matchType` VARCHAR(191) NOT NULL DEFAULT 'REGEX';

-- AlterTable
ALTER TABLE `tickets` ADD COLUMN `automatedAt` DATETIME(3) NULL;
ALTER TABLE `tickets` ADD COLUMN `waitingOn` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `audit_logs` (
    `action` VARCHAR(191) NOT NULL,
    `changes` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `guildId` VARCHAR(19) NOT NULL,
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `targetId` VARCHAR(191) NOT NULL,
    `targetName` VARCHAR(191) NULL,
    `targetType` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(19) NOT NULL,

    INDEX `audit_logs_guildId_createdAt_idx`(`guildId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `audit_logs` ADD CONSTRAINT `audit_logs_guildId_fkey` FOREIGN KEY (`guildId`) REFERENCES `guilds`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

