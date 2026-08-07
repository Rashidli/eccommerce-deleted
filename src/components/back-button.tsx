"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";

// Tətbiqdəki kimi geri düyməsi — mobil ekran başlıqlarında işlənir.
export function BackButton() {
  const router = useRouter();

  return (
    <button
      onClick={() => router.back()}
      aria-label="Geri"
      className="-ml-1 grid h-9 w-9 shrink-0 place-items-center rounded-full text-foreground/70 transition-transform active:scale-90"
    >
      <ChevronLeft className="h-6 w-6" />
    </button>
  );
}
