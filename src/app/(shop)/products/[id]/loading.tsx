import { ProductDetailSkeleton } from "@/components/ui/skeleton";

// Valideyn `products/loading.tsx` alt seqmentlərə də şamil olunur — burada onu
// əvəz edirik ki, TƏK məhsul yüklənəndə siyahı skeleti görünməsin.
export default function Loading() {
  return <ProductDetailSkeleton />;
}
