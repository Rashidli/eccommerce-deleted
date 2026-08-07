-- AlterTable
ALTER TABLE "Platform" ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'CNY';

-- CreateTable
CREATE TABLE "ExchangeRate" (
    "id" TEXT NOT NULL,
    "base" TEXT NOT NULL,
    "quote" TEXT NOT NULL,
    "rate" DOUBLE PRECISION NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'manual',
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExchangeRate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CurrencySettings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "displayCurrency" TEXT,
    "markupBps" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CurrencySettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ExchangeRate_quote_idx" ON "ExchangeRate"("quote");

-- CreateIndex
CREATE UNIQUE INDEX "ExchangeRate_base_quote_key" ON "ExchangeRate"("base", "quote");
