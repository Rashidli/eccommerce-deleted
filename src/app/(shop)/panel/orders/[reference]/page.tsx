import { notFound } from "next/navigation";
import { requireUser } from "@/lib/user-session";
import { getUserOrderByReference } from "@/lib/data/account";
import { OrderDetail } from "@/components/panel/order-detail";

// İstifadəçi kabineti indekslənmir (qayda #7).
export const metadata = { robots: { index: false, follow: false } };

export default async function PanelOrderDetailPage({
  params,
}: {
  // Next 16: `params` Promise-dir.
  params: Promise<{ reference: string }>;
}) {
  const { reference } = await params;
  const user = await requireUser();

  // Sorğu `userId` ilə məhdudlaşır — başqasının sifariş nömrəsini bilən
  // istifadəçi onu aça bilməz.
  const order = await getUserOrderByReference(user.id, reference);
  if (!order) notFound();

  return <OrderDetail order={order} />;
}
