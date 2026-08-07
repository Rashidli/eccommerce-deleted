import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/user-session";
import { AuthForm } from "../auth-form";
import { safeNext, validNextOrUndefined } from "../safe-next";

export const metadata: Metadata = {
  title: "Qeydiyyat",
  robots: { index: false, follow: false },
};

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  // Artıq daxil olubsa, hədəfə (məs. /checkout) yönləndirilir — əvvəl bu
  // hal həmişə /panel-ə atırdı və istifadəçi getmək istədiyi yeri itirirdi.
  if (await getCurrentUser()) redirect(safeNext(next));

  const nextParam = validNextOrUndefined(next);

  return <AuthForm mode="register" next={nextParam} />;
}
