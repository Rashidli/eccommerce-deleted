-- MÜŞTƏRİ KODU AYRICA SÜTUN KİMİ (User.customerCode)
--
-- `GENERATED ALWAYS ... STORED` seçildi ki, kod tətbiq qatından ASILI OLMASIN:
--  · kodsuz istifadəçi yaratmaq mümkün deyil;
--  · `customerNo` unikal olduğu üçün kod da unikaldır;
--  · mövcud sətirlər bu əmrlə dərhal dolur (ayrıca backfill skripti lazım deyil).
--
-- Format `src/lib/customer-code.ts`-dəki `formatCustomerCode` ilə EYNİDİR:
-- 'FOR' + 6 rəqəmli sıfırla doldurulmuş nömrə.
ALTER TABLE "User"
  ADD COLUMN "customerCode" TEXT
  GENERATED ALWAYS AS ('FOR' || lpad("customerNo"::text, 6, '0')) STORED;

CREATE UNIQUE INDEX "User_customerCode_key" ON "User"("customerCode");
