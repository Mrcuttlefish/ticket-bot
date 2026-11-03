-- Tag suggestions (upstream #440): off for existing categories, and a count of tickets each tag prevented.

-- AlterTable
ALTER TABLE "categories" ADD COLUMN "suggestTags" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "tags" ADD COLUMN "preventedCount" INTEGER NOT NULL DEFAULT 0;
