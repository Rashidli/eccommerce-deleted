import { requireUser } from "@/lib/user-session";
import { getUserProfile } from "@/lib/data/account";
import { ProfileForm } from "@/components/panel/profile-form";

// İstifadəçi kabineti indekslənmir (qayda #7). Layout "use client" olduğu üçün
// metadata export edə bilmir — ona görə hər səhifədə ayrıca verilir.
export const metadata = { robots: { index: false, follow: false } };


export default async function PanelProfilePage() {
  const user = await requireUser();
  // FİN yalnız SAHİBİNİN öz profilinə ötürülür — sorğu `userId` ilə
  // məhdudlaşır, başqa heç bir cavabda/URL-də görünmür (şəxsi məlumat).
  const profile = await getUserProfile(user.id);

  return (
    <ProfileForm
      customerCode={user.customerCode}
      initial={
        profile ?? {
          fullName: user.fullName,
          email: user.email,
          phone: user.phone ?? "",
          fin: "",
        }
      }
    />
  );
}
