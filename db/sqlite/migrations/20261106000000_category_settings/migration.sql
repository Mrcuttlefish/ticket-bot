-- Per-category overrides for guild settings (upstream #536) and per-category blocked roles (upstream PR #495).
-- New columns are NULL (use the guild setting) or empty, so behaviour doesn't change.

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_categories" (
    "archive" BOOLEAN,
    "autoClose" INTEGER,
    "blockedRoles" TEXT NOT NULL DEFAULT '[]',
    "channelName" TEXT NOT NULL,
    "claimButton" BOOLEAN,
    "claiming" BOOLEAN NOT NULL DEFAULT false,
    "closeButton" BOOLEAN,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cooldown" INTEGER,
    "customTopic" TEXT,
    "description" TEXT NOT NULL,
    "discordCategory" TEXT NOT NULL,
    "emoji" TEXT NOT NULL,
    "enableFeedback" BOOLEAN NOT NULL DEFAULT false,
    "fallbackCategories" TEXT NOT NULL DEFAULT '[]',
    "guildId" TEXT NOT NULL,
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "image" TEXT,
    "memberLimit" INTEGER NOT NULL DEFAULT 1,
    "name" TEXT NOT NULL,
    "openingMessage" TEXT NOT NULL,
    "pingRoleRules" TEXT NOT NULL DEFAULT '[]',
    "pingRoles" TEXT NOT NULL DEFAULT '[]',
    "ratelimit" INTEGER,
    "requiredRoles" TEXT NOT NULL DEFAULT '[]',
    "requireTopic" BOOLEAN NOT NULL DEFAULT false,
    "roleLimits" TEXT NOT NULL DEFAULT '[]',
    "staleAfter" INTEGER,
    "staffRoles" TEXT NOT NULL,
    "totalLimit" INTEGER NOT NULL DEFAULT 50,
    CONSTRAINT "categories_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "guilds" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_categories" ("channelName", "claiming", "cooldown", "createdAt", "customTopic", "description", "discordCategory", "emoji", "enableFeedback", "fallbackCategories", "guildId", "id", "image", "memberLimit", "name", "openingMessage", "pingRoleRules", "pingRoles", "ratelimit", "requireTopic", "requiredRoles", "roleLimits", "staffRoles", "totalLimit") SELECT "channelName", "claiming", "cooldown", "createdAt", "customTopic", "description", "discordCategory", "emoji", "enableFeedback", "fallbackCategories", "guildId", "id", "image", "memberLimit", "name", "openingMessage", "pingRoleRules", "pingRoles", "ratelimit", "requireTopic", "requiredRoles", "roleLimits", "staffRoles", "totalLimit" FROM "categories";
DROP TABLE "categories";
ALTER TABLE "new_categories" RENAME TO "categories";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

