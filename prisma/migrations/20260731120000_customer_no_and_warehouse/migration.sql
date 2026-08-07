-- MÜŞTƏRİ NÖMRƏSİ (User.customerNo)
--
-- `SERIAL` mövcud sətirləri də doldurur: köhnə hesablar id sırası ilə
-- 1, 2, 3... alır. Bu vacibdir, çünki `customerNo` NOT NULL və UNIQUE-dir —
-- boş qalsaydı miqrasiya düşərdi.
ALTER TABLE "User" ADD COLUMN "customerNo" SERIAL;
CREATE UNIQUE INDEX "User_customerNo_key" ON "User"("customerNo");

-- PLATFORMANIN ANBARI (Platform.warehouse) — JSONB, nullable.
-- Zara üçün İspaniyadakı anbarımızın ünvanı burada saxlanılır.
ALTER TABLE "Platform" ADD COLUMN "warehouse" JSONB;
