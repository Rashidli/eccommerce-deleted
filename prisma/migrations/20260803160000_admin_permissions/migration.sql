-- ADMIN İCAZƏLƏRİ — bölmə açarlarının siyahısı.
-- Rol şablondur; həqiqi icazə bu sütundadır.
ALTER TABLE "Admin" ADD COLUMN "permissions" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
