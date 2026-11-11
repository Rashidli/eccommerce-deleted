"use client";

import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel";

/**
 * ANA SƏHİFƏ SLAYDERİ — məzmun BAZADAN gəlir (`Slide` cədvəli).
 *
 * Əvvəl burada `const slides = [...]` vardı: üç Unsplash şəkli koda yazılmışdı.
 * Nəticədə `/admin/slides` bölməsi bazaya yazırdı, mağaza isə onu heç oxumurdu
 * — admin nə dəyişsə də səhifə dəyişmirdi. Bu, qayda #4-ün pozulması idi
 * (hardcoded məzmun qadağandır).
 *
 * Slayd yoxdursa komponent HEÇ NƏ göstərmir — çağıran tərəf ehtiyat başlığı
 * render edir. Boş qara qutu göstərmək daha pisdir.
 */

export type HeroSlide = {
  id: string;
  title: string;
  subtitle: string | null;
  image: string;
  href: string;
};

export function HeroCarousel({ slides }: { slides: HeroSlide[] }) {
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);

  const onSelect = useCallback(() => {
    if (!api) return;
    setCurrent(api.selectedScrollSnap());
  }, [api]);

  useEffect(() => {
    if (!api) return;
    onSelect();
    api.on("select", onSelect);

    // Tək slayd varsa avtomatik sürüşdürmək mənasızdır.
    const interval =
      slides.length > 1 ? setInterval(() => api.scrollNext(), 5000) : null;

    return () => {
      api.off("select", onSelect);
      if (interval) clearInterval(interval);
    };
  }, [api, onSelect, slides.length]);

  if (slides.length === 0) return null;

  return (
    <div className="relative">
      <Carousel setApi={setApi} className="w-full" opts={{ loop: slides.length > 1 }}>
        <CarouselContent>
          {slides.map((slide, i) => (
            <CarouselItem key={slide.id}>
              {/* ÜST QAT (qradiyent + başlıq + "Bax" düyməsi) SİLİNDİ:
                  bütün vizual bannerin ÖZ şəklindədir. Üstünə mətn yazmaq
                  dizaynı ikiqat edirdi və çox vaxt şəklin öz yazısının üstünə
                  düşürdü. Slaydın hamısı linkdir — ayrıca düyməyə ehtiyac yoxdur. */}
              <Link
                href={slide.href}
                className="relative block h-[220px] w-full overflow-hidden rounded-[22px] sm:h-[360px] md:h-[550px]"
              >
                <Image
                  src={slide.image}
                  alt={slide.title}
                  fill
                  // Banner konteynerin tam enini tutur — 100vw DOĞRUDUR.
                  sizes="100vw"
                  className="object-cover"
                  // Yalnız BİRİNCİ slayd prioritetdir: hamısını prioritet
                  // etmək ilk ekranın yüklənməsini yavaşladır.
                  priority={i === 0}
                />
              </Link>
            </CarouselItem>
          ))}
        </CarouselContent>
        {slides.length > 1 && (
          <>
            <CarouselPrevious className="left-4 hidden sm:flex" />
            <CarouselNext className="right-4 hidden sm:flex" />
          </>
        )}
      </Carousel>

      {slides.length > 1 && (
        <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2">
          {slides.map((slide, index) => (
            <button
              key={slide.id}
              aria-label={`${index + 1}-ci slayd`}
              className={`h-2 rounded-full transition-all ${
                index === current ? "w-8 bg-white" : "w-2 bg-white/50"
              }`}
              onClick={() => api?.scrollTo(index)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
