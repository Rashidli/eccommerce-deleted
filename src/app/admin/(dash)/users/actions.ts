"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { hashPassword } from "@/lib/user-session";

/**
 * İSTİFADƏÇİ ƏMƏLİYYATLARI.
 *
 * ⚠️ QAYDA #1: admin auth və müştəri auth TAM AYRIDIR. Bu bölmə `User`
 * modelini idarə edir — yəni MÜŞTƏRİ hesablarını. Admin sessiyası
 * (`ecommerce_admin`) buradan qidalanmır və `role` sahəsi admin girişi vermir;
 * o, yalnız hesabın növünü göstərir.
 */

/** Formadan gələn dəyərlər — hər əməliyyatda eyni cür oxunur. */
function readForm(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const fullName = String(formData.get("fullName") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const fin = String(formData.get("fin") ?? "").trim().toUpperCase();
  const customerCode = String(formData.get("customerCode") ?? "").trim().toUpperCase();
  const role = String(formData.get("role") ?? "customer");

  return {
    email,
    fullName,
    phone: phone || null,
    fin: fin || null,
    customerCode: customerCode || null,
    role: role === "admin" ? "admin" : "customer",
  };
}

/**
 * Unikal sahələrin toqquşmasını ƏVVƏLCƏDƏN yoxlayır.
 *
 * `email`, `fin` və `customerCode` bazada UNIQUE-dir. Yoxlamasaq Prisma
 * P2002 atır və admin-ə anlaşılmaz xəta çıxır — hansı sahənin toqquşduğu
 * bilinmir. Burada səbəb açıq deyilir.
 */
async function findConflict(
  data: ReturnType<typeof readForm>,
  exceptId?: string,
): Promise<string | null> {
  const checks: { field: string; label: string; value: string | null }[] = [
    { field: "email", label: "E-poçt", value: data.email },
    { field: "fin", label: "FİN", value: data.fin },
    { field: "customerCode", label: "Müştəri kodu", value: data.customerCode },
  ];

  for (const { field, label, value } of checks) {
    if (!value) continue;
    const found = await prisma.user.findFirst({
      where: { [field]: value, ...(exceptId ? { id: { not: exceptId } } : {}) },
      select: { id: true, fullName: true },
    });
    if (found) return `${label} artıq istifadədədir (${found.fullName}).`;
  }
  return null;
}

export async function createUser(formData: FormData) {
  await requireAdmin();
  const data = readForm(formData);
  const password = String(formData.get("password") ?? "");

  if (!data.email || !data.fullName) return;

  const conflict = await findConflict(data);
  if (conflict) redirect(`/admin/users/new?error=${encodeURIComponent(conflict)}`);

  await prisma.user.create({
    data: {
      ...data,
      // Şifrə könüllüdür: admin hesabı əvvəlcədən yarada bilər, müştəri
      // sonradan "şifrəni bərpa et" ilə təyin edər.
      password: password ? hashPassword(password) : null,
      // `customerCode` boş qalarsa bazadakı trigger özü doldurur (FOR000001).
      customerCode: data.customerCode,
    },
  });

  revalidatePath("/admin/users");
  redirect("/admin/users");
}

export async function updateUser(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const data = readForm(formData);
  if (!id || !data.email || !data.fullName) return;

  const conflict = await findConflict(data, id);
  if (conflict) redirect(`/admin/users/${id}?error=${encodeURIComponent(conflict)}`);

  await prisma.user.update({ where: { id }, data });

  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${id}`);
  redirect(`/admin/users/${id}?ok=1`);
}

/**
 * Şifrəni admin təyin edir (məs. müştəri girişi itirib).
 *
 * Köhnə şifrə soruşulmur — admin onu onsuz da bilmir. Şifrə dəyişəndə BÜTÜN
 * sessiyalar ləğv olunur: əks halda oğurlanmış sessiya şifrə dəyişəndən sonra
 * da işləməyə davam edərdi.
 */
export async function setUserPassword(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const password = String(formData.get("password") ?? "");
  if (!id || password.length < 6) return;

  await prisma.$transaction([
    prisma.user.update({ where: { id }, data: { password: hashPassword(password) } }),
    prisma.userSession.deleteMany({ where: { userId: id } }),
  ]);

  revalidatePath(`/admin/users/${id}`);
}

/** Bütün açıq sessiyaları bağlayır — hesab dərhal çıxış etmiş olur. */
export async function revokeUserSessions(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await prisma.userSession.deleteMany({ where: { userId: id } });
  revalidatePath(`/admin/users/${id}`);
}

/**
 * İstifadəçini silir.
 *
 * SİFARİŞİ OLAN hesab SİLİNMİR: sifariş tarixçəsi mühasibat qeydidir və
 * sahibsiz qalmamalıdır. Belə halda hesabı bloklamaq (şifrəni ləğv edib
 * sessiyaları bağlamaq) düzgün yoldur.
 */
export async function deleteUser(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const orders = await prisma.order.count({ where: { userId: id } });
  if (orders > 0) {
    redirect(
      `/admin/users/${id}?error=${encodeURIComponent(
        `Bu hesabın ${orders} sifarişi var — silinmir. Əvəzinə girişi bağlayın.`,
      )}`,
    );
  }

  await prisma.user.delete({ where: { id } });
  revalidatePath("/admin/users");
  redirect("/admin/users");
}
