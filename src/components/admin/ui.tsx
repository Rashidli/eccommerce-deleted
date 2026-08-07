import Link from "next/link";
import type { ReactNode } from "react";

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold text-brand-ink">{title}</h1>
        {subtitle && (
          <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
        )}
      </div>
      {action}
    </div>
  );
}

export function PrimaryLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-brand-foreground transition-opacity hover:opacity-90"
    >
      {children}
    </Link>
  );
}

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-border bg-card ${className}`}
    >
      {children}
    </div>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <p className="px-4 py-12 text-center text-sm text-muted-foreground">
      {children}
    </p>
  );
}

/** Üfüqi sürüşən cədvəl — dar ekranda səhifə yana sürüşməsin. */
export function Table({
  head,
  children,
}: {
  head: string[];
  children: ReactNode;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-sm">
        <thead>
          <tr className="border-b border-border text-left">
            {head.map((label) => (
              <th
                key={label}
                className="whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
              >
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">{children}</tbody>
      </table>
    </div>
  );
}

export function Td({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <td className={`px-4 py-3 align-middle ${className}`}>{children}</td>;
}

const STATUS_TONES: Record<string, string> = {
  // Ödəniş gözlənilən sifariş hələ operator işi deyil — neytral ton.
  pending: "bg-secondary text-muted-foreground",
  processing: "bg-amber-100 text-amber-800",
  shipped: "bg-sky-100 text-sky-800",
  delivered: "bg-emerald-100 text-emerald-800",
  cancelled: "bg-rose-100 text-rose-800",
  active: "bg-emerald-100 text-emerald-800",
  inactive: "bg-secondary text-muted-foreground",
};

export const STATUS_LABELS: Record<string, string> = {
  pending: "Ödəniş gözlənilir",
  processing: "Hazırlanır",
  shipped: "Yoldadır",
  delivered: "Çatdırılıb",
  cancelled: "Ləğv edilib",
};

export function Badge({ status, label }: { status: string; label?: string }) {
  return (
    <span
      className={`inline-block whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${
        STATUS_TONES[status] ?? "bg-secondary text-muted-foreground"
      }`}
    >
      {label ?? STATUS_LABELS[status] ?? status}
    </span>
  );
}

export function Stat({
  label,
  value,
  icon,
  href,
}: {
  label: string;
  value: string;
  icon: ReactNode;
  href?: string;
}) {
  const body = (
    <Card className="p-4 transition-colors hover:border-brand/40">
      <span className="grid h-10 w-10 place-items-center rounded-lg bg-brand/10 text-brand">
        {icon}
      </span>
      <p className="mt-3 text-xs text-muted-foreground">{label}</p>
      <p className="text-xl font-bold text-brand-ink">{value}</p>
    </Card>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}
