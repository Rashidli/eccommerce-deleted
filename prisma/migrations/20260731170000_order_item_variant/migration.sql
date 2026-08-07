-- SİFARİŞ SƏTRİNDƏ ÖLÇÜ/RƏNG
--
-- Zara-nın `cart/add` endpointi ölçünün ADINI tələb edir (SKU kifayət etmir).
-- Bu dəyərlər səbətdə vardı, amma sifarişə yazılmırdı — avto-alış job-u hansı
-- ölçünü alacağını bilmirdi.
ALTER TABLE "OrderItem" ADD COLUMN "size" TEXT;
ALTER TABLE "OrderItem" ADD COLUMN "color" TEXT;
