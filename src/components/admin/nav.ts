import {
  LayoutDashboard,
  Package,
  PackageCheck,
  FolderTree,
  Ticket,
  Megaphone,
  Images,
  Newspaper,
  ShoppingBag,
  Users,
  ShieldCheck,
  Store,
  Truck,
  Coins,
  MapPin,
  Building2,
  type LucideIcon,
} from "lucide-react";

export type AdminNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

export const adminNav: AdminNavItem[] = [
  { href: "/admin", label: "İdarə paneli", icon: LayoutDashboard },
  { href: "/admin/products", label: "Məhsullar", icon: Package },
  { href: "/admin/categories", label: "Kateqoriyalar", icon: FolderTree },
  { href: "/admin/platforms", label: "Platformalar", icon: Store },
  { href: "/admin/currency", label: "Valyuta", icon: Coins },
  { href: "/admin/shipping", label: "Platforma kargo", icon: Truck },
  { href: "/admin/delivery", label: "Yerli çatdırılma", icon: MapPin },
  { href: "/admin/cargo", label: "Kargo şirkətləri", icon: Building2 },
  { href: "/admin/orders", label: "Sifarişlər", icon: ShoppingBag },
  { href: "/admin/purchases", label: "Alışlar", icon: PackageCheck },
  { href: "/admin/promo-codes", label: "Promo kodlar", icon: Ticket },
  { href: "/admin/campaigns", label: "Kampaniyalar", icon: Megaphone },
  { href: "/admin/slides", label: "Slayder", icon: Images },
  { href: "/admin/posts", label: "Bloq", icon: Newspaper },
  { href: "/admin/users", label: "İstifadəçilər", icon: Users },
  { href: "/admin/admins", label: "Adminlər", icon: ShieldCheck },
];
