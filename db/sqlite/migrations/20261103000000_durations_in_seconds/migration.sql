-- Durations (autoClose, staleAfter, cooldown) are now stored in seconds instead of milliseconds.
-- The bot converts to and from milliseconds, so the API, exports and dumps are unchanged.
-- See upstream #530 and #673.

-- Convert existing values
UPDATE "guilds" SET "autoClose" = CASE WHEN "autoClose" IS NULL THEN NULL WHEN "autoClose" <= 0 THEN 0 WHEN "autoClose" < 1000 THEN 1 ELSE CAST(ROUND("autoClose" / 1000.0) AS INTEGER) END, "staleAfter" = CASE WHEN "staleAfter" IS NULL THEN NULL WHEN "staleAfter" <= 0 THEN 0 WHEN "staleAfter" < 1000 THEN 1 ELSE CAST(ROUND("staleAfter" / 1000.0) AS INTEGER) END;
UPDATE "categories" SET "cooldown" = CASE WHEN "cooldown" IS NULL THEN NULL WHEN "cooldown" <= 0 THEN 0 WHEN "cooldown" < 1000 THEN 1 ELSE CAST(ROUND("cooldown" / 1000.0) AS INTEGER) END;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_guilds" (
    "autoClose" INTEGER NOT NULL DEFAULT 43200,
    "autoTag" TEXT NOT NULL DEFAULT '[]',
    "archive" BOOLEAN NOT NULL DEFAULT true,
    "blocklist" TEXT NOT NULL DEFAULT '[]',
    "claimButton" BOOLEAN NOT NULL DEFAULT false,
    "closeButton" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "errorColour" TEXT NOT NULL DEFAULT 'Red',
    "footer" TEXT DEFAULT 'Discord Tickets by eartharoid',
    "id" TEXT NOT NULL PRIMARY KEY,
    "locale" TEXT NOT NULL DEFAULT 'en-GB',
    "logChannel" TEXT,
    "primaryColour" TEXT NOT NULL DEFAULT '#009999',
    "staleAfter" INTEGER,
    "successColour" TEXT NOT NULL DEFAULT 'Green',
    "workingHours" TEXT NOT NULL DEFAULT '["UTC", ["00:00","23:59"], ["00:00","23:59"], ["00:00","23:59"], ["00:00","23:59"], ["00:00","23:59"], ["00:00","23:59"], ["00:00","23:59"]]'
);
INSERT INTO "new_guilds" ("archive", "autoClose", "autoTag", "blocklist", "claimButton", "closeButton", "createdAt", "errorColour", "footer", "id", "locale", "logChannel", "primaryColour", "staleAfter", "successColour", "workingHours") SELECT "archive", "autoClose", "autoTag", "blocklist", "claimButton", "closeButton", "createdAt", "errorColour", "footer", "id", "locale", "logChannel", "primaryColour", "staleAfter", "successColour", "workingHours" FROM "guilds";
DROP TABLE "guilds";
ALTER TABLE "new_guilds" RENAME TO "guilds";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

