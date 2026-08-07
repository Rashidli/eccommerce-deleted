-- MÜŞTƏRİ KODU: "generated" → "trigger ilə default, amma DƏYİŞİLƏ BİLƏN"
--
-- Əvvəl sütun `GENERATED ALWAYS AS (...) STORED` idi: kodsuz istifadəçi
-- yaranmasını tam bloklayırdı, amma FƏRDİ kod yazmağa da imkan vermirdi
-- (məs. bir müştəriyə `EXP...` prefiksi lazım oldu).
--
-- Yeni quruluş hər iki tələbi ödəyir:
--   · BEFORE INSERT trigger boş qalıbsa kodu ÖZÜ yazır → qeydiyyatda avtomatik;
--   · sütun adi TEXT olduğu üçün admin sonradan dəyişə bilər;
--   · UNIQUE indeks qalır → iki müştəridə eyni kod mümkün deyil.
ALTER TABLE "User" DROP COLUMN "customerCode";
ALTER TABLE "User" ADD COLUMN "customerCode" TEXT;

-- Mövcud sətirlər eyni formatla doldurulur (kod dəyişmir).
UPDATE "User" SET "customerCode" = 'FOR' || lpad("customerNo"::text, 6, '0');

CREATE UNIQUE INDEX "User_customerCode_key" ON "User"("customerCode");

-- Qeydiyyatda avtomatik doldurma. `customerNo` SERIAL defaultu trigger-dən
-- ƏVVƏL tətbiq olunur, ona görə burada artıq mövcuddur.
CREATE OR REPLACE FUNCTION set_customer_code() RETURNS trigger AS $$
BEGIN
  IF NEW."customerCode" IS NULL OR NEW."customerCode" = '' THEN
    NEW."customerCode" := 'FOR' || lpad(NEW."customerNo"::text, 6, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS user_customer_code ON "User";
CREATE TRIGGER user_customer_code
  BEFORE INSERT ON "User"
  FOR EACH ROW EXECUTE FUNCTION set_customer_code();
