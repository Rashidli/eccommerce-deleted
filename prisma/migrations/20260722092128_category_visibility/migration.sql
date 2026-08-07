-- AlterTable
ALTER TABLE "PlatformCategory" ADD COLUMN     "showInNav" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "showOnHome" BOOLEAN NOT NULL DEFAULT false;
