-- AlterTable
ALTER TABLE "Address" ADD COLUMN     "cityId" TEXT,
ADD COLUMN     "districtId" TEXT;

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "addressId" TEXT,
ADD COLUMN     "deliveryMethod" TEXT,
ADD COLUMN     "pickupPointId" TEXT;

-- CreateTable
CREATE TABLE "City" (
    "id" TEXT NOT NULL,
    "nameAz" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "nameRu" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "City_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "District" (
    "id" TEXT NOT NULL,
    "cityId" TEXT NOT NULL,
    "nameAz" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "nameRu" TEXT NOT NULL,
    "priceCents" INTEGER NOT NULL DEFAULT 0,
    "isFree" BOOLEAN NOT NULL DEFAULT false,
    "currency" TEXT NOT NULL DEFAULT 'AZN',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "District_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PickupPoint" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "nameAz" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "nameRu" TEXT NOT NULL,
    "cityId" TEXT NOT NULL,
    "districtId" TEXT,
    "address" TEXT NOT NULL,
    "workHours" TEXT,
    "phone" TEXT,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "priceCents" INTEGER NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'AZN',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PickupPoint_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "City_isActive_idx" ON "City"("isActive");

-- CreateIndex
CREATE INDEX "District_cityId_isActive_idx" ON "District"("cityId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "District_cityId_nameAz_key" ON "District"("cityId", "nameAz");

-- CreateIndex
CREATE UNIQUE INDEX "PickupPoint_code_key" ON "PickupPoint"("code");

-- CreateIndex
CREATE INDEX "PickupPoint_cityId_isActive_idx" ON "PickupPoint"("cityId", "isActive");

-- AddForeignKey
ALTER TABLE "Address" ADD CONSTRAINT "Address_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Address" ADD CONSTRAINT "Address_districtId_fkey" FOREIGN KEY ("districtId") REFERENCES "District"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_addressId_fkey" FOREIGN KEY ("addressId") REFERENCES "Address"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_pickupPointId_fkey" FOREIGN KEY ("pickupPointId") REFERENCES "PickupPoint"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "District" ADD CONSTRAINT "District_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PickupPoint" ADD CONSTRAINT "PickupPoint_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PickupPoint" ADD CONSTRAINT "PickupPoint_districtId_fkey" FOREIGN KEY ("districtId") REFERENCES "District"("id") ON DELETE SET NULL ON UPDATE CASCADE;
