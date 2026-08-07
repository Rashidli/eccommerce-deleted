-- RAYON TARİFİ KARGO ŞİRKƏTİ ÜZRƏ.
--
-- `District.priceCents` ümumi tarif kimi QALIR: sətir yoxdursa o işləyir.
-- Bu cədvəl yalnız üstündən yazır, köhnə davranışı pozmur.
CREATE TABLE "DistrictTariff" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "districtId" TEXT NOT NULL,
    "priceCents" INTEGER NOT NULL DEFAULT 0,
    "isFree" BOOLEAN NOT NULL DEFAULT false,
    "currency" TEXT NOT NULL DEFAULT 'AZN',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DistrictTariff_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DistrictTariff_companyId_districtId_key"
    ON "DistrictTariff"("companyId", "districtId");

CREATE INDEX "DistrictTariff_districtId_idx" ON "DistrictTariff"("districtId");

ALTER TABLE "DistrictTariff" ADD CONSTRAINT "DistrictTariff_companyId_fkey"
    FOREIGN KEY ("companyId") REFERENCES "CargoCompany"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "DistrictTariff" ADD CONSTRAINT "DistrictTariff_districtId_fkey"
    FOREIGN KEY ("districtId") REFERENCES "District"("id") ON DELETE CASCADE ON UPDATE CASCADE;
