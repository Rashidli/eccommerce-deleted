import "server-only";
import { prisma } from "@/lib/prisma";
import { variantLabelsFromSku } from "./variant-lookup";

/**
 * İŞ PLANI — job-un BİRİNCİ addımı.
 *
 * Gözləyən Zara sətirləri USER-ə görə qruplaşdırılır və emal SIRASI ilə
 * "iş vahidləri"nə çevrilir. Job sonra bu siyahını bir-bir gəzir.
 *
 * Niyə ayrıca modul: qruplaşdırma emaldan ƏVVƏL və ondan ASILI OLMADAN baş
 * verir. Beləliklə operator quru icrada tam planı — kim, hansı sifarişlər,
 * hansı məhsullar, nə qədər — pul hərəkət etməmişdən əvvəl görür.
 */

export type PlanItem = {
  itemId: string;
  orderId: string;
  orderReference: string;
  name: string;
  /** Müştərinin seçdiyi variant (rəng/ölçü) — platformadakı SKU. */
  sku: string | null;
  /** Ölçü ETİKETİ ("M") — Zara `cart/add` məhz bunu istəyir. */
  size: string | null;
  /** Rəng etiketi — scraper səhifədəki rənglə yoxlayır. */
  color: string | null;
  /**
   * Səbətə atılacaq LİNK.
   *
   * Zara-da rəng URL-in içindədir, ona görə bu, məhsulun ümumi linki DEYİL,
   * müştərinin seçdiyi RƏNGƏ uyğun linkdir (`?v1=...`). Tapılmasa məhsulun
   * ümumi linkinə düşür — o halda scraper rəng uyğunsuzluğunu tutub dayanır.
   */
  productUrl: string | null;
  sourceUrl: string | null;
  quantity: number;
  priceCents: number;
};

/** Bir user-in TAM iş vahidi. Bitmədən növbətiyə keçilmir. */
export type WorkUnit = {
  userId: string;
  fullName: string;
  /**
   * Müştəri KODU — `FOR000001`. Zara sifarişində "Flat number and/or letter"
   * sahəsinə yazılır; anbarımız paketi bununla tanıyır.
   *
   * Bazadakı `User.customerCode` sütunundan OLDUĞU KİMİ gəlir (Postgres
   * hesablayır) — burada təkrar hesablanmır ki, paneldə görünən kod ilə
   * sifarişə düşən kod arasında fərq yaranmasın.
   */
  customerCode: string | null;
  /** Bu user-in neçə fərqli sifarişi əhatə olunur. */
  orderReferences: string[];
  items: PlanItem[];
  totalCents: number;
  currency: string;
};

/**
 * Gözləyən işi user üzrə qruplaşdırır.
 *
 * Şərtlər:
 *  · yalnız `source='zara'` sətirlər (digər platformalar öz job-undadır),
 *  · yalnız ÖDƏNİLMİŞ və ləğv olunmamış sifarişlər,
 *  · yalnız `platformOrderId` BOŞ olanlar — dolu olması artıq alındığını
 *    bildirir (idempotentliyin əsası budur).
 */
export async function buildWorkUnits(opts?: {
  onlyUserId?: string;
}): Promise<WorkUnit[]> {
  const rows = await prisma.orderItem.findMany({
    where: {
      source: "zara",
      platformOrderId: null,
      order: {
        isPaid: true,
        status: { notIn: ["cancelled"] },
        userId: opts?.onlyUserId ?? { not: null },
      },
    },
    include: {
      order: { select: { reference: true, userId: true } },
      // Variant etiketi sifarişdə boş qalıbsa SKU-dan bərpa olunur
      // (bax: `variantLabelsFromSku`).
      product: { select: { attributes: true, raw: true } },
    },
    // Sabit sıra — eyni giriş həmişə eyni planı versin (təkrar icrada fərq olmasın).
    orderBy: [{ orderId: "asc" }, { id: "asc" }],
  });

  const byUser = new Map<string, PlanItem[]>();
  const refsByUser = new Map<string, Set<string>>();

  for (const r of rows) {
    const uid = r.order.userId;
    if (!uid) continue;

    (byUser.get(uid) ?? byUser.set(uid, []).get(uid)!).push({
      itemId: r.id,
      orderId: r.orderId,
      orderReference: r.order.reference,
      name: r.name,
      sku: r.sku,
      // Sifarişdəki etiket ƏSASDIR (müştərinin gördüyü seçim odur); boşdursa
      // SKU-dan çıxarılır. `size` sahəsi sonradan əlavə olunduğu üçün köhnə
      // sifarişlərdə boşdur, amma SKU həmişə var.
      ...(() => {
        const v = variantLabelsFromSku(
          r.product?.attributes,
          r.product?.raw,
          r.sku,
        );
        return {
          size: r.size ?? v.size,
          color: r.color ?? v.color,
          // Rəngə uyğun link tapılıbsa O işlədilir — məhsulun ümumi linki
          // default rəngi açır və `cart/add` `color_mismatch` verir.
          productUrl: v.url ?? r.sourceUrl,
        };
      })(),
      sourceUrl: r.sourceUrl,
      quantity: r.quantity,
      priceCents: r.priceCents,
    });

    (refsByUser.get(uid) ?? refsByUser.set(uid, new Set()).get(uid)!).add(
      r.order.reference,
    );
  }

  const userIds = [...byUser.keys()];
  if (userIds.length === 0) return [];

  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, fullName: true, customerCode: true },
  });
  const userById = new Map(users.map((u) => [u.id, u]));

  return userIds
    .map((userId) => {
      const items = byUser.get(userId)!;
      return {
        userId,
        fullName: userById.get(userId)?.fullName ?? "(naməlum user)",
        customerCode: userById.get(userId)?.customerCode ?? null,
        orderReferences: [...(refsByUser.get(userId) ?? [])].sort(),
        items,
        totalCents: items.reduce((s, i) => s + i.priceCents * i.quantity, 0),
        // Zara həmişə EUR — platforma sətrindən gəlir, kodda sabit deyil.
        currency: "EUR",
      };
    })
    // Emal sırası sabit olsun deyə ada görə sıralanır.
    .sort((a, b) => a.fullName.localeCompare(b.fullName));
}

/** Planı operator üçün oxunaqlı mətnə çevirir (quru icrada çap olunur). */
export function formatPlan(units: WorkUnit[]): string {
  if (units.length === 0) return "  (alınacaq Zara sifarişi yoxdur)";

  const lines: string[] = [];
  units.forEach((u, i) => {
    lines.push(
      `  ${i + 1}) ${u.fullName}  —  ${u.items.length} sətir, ` +
        `${(u.totalCents / 100).toFixed(2)} ${u.currency}`,
    );
    lines.push(`     sifarişlər: ${u.orderReferences.join(", ")}`);
    for (const it of u.items) {
      lines.push(
        `       · ${it.name.slice(0, 46)}` +
          `  ×${it.quantity}  ${(it.priceCents / 100).toFixed(2)}` +
          // Ölçü planda GÖRÜNMƏLİDİR — operator `--pay` basmazdan əvvəl
          // nəyin alınacağını yoxlaya bilsin.
          `  ölçü=${it.size ?? "YOX"}` +
          (it.color ? `  rəng=${it.color}` : "") +
          `  sku=${it.sku ?? "YOX"}`,
      );
    }
  });
  return lines.join("\n");
}
