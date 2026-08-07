-- FİN: Azərbaycan şəxsiyyət vəsiqəsinin 7 simvollu kodu.
-- NULLABLE — mövcud hesablarda yoxdur, onları bloklamırıq.
-- UNIQUE — eyni FİN ilə iki hesab dublikat/saxtakarlıq əlamətidir.
-- Postgres UNIQUE bir neçə NULL-a icazə verir, ona görə FİN-siz köhnə
-- hesablar bir-birinə mane olmur.
ALTER TABLE "User" ADD COLUMN "fin" TEXT;
CREATE UNIQUE INDEX "User_fin_key" ON "User"("fin");
