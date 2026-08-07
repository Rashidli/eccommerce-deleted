import type { Metadata } from "next";
import { AdminSidebar } from "@/components/admin/sidebar";
import { requireAdmin } from "@/lib/auth";
import { adminNav } from "@/components/admin/nav";
import { can, NAV_PERMISSION } from "@/lib/admin-permissions";

export const metadata: Metadata = {
  title: "Admin — E-Commerce",
  robots: { index: false, follow: false },
};

// Admin həmişə cari bazanı göstərməlidir — statik prerender yoxdur.
export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // proxy.ts artıq kəsir; bu, layout birbaşa render olunsa belə qorunma verir.
  const admin = await requireAdmin();

  // Menyu YALNIZ icazəsi olan bölmələri göstərir. Bu, təhlükəsizlik tədbiri
  // DEYİL (ünvanı əl ilə yazmaq olar) — səhifələr özləri də yoxlayır; bu,
  // sadəcə istifadəçini olmayan qapılara aparmamaq üçündür.
  const allowed = adminNav
    .filter((item) => can(admin, NAV_PERMISSION[item.href] ?? "dashboard"))
    .map((item) => item.href);

  return (
    <div className="min-h-screen flex-1 bg-background lg:flex">
      <AdminSidebar allowed={allowed} adminName={admin.fullName} />
      <main className="min-w-0 flex-1 px-4 py-6 lg:px-8 lg:py-8">
        {children}
      </main>
    </div>
  );
}
