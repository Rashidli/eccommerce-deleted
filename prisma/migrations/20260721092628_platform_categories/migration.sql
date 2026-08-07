-- CreateTable
CREATE TABLE "PlatformCategory" (
    "id" TEXT NOT NULL,
    "platformKey" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "parentExternalId" TEXT,
    "nameAz" TEXT,
    "nameEn" TEXT,
    "nameRu" TEXT,
    "nameZh" TEXT,
    "isLeaf" BOOLEAN NOT NULL DEFAULT false,
    "poolType" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "raw" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformCategory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PlatformCategory_platformKey_idx" ON "PlatformCategory"("platformKey");

-- CreateIndex
CREATE INDEX "PlatformCategory_parentExternalId_idx" ON "PlatformCategory"("parentExternalId");

-- CreateIndex
CREATE UNIQUE INDEX "PlatformCategory_platformKey_externalId_key" ON "PlatformCategory"("platformKey", "externalId");
