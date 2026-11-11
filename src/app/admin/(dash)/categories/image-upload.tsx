"use client";

import { useRef, useState, useTransition } from "react";
import Image from "next/image";
import { ImagePlus, Loader2 } from "lucide-react";
import { uploadCategoryImage } from "../platforms/actions";

/**
 * KATEQORİYA ŞƏKLİ YÜKLƏYİCİSİ — cədvəldəki kiçik önizləmə həm də düymədir.
 *
 * Ayrıca "Yüklə" düyməsi YOXDUR: fayl seçilən kimi göndərilir. Admin cədvəlində
 * hər sətir üçün ikinci düymə saxlamaq sıxlıq yaradırdı və seçəndən sonra
 * "indi nə etməliyəm" sualı doğururdu.
 *
 * Şəkil serverdə 512px kvadrat webp-ə çevrilir (`uploadCategoryImage`), ona görə
 * admin ölçü/format haqqında düşünmür — telefon şəkli də olar.
 */
export function CategoryImageUpload({
  id,
  image,
  label,
}: {
  id: string;
  image: string | null;
  label: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  // Yüklənən şəkli DƏRHAL göstərmək üçün — server yolu `?v=` ilə dəyişənə qədər
  // admin nəyi seçdiyini görsün.
  const [preview, setPreview] = useState<string | null>(null);

  const handle = (file: File | undefined) => {
    if (!file) return;
    setError(null);
    setPreview(URL.createObjectURL(file));

    const data = new FormData();
    data.set("id", id);
    data.set("file", file);

    startTransition(async () => {
      try {
        await uploadCategoryImage(data);
      } catch (e) {
        setPreview(null); // server qəbul etmədi — yalançı nəticə göstərmirik
        setError(e instanceof Error ? e.message : "Yüklənmədi");
      }
    });
  };

  const src = preview ?? image;

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={pending}
        title={`${label} — şəkil yüklə`}
        aria-label={`${label} üçün şəkil yüklə`}
        className="relative grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-full border border-border bg-secondary transition-opacity hover:opacity-80 disabled:opacity-50"
      >
        {src ? (
          <Image
            src={src}
            alt={label}
            fill
            sizes="44px"
            className="object-cover"
            // Blob önizləmə `next/image` optimizasiyasından keçə bilmir.
            unoptimized={Boolean(preview)}
          />
        ) : (
          <ImagePlus className="h-4 w-4 text-muted-foreground" />
        )}

        {pending && (
          <span className="absolute inset-0 grid place-items-center bg-black/40">
            <Loader2 className="h-4 w-4 animate-spin text-white" />
          </span>
        )}
      </button>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          handle(e.target.files?.[0]);
          // Eyni faylı təkrar seçmək mümkün olsun deyə sıfırlanır.
          e.target.value = "";
        }}
      />

      {error && (
        <span className="text-[11px] text-destructive" role="alert">
          {error}
        </span>
      )}
    </div>
  );
}
