-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'CNY',
ADD COLUMN     "isMixedCurrency" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "PlatformShippingRule" (
    "id" TEXT NOT NULL,
    "platformKey" TEXT NOT NULL,
    "baseCents" INTEGER NOT NULL DEFAULT 0,
    "perKgCents" INTEGER NOT NULL DEFAULT 0,
    "fallbackWeightGrams" INTEGER NOT NULL DEFAULT 500,
    "freeOverCents" INTEGER,
    "currency" TEXT NOT NULL DEFAULT 'CNY',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformShippingRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderShipping" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "platformKey" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "method" TEXT,
    "methodName" TEXT,
    "etaDays" TEXT,
    "basis" TEXT NOT NULL DEFAULT 'rule',
    "weightGrams" INTEGER,
    "raw" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderShipping_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderTotal" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "itemsCents" INTEGER NOT NULL,
    "shippingCents" INTEGER NOT NULL DEFAULT 0,
    "totalCents" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderTotal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PlatformShippingRule_platformKey_key" ON "PlatformShippingRule"("platformKey");

-- CreateIndex
CREATE INDEX "OrderShipping_orderId_idx" ON "OrderShipping"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "OrderShipping_orderId_platformKey_key" ON "OrderShipping"("orderId", "platformKey");

-- CreateIndex
CREATE INDEX "OrderTotal_orderId_idx" ON "OrderTotal"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "OrderTotal_orderId_currency_key" ON "OrderTotal"("orderId", "currency");

-- AddForeignKey
ALTER TABLE "OrderShipping" ADD CONSTRAINT "OrderShipping_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderTotal" ADD CONSTRAINT "OrderTotal_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
