-- Per-category overrides for guild settings (upstream #536) and per-category blocked roles (upstream PR #495).
-- New columns are NULL (use the guild setting) or empty, so behaviour doesn't change.
-- MySQL JSON columns can't have a default value, so blockedRoles is added as nullable, filled in, then made NOT NULL.

-- AlterTable
ALTER TABLE `categories` ADD COLUMN `archive` BOOLEAN NULL,
    ADD COLUMN `autoClose` INTEGER NULL,
    ADD COLUMN `blockedRoles` JSON NULL,
    ADD COLUMN `claimButton` BOOLEAN NULL,
    ADD COLUMN `closeButton` BOOLEAN NULL,
    ADD COLUMN `staleAfter` INTEGER NULL;

UPDATE `categories` SET `blockedRoles` = JSON_ARRAY();

ALTER TABLE `categories` MODIFY `blockedRoles` JSON NOT NULL;
