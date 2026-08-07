import { requireUser } from "@/lib/user-session";
import { getUserAddresses } from "@/lib/data/account";
import { getCities } from "@/lib/data/geo";
import { getLang } from "@/lib/server-lang";
import { AddressList } from "@/components/panel/address-list";

// İstifadəçi kabineti indekslənmir (qayda #7). Layout "use client" olduğu üçün
// metadata export edə bilmir — ona görə hər səhifədə ayrıca verilir.
export const metadata = { robots: { index: false, follow: false } };

export default async function PanelAddressesPage() {
  const user = await requireUser();
  const lang = await getLang();

  // Şəhər/rayon siyahısı bazadan — kuryer tarifi rayondan asılıdır.
  const [addresses, cities] = await Promise.all([
    getUserAddresses(user.id, lang),
    getCities(lang),
  ]);

  return <AddressList addresses={addresses} cities={cities} />;
}
