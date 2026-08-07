-- AlterTable
ALTER TABLE "Platform" ADD COLUMN     "provider" TEXT NOT NULL DEFAULT 'partzona',
ADD COLUMN     "providerKey" TEXT;
