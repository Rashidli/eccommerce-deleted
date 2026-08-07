/**
 * ADMIN İCAZƏLƏRİ — hansı bölməyə kimin çıxışı var.
 *
 * Model qəsdən sadədir: icazə = BÖLMƏ AÇARI. "oxu/yaz" ayrımı yoxdur, çünki
 * bu panelin hər bölməsi onsuz da idarəetmə üçündür — sifarişlərə baxıb
 * dəyişməyən rol praktikada yoxdur. Ehtiyac yaranaraq artsa, açarları
 * `orders:read` / `orders:write` kimi bölmək bu quruluşu sındırmır.
 *
 * ROL — hazır şablon. HƏQİQİ icazə isə `Admin.permissions` sütunundadır:
 * admin yaradılanda rol şablonundan doldurulur, sonra fərdi dəyişilə bilər.
 * Beləcə "yalnız sifarişlərə baxan operator" üçün yeni rol icad etmək
 * lazım gəlmir.
 *
 * ⚠️ `owner` istisnadır: bütün yoxlamalardan keçir. Əks halda sonuncu sahib
 * öz icazələrini silib sistemi kilidləyə bilərdi.
 */

export const PERMISSIONS = [
  { key: "dashboard", label: "İdarə paneli" },
  { key: "products", label: "Məhsullar" },
  { key: "categories", label: "Kateqoriyalar" },
  { key: "platforms", label: "Platformalar" },
  { key: "orders", label: "Sifarişlər" },
  { key: "purchases", label: "Alışlar" },
  { key: "delivery", label: "Çatdırılma və kargo" },
  { key: "marketing", label: "Promo, kampaniya, slayder, bloq" },
  { key: "users", label: "Müştərilər" },
  { key: "settings", label: "Valyuta və ayarlar" },
  { key: "admins", label: "Adminlər" },
] as const;

export type PermissionKey = (typeof PERMISSIONS)[number]["key"];

export const ALL_PERMISSIONS: PermissionKey[] = PERMISSIONS.map((p) => p.key);

/** Rol şablonları — yeni admin yaradılanda başlanğıc icazə dəsti. */
export const ROLE_PRESETS: Record<string, PermissionKey[]> = {
  /** Hər şey. Yoxlamalardan onsuz da keçir, siyahı yalnız UI-da görünsün deyə. */
  owner: ALL_PERMISSIONS,
  admin: ALL_PERMISSIONS.filter((p) => p !== "admins"),
  /** Gündəlik əməliyyat: sifariş, alış, çatdırılma. */
  operator: ["dashboard", "orders", "purchases", "delivery", "users"],
  /** Kataloq və məzmun. */
  editor: ["dashboard", "products", "categories", "marketing"],
};

export const ROLE_LABELS: Record<string, string> = {
  owner: "Sahib",
  admin: "Admin",
  operator: "Operator",
  editor: "Redaktor",
};

export type AdminLike = {
  role: string;
  permissions: string[];
};

/** Bu admin həmin bölməyə girə bilirmi? */
export function can(admin: AdminLike, permission: PermissionKey): boolean {
  if (admin.role === "owner") return true;
  return admin.permissions.includes(permission);
}

/** Rol seçiləndə forma üçün başlanğıc icazələr. */
export function permissionsForRole(role: string): PermissionKey[] {
  return ROLE_PRESETS[role] ?? ROLE_PRESETS.admin;
}

/**
 * Naviqasiya elementinin hansı icazəyə aid olduğu.
 *
 * Menyu icazəsiz bölmələri GÖSTƏRMİR — kliklədikdə "icazəniz yoxdur"
 * səhifəsinə düşmək istifadəçini çaşdırır.
 */
export const NAV_PERMISSION: Record<string, PermissionKey> = {
  "/admin": "dashboard",
  "/admin/products": "products",
  "/admin/categories": "categories",
  "/admin/platforms": "platforms",
  "/admin/currency": "settings",
  "/admin/shipping": "delivery",
  "/admin/delivery": "delivery",
  "/admin/cargo": "delivery",
  "/admin/orders": "orders",
  "/admin/purchases": "purchases",
  "/admin/promo-codes": "marketing",
  "/admin/campaigns": "marketing",
  "/admin/slides": "marketing",
  "/admin/posts": "marketing",
  "/admin/users": "users",
  "/admin/admins": "admins",
};
