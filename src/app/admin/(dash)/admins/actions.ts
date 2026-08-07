"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin, requirePermission } from "@/lib/auth";
import { hashAdminPassword } from "@/lib/admin-auth";
import {
  ALL_PERMISSIONS,
  permissionsForRole,
  ROLE_LABELS,
  type PermissionKey,
} from "@/lib/admin-permissions";

/**
 * ADMIN HESABLARI — idarəetmə.
 *
 * ⚠️ QAYDA #1: bu, `User` modelindən TAM AYRIDIR. Burada müştəri hesabları
 * yoxdur və `User.role = "admin"` bu panelə giriş vermir.
 *
 * Öz-özünü kilidləmə mühafizəsi: son aktiv admin deaktiv edilə və ya silinə
 * bilməz — əks halda sistemə heç kim girə bilməzdi.
 */

/** Roldan yalnız tanınanları qəbul edirik — naməlum rol icazəsiz qalardı. */
function readRole(formData: FormData): string {
  const role = String(formData.get("role") ?? "admin");
  return ROLE_LABELS[role] ? role : "admin";
}

/**
 * Formadan gələn icazələr.
 *
 * Heç biri seçilməyibsə rolun şablonu tətbiq olunur — belə halda admin
 * icazəsiz qalıb heç bir bölməni aça bilməzdi.
 */
function readPermissions(formData: FormData, role: string): PermissionKey[] {
  const chosen = formData
    .getAll("permissions")
    .map(String)
    .filter((p): p is PermissionKey => (ALL_PERMISSIONS as string[]).includes(p));
  return chosen.length ? chosen : permissionsForRole(role);
}

async function activeAdminCount(exceptId?: string): Promise<number> {
  return prisma.admin.count({
    where: { isActive: true, ...(exceptId ? { id: { not: exceptId } } : {}) },
  });
}

export async function createAdmin(formData: FormData) {
  await requirePermission("admins");

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const fullName = String(formData.get("fullName") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const role = readRole(formData);

  if (!email || !fullName) return;
  if (password.length < 8) {
    redirect(
      `/admin/admins?error=${encodeURIComponent("Parol ən azı 8 simvol olmalıdır.")}`,
    );
  }

  const exists = await prisma.admin.findUnique({ where: { email }, select: { id: true } });
  if (exists) {
    redirect(
      `/admin/admins?error=${encodeURIComponent(`${email} artıq qeydiyyatdadır.`)}`,
    );
  }

  await prisma.admin.create({
    data: {
      email,
      fullName,
      password: hashAdminPassword(password),
      role,
      permissions: readPermissions(formData, role),
    },
  });

  revalidatePath("/admin/admins");
  redirect("/admin/admins?ok=1");
}

export async function updateAdmin(formData: FormData) {
  await requirePermission("admins");

  const id = String(formData.get("id") ?? "");
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const fullName = String(formData.get("fullName") ?? "").trim();
  const role = readRole(formData);
  const isActive = formData.get("isActive") === "on";

  if (!id || !email || !fullName) return;

  // Son aktiv admini deaktiv etmək sistemi kilidləyər.
  if (!isActive && (await activeAdminCount(id)) === 0) {
    redirect(
      `/admin/admins?error=${encodeURIComponent(
        "Bu, sonuncu aktiv admindir — deaktiv edilə bilməz.",
      )}`,
    );
  }

  const clash = await prisma.admin.findFirst({
    where: { email, id: { not: id } },
    select: { id: true },
  });
  if (clash) {
    redirect(
      `/admin/admins?error=${encodeURIComponent(`${email} başqa hesabda istifadə olunur.`)}`,
    );
  }

  await prisma.admin.update({
    where: { id },
    data: { email, fullName, role, isActive, permissions: readPermissions(formData, role) },
  });

  // Hesab bağlananda açıq sessiyaları da bağlanır — əks halda adam çıxarılıb,
  // amma brauzeri hələ də açıq qalırdı.
  if (!isActive) {
    await prisma.adminSession.deleteMany({ where: { adminId: id } });
  }

  revalidatePath("/admin/admins");
  redirect("/admin/admins?ok=1");
}

/** Parolu dəyişir və HƏMİN hesabın bütün sessiyalarını bağlayır. */
export async function setAdminPassword(formData: FormData) {
  await requirePermission("admins");

  const id = String(formData.get("id") ?? "");
  const password = String(formData.get("password") ?? "");
  if (!id) return;
  if (password.length < 8) {
    redirect(
      `/admin/admins?error=${encodeURIComponent("Parol ən azı 8 simvol olmalıdır.")}`,
    );
  }

  await prisma.$transaction([
    prisma.admin.update({ where: { id }, data: { password: hashAdminPassword(password) } }),
    prisma.adminSession.deleteMany({ where: { adminId: id } }),
  ]);

  revalidatePath("/admin/admins");
  redirect("/admin/admins?ok=1");
}

/** Hesabın bütün açıq sessiyalarını bağlayır — dərhal çıxış. */
export async function revokeAdminSessions(formData: FormData) {
  await requirePermission("admins");
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await prisma.adminSession.deleteMany({ where: { adminId: id } });
  revalidatePath("/admin/admins");
}

export async function deleteAdmin(formData: FormData) {
  const me = await requirePermission("admins");
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  if (id === me.id) {
    redirect(
      `/admin/admins?error=${encodeURIComponent("Öz hesabınızı silə bilməzsiniz.")}`,
    );
  }
  if ((await activeAdminCount(id)) === 0) {
    redirect(
      `/admin/admins?error=${encodeURIComponent(
        "Bu, sonuncu aktiv admindir — silinə bilməz.",
      )}`,
    );
  }

  await prisma.admin.delete({ where: { id } });
  revalidatePath("/admin/admins");
  redirect("/admin/admins?ok=1");
}
