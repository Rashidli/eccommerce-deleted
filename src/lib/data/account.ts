import "server-only";
import { prisma } from "@/lib/prisma";
import { formatMoney, formatDate } from "@/lib/format";
import { pickLang } from "@/lib/data/pick-lang";
import type { Lang } from "@/lib/i18n";

// Panel UI-nin gözlədiyi per-user formalar — birbaşa DB-dən, mock yox.
export type PanelOrderStatus =
  | "pending"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled";

export type PanelOrderItem = {
  id: string;
  name: string;
  price: string;
  brand: string;
  img: string;
  quantity: number;
  productId: string | null;
};

/** Platforma üzrə çatdırılma sətri — hər platformanın öz valyutası var. */
export type PanelShipping = {
  platformKey: string;
  amount: string;
  /** "api" — platformadan hesablanıb; "rule"/"weight-rule" — bizim tarif. */
  basis: string;
  method: string | null;
  etaDays: string | null;
};

/** Valyuta üzrə yekun — QARIŞIQ sifarişdə fərqli valyutalar toplanmır. */
export type PanelTotal = {
  currency: string;
  items: string;
  shipping: string;
  total: string;
};

export type PanelOrder = {
  id: string;
  date: string;
  status: PanelOrderStatus;
  /** Ödəniş tamamlanıb — panel "ödənilməyib" sifarişi fərqli göstərir. */
  isPaid: boolean;
  /** Ödənişin REAL tarixi (`Order.paidAt`). Ödənilməyibsə boş sətir —
   *  timeline uydurma tarix göstərmir. */
  paidDate: string;
  total: string;
  items: PanelOrderItem[];
  courier: string;
  branch: string;
  tracking: string;
  deliveryDate: string;
  /** Platforma üzrə çatdırılma (bir sifarişdə 3 platforma ola bilər). */
  shippings: PanelShipping[];
  /** Valyuta üzrə yekunlar — `total` yalnız əsas valyutanı göstərir. */
  totals: PanelTotal[];
  /** true — sifarişdə birdən çox valyuta var, tək rəqəm tam mənzərə deyil. */
  isMixedCurrency: boolean;
};

export type PanelAddress = {
  id: string;
  label: string;
  fullName: string;
  phone: string;
  line: string;
  isDefault: boolean;
  /** Seçilmiş şəhər/rayon — kuryer TARİFİ rayondan gəlir. */
  cityId: string | null;
  cityName: string | null;
  districtId: string | null;
  districtName: string | null;
  /** Rayonun kuryer haqqı — formatlanmış. Rayon seçilməyibsə boş sətir. */
  deliveryFee: string;
  deliveryFeeCents: number;
  isFreeDelivery: boolean;
};

export async function getUserOrders(userId: string): Promise<PanelOrder[]> {
  const orders = await prisma.order.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: {
      items: { include: { product: true } },
      shippings: true,
      totals: true,
    },
  });

  return orders.map((order) => ({
    id: order.reference,
    date: formatDate(order.createdAt),
    status: order.status as PanelOrderStatus,
    isPaid: order.isPaid,
    total: formatMoney(order.totalCents, order.currency),
    courier: order.courier ?? "—",
    branch: order.branch ?? "—",
    tracking: order.tracking ?? "—",
    deliveryDate: formatDate(order.deliveryDate),
    paidDate: order.paidAt ? formatDate(order.paidAt) : "",
    isMixedCurrency: order.isMixedCurrency,
    shippings: order.shippings.map((s) => ({
      platformKey: s.platformKey,
      amount: formatMoney(s.amountCents, s.currency),
      basis: s.basis,
      method: s.methodName ?? s.method,
      etaDays: s.etaDays,
    })),
    totals: order.totals.map((t) => ({
      currency: t.currency,
      items: formatMoney(t.itemsCents, t.currency),
      shipping: formatMoney(t.shippingCents, t.currency),
      total: formatMoney(t.totalCents, t.currency),
    })),
    items: order.items.map((item) => ({
      id: item.id,
      name: item.name,
      price: formatMoney(item.priceCents, item.product?.currency ?? order.currency),
      brand: item.source ?? item.product?.brand ?? "",
      img: item.product?.image ?? "",
      quantity: item.quantity,
      productId: item.productId,
    })),
  }));
}

export async function getUserAddresses(
  userId: string,
  lang: Lang = "az",
): Promise<PanelAddress[]> {
  const addresses = await prisma.address.findMany({
    where: { userId },
    orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
    include: { city: true, district: true },
  });

  return addresses.map((a) => {
    const d = a.district;
    // Rayon seçilməyibsə tarif YOXDUR — sıfır göstərmək "pulsuz" kimi
    // oxunardı, halbuki sadəcə məlum deyil.
    const free = d ? d.isFree || d.priceCents === 0 : false;
    const cents = d && !free ? d.priceCents : 0;

    return {
      id: a.id,
      label: a.label,
      fullName: a.fullName,
      phone: a.phone,
      line: a.line,
      isDefault: a.isDefault,
      cityId: a.cityId,
      cityName: a.city ? pickLang(a.city, "name", lang) || a.city.nameAz : null,
      districtId: a.districtId,
      districtName: d ? pickLang(d, "name", lang) || d.nameAz : null,
      deliveryFee: d ? formatMoney(cents, d.currency) : "",
      deliveryFeeCents: cents,
      isFreeDelivery: free,
    };
  });
}

export async function getUserOrderCount(userId: string): Promise<number> {
  return prisma.order.count({ where: { userId } });
}

export async function getUserAddressCount(userId: string): Promise<number> {
  return prisma.address.count({ where: { userId } });
}

/**
 * Tək sifariş — panel detal səhifəsi üçün.
 * `userId` şərti VACİBDİR: başqasının sifariş nömrəsini bilən istifadəçi
 * onu görə bilməməlidir (IDOR qorunması).
 */
export async function getUserOrderByReference(
  userId: string,
  reference: string,
): Promise<PanelOrder | null> {
  const order = await prisma.order.findFirst({
    where: { userId, reference },
    include: {
      items: { include: { product: true } },
      shippings: true,
      totals: true,
    },
  });
  if (!order) return null;

  return {
    id: order.reference,
    date: formatDate(order.createdAt),
    status: order.status as PanelOrderStatus,
    isPaid: order.isPaid,
    total: formatMoney(order.totalCents, order.currency),
    courier: order.courier ?? "—",
    branch: order.branch ?? "—",
    tracking: order.tracking ?? "—",
    deliveryDate: formatDate(order.deliveryDate),
    paidDate: order.paidAt ? formatDate(order.paidAt) : "",
    isMixedCurrency: order.isMixedCurrency,
    shippings: order.shippings.map((s) => ({
      platformKey: s.platformKey,
      amount: formatMoney(s.amountCents, s.currency),
      basis: s.basis,
      method: s.methodName ?? s.method,
      etaDays: s.etaDays,
    })),
    totals: order.totals.map((t) => ({
      currency: t.currency,
      items: formatMoney(t.itemsCents, t.currency),
      shipping: formatMoney(t.shippingCents, t.currency),
      total: formatMoney(t.totalCents, t.currency),
    })),
    items: order.items.map((item) => ({
      id: item.id,
      name: item.name,
      price: formatMoney(item.priceCents, item.product?.currency ?? order.currency),
      brand: item.source ?? item.product?.brand ?? "",
      img: item.product?.image ?? "",
      quantity: item.quantity,
      productId: item.productId,
    })),
  };
}

/** Panel icmalı üçün statistika — hamısı bazadan hesablanır (qayda #4). */
export type PanelStats = {
  orderCount: number;
  /** Hazırlanan/yolda olan sifarişlər — müştəri üçün ən vacib rəqəm. */
  activeCount: number;
  deliveredCount: number;
  /** Valyuta üzrə xərc — fərqli valyutalar toplanmır. */
  spent: { currency: string; amount: string }[];
};

export async function getUserStats(userId: string): Promise<PanelStats> {
  const [orders, totals] = await Promise.all([
    prisma.order.groupBy({
      by: ["status"],
      where: { userId },
      _count: { _all: true },
    }),
    // Yalnız ÖDƏNİLMİŞ sifarişlər xərc sayılır.
    prisma.orderTotal.groupBy({
      by: ["currency"],
      where: { order: { userId, isPaid: true } },
      _sum: { totalCents: true },
    }),
  ]);

  const by = (s: string) =>
    orders.find((o) => o.status === s)?._count._all ?? 0;

  return {
    orderCount: orders.reduce((n, o) => n + o._count._all, 0),
    activeCount: by("pending") + by("processing") + by("shipped"),
    deliveredCount: by("delivered"),
    spent: totals
      .filter((t) => (t._sum.totalCents ?? 0) > 0)
      .map((t) => ({
        currency: t.currency,
        amount: formatMoney(t._sum.totalCents ?? 0, t.currency),
      })),
  };
}

/**
 * Profil səhifəsinin datası.
 *
 * Niyə ayrıca funksiya: `SessionUser` (cookie sessiyası) FİN saxlamır və
 * `user-session.ts` bu qatın sahəsində deyil. FİN ŞƏXSİ MƏLUMATDIR — yalnız
 * sahibinin öz profilinə ötürülür, ona görə sorğu `userId` ilə məhdudlaşır.
 */
export type PanelProfile = {
  fullName: string;
  email: string;
  phone: string;
  fin: string;
};

export async function getUserProfile(
  userId: string,
): Promise<PanelProfile | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { fullName: true, email: true, phone: true, fin: true },
  });
  if (!user) return null;

  return {
    fullName: user.fullName,
    email: user.email,
    phone: user.phone ?? "",
    fin: user.fin ?? "",
  };
}
