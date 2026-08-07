-- AlterTable
ALTER TABLE "Category" ADD COLUMN     "sourceCategoryId" TEXT,
ADD COLUMN     "sourcePoolType" TEXT;

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'CNY',
ADD COLUMN     "minOrderQty" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "salesCount" INTEGER,
ADD COLUMN     "sourceCategoryId" TEXT,
ADD COLUMN     "sourcePoolType" TEXT;
