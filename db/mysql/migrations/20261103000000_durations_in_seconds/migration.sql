-- Durations (autoClose, staleAfter, cooldown) are now stored in seconds instead of milliseconds.
-- The bot converts to and from milliseconds, so the API, exports and dumps are unchanged.
-- See upstream #530 and #673.

-- Convert existing values
UPDATE `guilds` SET `autoClose` = CASE WHEN `autoClose` IS NULL THEN NULL WHEN `autoClose` <= 0 THEN 0 WHEN `autoClose` < 1000 THEN 1 ELSE ROUND(`autoClose` / 1000) END, `staleAfter` = CASE WHEN `staleAfter` IS NULL THEN NULL WHEN `staleAfter` <= 0 THEN 0 WHEN `staleAfter` < 1000 THEN 1 ELSE ROUND(`staleAfter` / 1000) END;
UPDATE `categories` SET `cooldown` = CASE WHEN `cooldown` IS NULL THEN NULL WHEN `cooldown` <= 0 THEN 0 WHEN `cooldown` < 1000 THEN 1 ELSE ROUND(`cooldown` / 1000) END;

-- AlterTable
ALTER TABLE `guilds` MODIFY `autoClose` INTEGER NOT NULL DEFAULT 43200;

