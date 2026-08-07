-- CreateTable
CREATE TABLE "CategoryProduct" (
    "id" TEXT NOT NULL,
    "platformKey" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CategoryProduct_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CategoryProduct_platformKey_categoryId_position_idx" ON "CategoryProduct"("platformKey", "categoryId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "CategoryProduct_platformKey_categoryId_productId_key" ON "CategoryProduct"("platformKey", "categoryId", "productId");
