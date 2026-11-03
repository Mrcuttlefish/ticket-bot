-- Anonymous tickets: staff replies are relayed by the bot without the staff member's name. Off for existing categories.

-- AlterTable
ALTER TABLE `categories` ADD COLUMN `anonymous` BOOLEAN NOT NULL DEFAULT false;
