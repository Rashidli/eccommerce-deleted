import type { Metadata } from "next";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Admin girişi — E-Commerce",
  robots: { index: false, follow: false },
};

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;


  return (
    <main className="grid min-h-screen place-items-center bg-secondary px-4">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-8 shadow-sm">
        <div className="mb-6 text-center">
          <p className="text-2xl font-bold tracking-tight text-brand-ink">
            E-COMMERCE
          </p>
          <p className="mt-1 text-sm text-muted-foreground">İdarəetmə paneli</p>
        </div>

        {/* Parol ARTIQ formaya doldurulmur: əvvəl `ADMIN_PASSWORD` prop kimi
            ötürülürdü və səhifənin HTML mənbəyində hamıya görünürdü. İndi
            hesablar bazadadır, demo doldurmağa ehtiyac yoxdur. */}
        <LoginForm next={next ?? "/admin"} />
      </div>
    </main>
  );
}
