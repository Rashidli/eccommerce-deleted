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
import { ArrowRight } from "lucide-react";

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
              <div className="relative h-[300px] w-full overflow-hidden rounded-xl sm:h-[400px] md:h-[500px]">
                <Image
                  src={slide.image}
                  alt={slide.title}
                  fill
                  // Slayder həmişə tam en tutur — burada 100vw DOĞRUDUR.
                  sizes="100vw"
                  className="object-cover"
                  // Yalnız BİRİNCİ slayd prioritetdir: hamısını prioritet
                  // etmək ilk ekranın yüklənməsini yavaşladır.
                  priority={i === 0}
                />
                <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-transparent" />
                <div className="absolute inset-0 flex items-center">
                  <div className="container mx-auto px-8 md:px-16">
                    <div className="max-w-xl">
                      {slide.subtitle && (
                        <span className="mb-4 inline-block rounded-full bg-primary px-3 py-1 text-sm font-medium text-primary-foreground">
                          {slide.subtitle}
                        </span>
                      )}
                      <h2 className="mb-4 text-3xl font-bold text-white sm:text-4xl md:text-5xl">
                        {slide.title}
                      </h2>
                      <Link
                        href={slide.href}
                        className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-brand-ink transition hover:bg-white/90"
                      >
                        Bax
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
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
