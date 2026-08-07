import { requireUser } from "@/lib/user-session";
import { getUserOrders } from "@/lib/data/account";
import { OrderList } from "@/components/panel/order-list";

// İstifadəçi kabineti indekslənmir (qayda #7). Layout "use client" olduğu üçün
// metadata export edə bilmir — ona görə hər səhifədə ayrıca verilir.
export const metadata = { robots: { index: false, follow: false } };


export default async function PanelOrdersPage() {
  const user = await requireUser();
  const orders = await getUserOrders(user.id);
  return <OrderList orders={orders} />;
}
