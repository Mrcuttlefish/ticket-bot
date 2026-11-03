-- Per-category overrides for guild settings (upstream #536) and per-category blocked roles (upstream PR #495).
-- New columns are NULL (use the guild setting) or empty, so behaviour doesn't change.

-- AlterTable
ALTER TABLE "categories" ADD COLUMN     "archive" BOOLEAN,
ADD COLUMN     "autoClose" INTEGER,
ADD COLUMN     "blockedRoles" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "claimButton" BOOLEAN,
ADD COLUMN     "closeButton" BOOLEAN,
ADD COLUMN     "staleAfter" INTEGER;

