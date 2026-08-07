import "dotenv/config";
import { randomBytes, scryptSync } from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import {
  categories,
  promoTiles,
  trendingProducts,
  newArrivalsProducts,
} from "../src/lib/mock-data";
import { dict } from "../src/lib/i18n";
import { userProfile, userOrders, userAddresses } from "../src/lib/user-data";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

// @/lib/user-session hashPassword ilə eyni format (salt:hash) — demo user giriş edə bilsin.
function hashPw(password: string): string {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
}

/** "$54.90" → 5490 */
function toCents(price: string): number {
  return Math.round(parseFloat(price.replace(/[^0-9.]/g, "")) * 100);
}

// Brend → platforma açarı (qayda: yalnız real platformalar source alır).
const BRAND_SOURCE: Record<string, string> = { "1688": "1688", Taobao: "taobao" };

function sourceUrlFor(source: string | null, sku: string): string | null {
  if (source === "1688") return `https://detail.1688.com/offer/${sku}.html`;
  if (source === "taobao") return `https://item.taobao.com/item.htm?id=${sku}`;
  return null;
}

type Tagline = { az: string; en: string; ru: string };
// Platforma taglinelərı seed-in özündədir — `platforms.json` silindi, çünki
// platformalar artıq TAM bazadan idarə olunur (admin /admin/platforms).
const PLATFORM_TAGLINES: Record<string, Tagline> = {
  "1688": { az: "Topdan qiymətlər", en: "Wholesale prices", ru: "Оптовые цены" },
  taobao: { az: "Milyonlarla məhsul", en: "Millions of products", ru: "Миллионы товаров" },
  zara: { az: "Avropa modası", en: "European fashion", ru: "Европейская мода" },
};

async function main() {
  // Təkrar seed zamanı təmiz başlanğıc
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.userSession.deleteMany();
  await prisma.address.deleteMany();
  await prisma.user.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.campaign.deleteMany();
  await prisma.promoCode.deleteMany();
  await prisma.slide.deleteMany();
  await prisma.platform.deleteMany();

  // --- Kateqoriyalar (adlar 3 dildə i18n-dən) ---
  const catByEnName = new Map<string, string>(); // "Women" → id
  for (const [index, category] of categories.entries()) {
    const key = category.key as keyof (typeof dict)["az"]["cat"];
    const created = await prisma.category.create({
      data: {
        slug: category.key,
        nameAz: dict.az.cat[key],
        nameEn: dict.en.cat[key],
        nameRu: dict.ru.cat[key],
        image: category.img,
        sortOrder: index,
      },
    });
    catByEnName.set(dict.en.cat[key], created.id);
  }

  // --- Platformalar (DB-dən idarə olunur; amazon söndürülü) ---
  const platformSeed: {
    key: string;
    apiPath: string | null;
    provider: string;
    providerKey: string | null;
    isActive: boolean;
    sortOrder: number;
    label?: string;
  }[] = [
    // Partzona driver-i — aktiv
    { key: "1688", apiPath: "/products", provider: "partzona", providerKey: null, isActive: true, sortOrder: 0 },
    { key: "taobao", apiPath: "/taobao", provider: "partzona", providerKey: null, isActive: true, sortOrder: 1 },
    { key: "amazon", apiPath: null, provider: "partzona", providerKey: null, isActive: false, sortOrder: 2 },
    // OTAPI aqreqatoru — instanceKey gələnə qədər söndürülü placeholder-lər
    { key: "tmall", apiPath: null, provider: "otapi", providerKey: "Tmall", isActive: false, sortOrder: 3, label: "Tmall" },
    { key: "aliexpress", apiPath: null, provider: "otapi", providerKey: "Aliexpress", isActive: false, sortOrder: 4, label: "AliExpress" },
    { key: "alibaba", apiPath: null, provider: "otapi", providerKey: "Alibaba", isActive: false, sortOrder: 5, label: "Alibaba.com" },
    { key: "jd", apiPath: null, provider: "otapi", providerKey: "Jd", isActive: false, sortOrder: 6, label: "JD.com" },
    { key: "pinduoduo", apiPath: null, provider: "otapi", providerKey: "Pinduoduo", isActive: false, sortOrder: 7, label: "Pinduoduo" },
  ];
  for (const p of platformSeed) {
    const tagline = PLATFORM_TAGLINES[p.key];
    const label = p.label ?? p.key;
    await prisma.platform.create({
      data: {
        key: p.key,
        nameAz: label,
        nameEn: label,
        nameRu: label,
        taglineAz: tagline?.az ?? null,
        taglineEn: tagline?.en ?? null,
        taglineRu: tagline?.ru ?? null,
        provider: p.provider,
        providerKey: p.providerKey,
        apiPath: p.apiPath,
        isActive: p.isActive,
        sortOrder: p.sortOrder,
      },
    });
  }

  // --- Məhsullar (trilingual nameEn; trending=salesCount, new=createdAt) ---
  const allProducts = [...trendingProducts, ...newArrivalsProducts];
  const trendingCount = trendingProducts.length;
  const total = allProducts.length;
  const now = Date.now();
  const STEP_MS = 60_000;

  const productByOldId = new Map<string, string>();
  const skuByOldId = new Map<string, { sku: string | null; source: string | null; sourceUrl: string | null }>();

  for (const [index, product] of allProducts.entries()) {
    const source = BRAND_SOURCE[product.brand] ?? null;
    const sku = source ? `SLR-${String(index + 1).padStart(4, "0")}` : null;
    const sourceUrl = sku ? sourceUrlFor(source, sku) : null;
    const categoryId = product.category ? catByEnName.get(product.category) ?? null : null;
    const isTrending = index < trendingCount;
    // Trending → yüksək satış; yeni gələnlər → ən yeni createdAt.
    const salesCount = isTrending ? (product.reviewCount ?? 50) * 10 + (trendingCount - index) : null;
    const createdAt = new Date(now - (total - index) * STEP_MS);

    const created = await prisma.product.create({
      data: {
        name: product.name,
        nameEn: product.name,
        description: product.description ?? null,
        descEn: product.description ?? null,
        brand: product.brand,
        priceCents: toCents(product.price),
        oldPriceCents: product.originalPrice ? toCents(product.originalPrice) : null,
        image: product.img,
        images: product.images ? JSON.stringify(product.images) : null,
        rating: product.rating,
        reviewCount: product.reviewCount ?? 0,
        salesCount,
        stock: product.inStock === false ? 0 : 100,
        sizes: product.sizes ? JSON.stringify(product.sizes) : null,
        colors: product.colors ? JSON.stringify(product.colors) : null,
        source,
        sku,
        sourceUrl,
        createdAt,
        ...(categoryId ? { category: { connect: { id: categoryId } } } : {}),
      },
    });
    productByOldId.set(product.id, created.id);
    skuByOldId.set(product.id, { sku, source, sourceUrl });
  }

  // --- Slaydlar ---
  const slides = [
    {
      titleAz: "Yay Kolleksiyası",
      titleEn: "Summer Collection",
      titleRu: "Летняя коллекция",
      subtitle: "50%-ə qədər endirim",
      image: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1600&h=600&fit=crop",
      href: "/sale",
    },
    {
      titleAz: "Texnika",
      titleEn: "Tech Essentials",
      titleRu: "Техника",
      subtitle: "Yeni gələnlər",
      image: "https://images.unsplash.com/photo-1468495244123-6c6c332eeece?w=1600&h=600&fit=crop",
      href: "/new",
    },
  ];
  for (const [index, slide] of slides.entries()) {
    await prisma.slide.create({ data: { ...slide, sortOrder: index } });
  }

  // --- Kampaniyalar (promo tile-lar) ---
  for (const [index, tile] of promoTiles.entries()) {
    await prisma.campaign.create({
      data: {
        key: tile.key,
        eyebrowAz: dict.az.promo[tile.key].eyebrow,
        eyebrowEn: dict.en.promo[tile.key].eyebrow,
        eyebrowRu: dict.ru.promo[tile.key].eyebrow,
        titleAz: dict.az.promo[tile.key].title,
        titleEn: dict.en.promo[tile.key].title,
        titleRu: dict.ru.promo[tile.key].title,
        ctaAz: dict.az.promo[tile.key].cta,
        ctaEn: dict.en.promo[tile.key].cta,
        ctaRu: dict.ru.promo[tile.key].cta,
        href: tile.href,
        image: tile.img,
        tint: tile.tint,
        sortOrder: index,
      },
    });
  }

  // --- Promo kodlar (nümunə) ---
  await prisma.promoCode.createMany({
    data: [
      { code: "E-COMMERCE10", type: "percent", value: 10, minOrderCents: 5000 },
      { code: "YAY25", type: "percent", value: 25, minOrderCents: 10000, usageLimit: 100 },
      { code: "PULSUZ", type: "fixed", value: 350, minOrderCents: 3000 },
    ],
  });

  // --- Demo istifadəçi + ünvanlar + sifarişlər (panel görüntüsü üçün) ---
  const user = await prisma.user.create({
    data: {
      email: userProfile.email,
      fullName: userProfile.fullName,
      phone: userProfile.phone,
      password: hashPw("ecommerce123"), // demo giriş: <userProfile.email> / ecommerce123
      role: "customer",
      addresses: {
        create: userAddresses.map((address) => ({
          label: address.label,
          fullName: address.fullName,
          phone: address.phone,
          line: address.line,
          isDefault: address.isDefault,
        })),
      },
    },
  });

  for (const order of userOrders) {
    await prisma.order.create({
      data: {
        reference: order.id,
        user: { connect: { id: user.id } },
        status: order.status,
        totalCents: toCents(order.total),
        courier: order.courier,
        branch: order.branch,
        tracking: order.tracking,
        deliveryDate: new Date(order.deliveryDate),
        items: {
          create: order.items.flatMap((item) => {
            const source = allProducts.find((p) => p.id === item.productId);
            const newId = productByOldId.get(item.productId);
            const sourcing = skuByOldId.get(item.productId);
            if (!source || !newId) return [];
            return [
              {
                product: { connect: { id: newId } },
                name: source.name,
                priceCents: toCents(source.price),
                quantity: item.quantity,
                sku: sourcing?.sku ?? null,
                source: sourcing?.source ?? null,
                sourceUrl: sourcing?.sourceUrl ?? null,
              },
            ];
          }),
        },
      },
    });
  }

  const counts = {
    kateqoriya: await prisma.category.count(),
    platforma: await prisma.platform.count(),
    məhsul: await prisma.product.count(),
    slayd: await prisma.slide.count(),
    kampaniya: await prisma.campaign.count(),
    promoKod: await prisma.promoCode.count(),
    istifadəçi: await prisma.user.count(),
    sifariş: await prisma.order.count(),
    sifarişElementi: await prisma.orderItem.count(),
  };
  console.log("Seed tamamlandı:", counts);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
