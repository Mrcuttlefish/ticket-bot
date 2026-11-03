-- New ticket options: fallback categories (upstream #472), conditional ping roles (#386),
-- per-role ticket limits (#385), optional close requests (#406), ghost pings (#346),
-- holidays (#403) and a ticket number offset (#416).

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_categories" (
    "channelName" TEXT NOT NULL,
    "claiming" BOOLEAN NOT NULL DEFAULT false,
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
    "staffRoles" TEXT NOT NULL,
    "totalLimit" INTEGER NOT NULL DEFAULT 50,
    CONSTRAINT "categories_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "guilds" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_categories" ("channelName", "claiming", "cooldown", "createdAt", "customTopic", "description", "discordCategory", "emoji", "enableFeedback", "guildId", "id", "image", "memberLimit", "name", "openingMessage", "pingRoles", "ratelimit", "requireTopic", "requiredRoles", "staffRoles", "totalLimit") SELECT "channelName", "claiming", "cooldown", "createdAt", "customTopic", "description", "discordCategory", "emoji", "enableFeedback", "guildId", "id", "image", "memberLimit", "name", "openingMessage", "pingRoles", "ratelimit", "requireTopic", "requiredRoles", "staffRoles", "totalLimit" FROM "categories";
DROP TABLE "categories";
ALTER TABLE "new_categories" RENAME TO "categories";
CREATE TABLE "new_guilds" (
    "autoClose" INTEGER NOT NULL DEFAULT 43200,
    "autoTag" TEXT NOT NULL DEFAULT '[]',
    "archive" BOOLEAN NOT NULL DEFAULT true,
    "blocklist" TEXT NOT NULL DEFAULT '[]',
    "claimButton" BOOLEAN NOT NULL DEFAULT false,
    "closeButton" BOOLEAN NOT NULL DEFAULT false,
    "closeRequests" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "errorColour" TEXT NOT NULL DEFAULT 'Red',
    "footer" TEXT DEFAULT 'Discord Tickets by eartharoid',
    "ghostPing" BOOLEAN NOT NULL DEFAULT false,
    "holidays" TEXT NOT NULL DEFAULT '[]',
    "id" TEXT NOT NULL PRIMARY KEY,
    "locale" TEXT NOT NULL DEFAULT 'en-GB',
    "logChannel" TEXT,
    "primaryColour" TEXT NOT NULL DEFAULT '#009999',
    "staleAfter" INTEGER,
    "successColour" TEXT NOT NULL DEFAULT 'Green',
    "ticketNumberOffset" INTEGER NOT NULL DEFAULT 0,
    "workingHours" TEXT NOT NULL DEFAULT '["UTC", ["00:00","23:59"], ["00:00","23:59"], ["00:00","23:59"], ["00:00","23:59"], ["00:00","23:59"], ["00:00","23:59"], ["00:00","23:59"]]'
);
INSERT INTO "new_guilds" ("archive", "autoClose", "autoTag", "blocklist", "claimButton", "closeButton", "createdAt", "errorColour", "footer", "id", "locale", "logChannel", "primaryColour", "staleAfter", "successColour", "workingHours") SELECT "archive", "autoClose", "autoTag", "blocklist", "claimButton", "closeButton", "createdAt", "errorColour", "footer", "id", "locale", "logChannel", "primaryColour", "staleAfter", "successColour", "workingHours" FROM "guilds";
DROP TABLE "guilds";
ALTER TABLE "new_guilds" RENAME TO "guilds";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

