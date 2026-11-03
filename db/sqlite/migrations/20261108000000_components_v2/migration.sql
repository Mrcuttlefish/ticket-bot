-- Components V2 (upstream #655): an option to send opening messages and panels with Discord's layout components.
-- Off for existing servers, so nothing changes until it's turned on.

-- AlterTable
ALTER TABLE "guilds" ADD COLUMN "componentsV2" BOOLEAN NOT NULL DEFAULT false;
