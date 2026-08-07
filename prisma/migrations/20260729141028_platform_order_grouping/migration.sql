-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN     "platformOrderId" TEXT;

-- CreateTable
CREATE TABLE "PlatformOrder" (
    "id" TEXT NOT NULL,
    "platformKey" TEXT NOT NULL,
    "externalOrderId" TEXT,
    "userId" TEXT NOT NULL,
    "totalCents" INTEGER NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "status" TEXT NOT NULL DEFAULT 'planned',
    "paymentStartedAt" TIMESTAMP(3),
    "purchasedAt" TIMESTAMP(3),
    "raw" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseLog" (
    "id" TEXT NOT NULL,
    "platformOrderId" TEXT,
    "runId" TEXT NOT NULL,
    "step" TEXT NOT NULL,
    "outcome" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "detail" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PurchaseLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PlatformOrder_platformKey_status_idx" ON "PlatformOrder"("platformKey", "status");

-- CreateIndex
CREATE INDEX "PlatformOrder_userId_idx" ON "PlatformOrder"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "PlatformOrder_platformKey_externalOrderId_key" ON "PlatformOrder"("platformKey", "externalOrderId");

-- CreateIndex
CREATE INDEX "PurchaseLog_runId_idx" ON "PurchaseLog"("runId");

-- CreateIndex
CREATE INDEX "PurchaseLog_platformOrderId_idx" ON "PurchaseLog"("platformOrderId");

-- CreateIndex
CREATE INDEX "OrderItem_platformOrderId_idx" ON "OrderItem"("platformOrderId");

-- AddForeignKey
ALTER TABLE "PlatformOrder" ADD CONSTRAINT "PlatformOrder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseLog" ADD CONSTRAINT "PurchaseLog_platformOrderId_fkey" FOREIGN KEY ("platformOrderId") REFERENCES "PlatformOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_platformOrderId_fkey" FOREIGN KEY ("platformOrderId") REFERENCES "PlatformOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;
