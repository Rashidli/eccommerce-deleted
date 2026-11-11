import { SearchLoader } from "@/components/ui/search-loader";

// Naviqasiya fallback-ı. `page.tsx`-dəki Suspense ilə EYNİ ekranı göstərir —
// əks halda iki fallback ardıcıl görünür və ekran bir dəfə "sıçrayır"
// (əvvəl boş skelet, sonra yükləyici).
//
// Alt seqment `products/[id]` bunu öz `loading.tsx`-i ilə əvəz edir.
export default function Loading() {
  return <SearchLoader />;
}
