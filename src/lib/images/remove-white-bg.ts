import sharp from "sharp";

// Ağ fonlu şəkli ŞƏFFAF fona çevirir (AI generasiyaları ağ fon qaytarır).
// `server-only` İMPORT ETMİR — həm Next server kodundan, həm də CLI skriptindən
// (scripts/transparent-images.ts) istifadə olunur.

export type RemoveWhiteOptions = {
  /** Bu parlaqlıqdan yuxarı piksel tam şəffaf olur. */
  hard?: number;
  /** Bu parlaqlıqdan yuxarı piksel qismən şəffaf olur (yumşaq keçid). */
  soft?: number;
  /** Çıxış ölçüsü (kvadrat). null → ölçü dəyişmir. */
  size?: number | null;
  quality?: number;
};

/**
 * Ağ pikselləri alfa kanalına çevirir.
 * `soft`–`hard` aralığında qradiyent tətbiq olunur ki, kənarlarda ağ halo qalmasın.
 */
export async function removeWhiteBackground(
  input: Buffer,
  opts: RemoveWhiteOptions = {},
): Promise<Buffer> {
  const { hard = 248, soft = 228, size = 512, quality = 85 } = opts;

  let pipeline = sharp(input);
  if (size) pipeline = pipeline.resize(size, size, { fit: "cover" });

  const { data, info } = await pipeline
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const range = Math.max(1, hard - soft);
  for (let i = 0; i < data.length; i += 4) {
    // Ən qaranlıq kanal — rəngli pikselə toxunmuruq, yalnız ağa yaxınlar gedir.
    const min = Math.min(data[i], data[i + 1], data[i + 2]);
    if (min >= hard) data[i + 3] = 0;
    else if (min > soft) data[i + 3] = Math.round((255 * (hard - min)) / range);
  }

  return sharp(data, {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .webp({ quality, alphaQuality: 90 })
    .toBuffer();
}
