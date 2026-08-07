-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "cargoBranchId" TEXT,
ADD COLUMN     "cargoCompanyId" TEXT,
ADD COLUMN     "cargoOrderNumber" TEXT,
ADD COLUMN     "deliveryNumber" TEXT;

-- CreateTable
CREATE TABLE "CargoCompany" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "nameAz" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "nameRu" TEXT NOT NULL,
    "noteAz" TEXT,
    "noteEn" TEXT,
    "noteRu" TEXT,
    "driverKey" TEXT NOT NULL DEFAULT 'manual',
    "apiBaseUrl" TEXT,
    "apiToken" TEXT,
    "webhookSecret" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CargoCompany_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CargoBranch" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "externalCode" TEXT NOT NULL,
    "nameAz" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "nameRu" TEXT NOT NULL,
    "districtId" TEXT,
    "address" TEXT NOT NULL,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "workHours" TEXT,
    "phone" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "raw" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CargoBranch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CargoStatusEvent" (
    "id" TEXT NOT NULL,
    "orderId" TEXT,
    "companyId" TEXT,
    "direction" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "rawStatus" TEXT,
    "idempotencyKey" TEXT,
    "outcome" TEXT NOT NULL DEFAULT 'accepted',
    "reason" TEXT,
    "raw" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CargoStatusEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CargoCompany_key_key" ON "CargoCompany"("key");

-- CreateIndex
CREATE INDEX "CargoCompany_isActive_idx" ON "CargoCompany"("isActive");

-- CreateIndex
CREATE INDEX "CargoBranch_companyId_isActive_idx" ON "CargoBranch"("companyId", "isActive");

-- CreateIndex
CREATE INDEX "CargoBranch_districtId_idx" ON "CargoBranch"("districtId");

-- CreateIndex
CREATE UNIQUE INDEX "CargoBranch_companyId_externalCode_key" ON "CargoBranch"("companyId", "externalCode");

-- CreateIndex
CREATE INDEX "CargoStatusEvent_orderId_createdAt_idx" ON "CargoStatusEvent"("orderId", "createdAt");

-- CreateIndex
CREATE INDEX "CargoStatusEvent_companyId_direction_idx" ON "CargoStatusEvent"("companyId", "direction");

-- CreateIndex
CREATE UNIQUE INDEX "CargoStatusEvent_companyId_idempotencyKey_key" ON "CargoStatusEvent"("companyId", "idempotencyKey");

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_cargoCompanyId_fkey" FOREIGN KEY ("cargoCompanyId") REFERENCES "CargoCompany"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_cargoBranchId_fkey" FOREIGN KEY ("cargoBranchId") REFERENCES "CargoBranch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CargoBranch" ADD CONSTRAINT "CargoBranch_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "CargoCompany"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CargoBranch" ADD CONSTRAINT "CargoBranch_districtId_fkey" FOREIGN KEY ("districtId") REFERENCES "District"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CargoStatusEvent" ADD CONSTRAINT "CargoStatusEvent_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CargoStatusEvent" ADD CONSTRAINT "CargoStatusEvent_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "CargoCompany"("id") ON DELETE SET NULL ON UPDATE CASCADE;
