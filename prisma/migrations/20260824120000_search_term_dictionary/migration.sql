-- AXTARIŞ LÜĞƏTİ — danışıq dilindəki söz → platformanın açar sözü ("sumka" → 女包).
-- Səbəb: müştəri kataloq dilində yox, danışıq dilində yazır; nə bizim tərcüməçi,
-- nə 1688-in öz tərcüməsi "sumka"/"krossovka"/"pasaniska" tanımır (ölçüldü: 0-5 nəticə).
CREATE TABLE "SearchTerm" (
    "id"        TEXT NOT NULL,
    "lang"      TEXT NOT NULL,
    "target"    TEXT NOT NULL,
    "term"      TEXT NOT NULL,
    "keyword"   TEXT NOT NULL,
    "verified"  BOOLEAN NOT NULL DEFAULT false,
    "hits"      INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SearchTerm_pkey" PRIMARY KEY ("id")
);

-- Axtarış eyni (dil, hədəf dil, söz) üçün TƏK sətir götürür.
CREATE UNIQUE INDEX "SearchTerm_lang_target_term_key" ON "SearchTerm"("lang", "target", "term");

-- Lüğət bütöv halda oxunur (yaddaşda keşlənir) — filtr bu iki sütun üzrədir.
CREATE INDEX "SearchTerm_target_lang_idx" ON "SearchTerm"("target", "lang");
