import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/user-session";
import { getUserAddresses } from "@/lib/data/account";
import { getPickupPoints } from "@/lib/data/geo";
import { getLang } from "@/lib/server-lang";
import { CheckoutClient } from "./checkout-client";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

/**
 * Ödəniş yalnız daxil olmuş istifadəçi üçündür.
 *
 * Yoxlama SERVERDƏ aparılır — client tərəfli yönləndirmə ilə səhifə bir anlıq
 * görünərdi. Qonaq `/login?next=/checkout`-a atılır; login-dən sonra buraya
 * qayıdır və səbəti (brauzerdə saxlandığı üçün) olduğu kimi qalır.
 *
 * Ünvanlar və PUDO məntəqələri serverdə oxunur — çatdırılma haqqı bazadakı
 * rayon tarifindən gəlir, client-dən qəbul edilmir.
 */
export default async function CheckoutPage() {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent("/checkout")}`);

  const lang = await getLang();
  const [addresses, pickupPoints] = await Promise.all([
    getUserAddresses(user.id, lang),
    getPickupPoints(lang),
  ]);

  return <CheckoutClient addresses={addresses} pickupPoints={pickupPoints} />;
}
