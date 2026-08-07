# E-Commerce — Layihə Qaydaları və Memarlıq

> Bu sənəd layihənin **canlı spesifikasiyası və sərt qaydalarıdır**. Hər addımda buna əməl olunur.
> Framework qaydaları üçün həmçinin `AGENTS.md`-ə bax (bu, standart Next.js deyil — kod yazmadan
> əvvəl `node_modules/next/dist/docs/` oxu).

## Nə qururuq

Partzona (1688 + Taobao) inteqrasiyalı, çoxdilli (az/ru/en), AI-tərcüməli dropshipping platforması.
Backend Next.js-in özündə (ayrı backend proyekti yoxdur), tək deploy. Baza: **PostgreSQL**.

## URL strukturu

| URL | Nə | Auth | SEO |
|---|---|---|---|
| `/[lang]/...` (`/az`, `/ru`, `/en`) | Storefront (public) | yoxdur | **indekslənir** (hreflang, sitemap) |
| `/panel/...` | İstifadəçi kabineti | user session (`ecommerce_user`) | **noindex** |
| `/admin/...` | Admin paneli | admin session (`ecommerce_admin`) | **noindex** |

`/admin` və `/panel` **noindex** olduğu üçün dil prefiksi (`/[lang]`) almırlar — dili cookie/context ilə saxlayırlar.
Yalnız public storefront `/[lang]` alt-yolundadır.

## SƏRT QAYDALAR (pozulmaz)

1. **Admin auth və user auth TAM ayrı.** Ayrı cookie, ayrı session cədvəli, ayrı middleware/proxy matcher.
   Heç vaxt qarışmasın, ortaq user modeli olmasın. Admin = `ecommerce_admin` (HMAC token, `@/lib/session`).
   User = `ecommerce_user` (ayrı `UserSession` DB cədvəli).
2. **Bütün sorğular yalnız backend-dən.** UI-dan 1688/Taobao/Partzona-ya birbaşa sorğu ATILMASIN.
   Xarici data yalnız server component / server action / `/api` route handler vasitəsilə alınır.
   API tokeni (`PARTZONA_TOKEN` və s.) heç vaxt client bundle-a düşməsin — `server-only` import et.
3. **Ayrı route, ayrı komponent.** Hər səhifə öz route-u, hər blok öz komponenti.
4. **Hər şey dinamik və DB-yə bağlı.** Hardcoded məhsul / mətn / kateqoriya QADAĞAN. Mock data yalnız seed üçün.
5. **3 dil (az / ru / en).** Həm statik sözlər (`@/lib/i18n`), həm dinamik məhsul mətnləri
   (`nameAz/nameEn/nameRu`, `descAz/...`). Hardcoded UI string qadağan.
6. **Platformalar fərqlidir:** SKU və atributlar `attributes` **JSONB**-də, orijinal cavab `raw` **JSONB**-də
   saxlanır, ortaq DTO-ya normalize edilir.
7. **SEO:** çoxdilli metadata, hreflang, sitemap, robots, JSON-LD, slug əsaslı URL. `/admin` və `/panel` noindex.
8. **Addım-addım + mock təmizliyi:** Hər səth DB-yə keçdikcə ona uyğun mock data DƏRHAL silinir
   (`mock-data.ts`, `products.ts`, `user-data.ts`). Arxada ölü mock/hardcoded qalmır. İş kiçik,
   doğrulana bilən addımlarla gedir.

## Memarlıq qərarları (təsdiqlənmiş)

- **DB:** PostgreSQL. Prisma 7 + `@prisma/adapter-pg`. `DATABASE_URL` postgres connection string.
- **i18n:** public storefront `/[lang]` sub-path routing (SSR locale). `/admin` + `/panel` cookie/context locale.
- **Data-access:** UI birbaşa Prisma çağırmır — `src/lib/data/*.ts` (server-only) qatından keçir.
  Dinamik dil sahələri `pickLang(row, lang)` helper-i ilə seçilir.
- **AI tərcümə:** default Claude (Anthropic). az/ru → zh (çincə), Partzona axtarışından əvvəl.

## Domain / mühit

- Prod: **http://159.223.227.212/** (SEO base URL, hreflang, sitemap, JSON-LD `url` bunu istifadə edir).

## Məhsul mənbəyi strukturu (bütün siyahı səthləri Partzona-backed)

Bütün məhsul-siyahı səthləri — **search, kateqoriya baxışı, trend, yeni gələnlər** — seçilmiş platformadan
(Partzona) **yalnız backend vasitəsilə** qidalanır. DB kataloq/keş rolu oynayır: **UI həmişə DB-dən oxuyur**,
backend Partzona-dan çəkib DB-yə upsert edir (dedup `(source, externalId)`).

| Səth | Mənbə | Axın |
|---|---|---|
| Search | `/products/search` (1688) və ya `/taobao/products/search` | sorğu → AI tərcümə (az/ru→zh) → Partzona → normalize+`raw` → upsert → DB-dən göstər |
| Kateqoriya | `/categories/{id}/products` (1688) | Category → platforma categoryId → Partzona → upsert → göstər |
| Trend / Yeni | recommend/curated sorğular (məs. `/taobao/products/recommend`) | mütəmadi refresh → DB → göstər |

Bu, UI-ı sürətli və **indekslənən** (DB-rendered) saxlayır, hər sorğuda Partzona-ya dəyməz.

## Axtarış axını (Partzona)

1. İstifadəçi az/ru yazır → 2. AI çincəyə tərcümə → 3. Partzona-da axtarış (platforma seçiminə görə
1688 `/products/*` və ya Taobao `/taobao/*`) → 4. Gələn məhsullar **bizim DB-yə** yazılır (normalize + `raw`)
→ 5. İstifadəçiyə göstərilir.

## Sifariş axını

- Səbət və sifariş **tamamilə bizim DB-dən** işləyir.
- Sifariş tamamlananda sistem **avtomatik** Partzona vasitəsilə həmin platformada alışı edir.
- Status və tracking Partzona ilə mütəmadi sinxronlaşır.

## Kargo

Driver qatı: `quote / createShipment / track / webhook`. Registry ilə yeni şirkət əlavəsi asan olsun.

## Faza yol xəritəsi

- **Faza 0** — Təməl: qaydalar sənədi · Postgres miqrasiyası · Product trilingual+JSONB · data-access qatı · seed
- **Faza 1** — Customer auth + panel (ilk fokus)
- **Faza 2** — Storefront → DB + `/[lang]` routing
- **Faza 3** — Partzona inteqrasiyası (client + AI tərcümə + axtarış→DB + avto-alış)
- **Faza 4** — Kargo driver qatı
- **Faza 5** — SEO (metadata, hreflang, sitemap, robots, JSON-LD)

İş `TaskList` ilə idarə olunur.
