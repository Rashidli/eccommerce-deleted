import { requireUser } from "@/lib/user-session";
import { getUserOrders, getUserStats } from "@/lib/data/account";
import { PanelDashboard } from "@/components/panel/panel-dashboard";

// İstifadəçi kabineti indekslənmir (qayda #7). Layout "use client" olduğu üçün
// metadata export edə bilmir — ona görə hər səhifədə ayrıca verilir.
export const metadata = { robots: { index: false, follow: false } };


export default async function PanelDashboardPage() {
  const user = await requireUser();
  const [orders, stats] = await Promise.all([
    getUserOrders(user.id),
    getUserStats(user.id),
  ]);

  return (
    <PanelDashboard
      name={user.fullName}
      email={user.email}
      customerCode={user.customerCode}
      stats={stats}
      recentOrders={orders.slice(0, 2)}
    />
  );
}
