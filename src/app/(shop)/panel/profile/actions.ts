"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/user-session";
import { parseFin } from "@/app/(auth)/fin";

export type ProfileState = { ok?: boolean; error?: string };

export async function updateProfile(
  _prev: ProfileState,
  formData: FormData,
): Promise<ProfileState> {
  const user = await requireUser();
  const fullName = String(formData.get("fullName") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim() || null;

  if (!fullName) return { error: "fillFields" };

  // FİN QAYDASI: boşdursa yazıla bilər, DOLUDURSA dəyişdirilə bilməz.
  //
  // Səbəb: FİN şəxsiyyəti təsdiqləyir və gömrük bəyannaməsində istifadə olunur —
  // sərbəst dəyişdirilməsi saxtakarlıq yoludur. Eyni zamanda köhnə hesabların
  // FİN-i yoxdur, onları da bloklamaq olmaz. Ona görə: BİR DƏFƏ yazılır.
  // Səhv yazılıbsa dəstək dəyişir (istifadəçiyə mesajda deyilir).
  const current = await prisma.user.findUnique({
    where: { id: user.id },
    select: { fin: true },
  });

  let finToSave: string | undefined;
  if (!current?.fin) {
    const parsed = parseFin(formData.get("fin"), { required: false });
    if (parsed.error) return { error: parsed.error };
    if (parsed.value) finToSave = parsed.value;
  }
  // FİN artıq varsa formadan gələn dəyər TAM İGNOR olunur — client-in
  // göndərdiyi gizli sahə ilə dəyişdirilə bilməsin.

  try {
    await prisma.user.update({
      where: { id: user.id },
      // Email dəyişdirilmir (yalnız-oxu). Yalnız öz profilini yeniləyir.
      data: { fullName, phone, ...(finToSave ? { fin: finToSave } : {}) },
    });
  } catch (e) {
    // FİN unikaldır — başqası artıq bu FİN-i yazıbsa aydın mesaj qaytarırıq.
    if (
      typeof e === "object" &&
      e !== null &&
      (e as { code?: string }).code === "P2002"
    ) {
      return { error: "finTaken" };
    }
    throw e;
  }

  revalidatePath("/panel/profile");
  revalidatePath("/panel");
  return { ok: true };
}
