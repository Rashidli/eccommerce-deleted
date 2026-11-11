import "server-only";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

/**
 * KATEQORİYA ŞƏKİLLƏRİNİN YAZILMASI — tək giriş nöqtəsi.
 *
 * İki mənbə var: admin yükləməsi (`uploadCategoryImage`) və AI generatoru
 * (`lib/ai/generate-category-images.ts`). Əvvəl hər ikisi faylı öz əli ilə
 * yazırdı; nəticədə format qərarı iki yerə səpələnmişdi. İndi qərar burada.
 *
 * HƏR ŞƏKİL İKİ FAYL YARADIR:
 *   · `1688-10165.webp`       — 512px, kateqoriya səhifəsi/banner üçün
 *   · `1688-10165-thumb.webp` — 128px, ~2-4 KB, kiçik dairələr üçün
 *
 * NİYƏ AYRICA MİNİATÜR, `next/image` DEYİL: mega-menyuda 100-ə yaxın 30px-lik
 * dairə eyni anda görünür. `next/image` hər ölçü üçün serverdə `sharp` işə
 * salır və nəticəni `.next/cache/images`-ə yığır — 2 nüvəli serverdə bu həm
 * gecikmə, həm də nəzarətsiz keş böyüməsi deməkdir (bir dəfə 15 GB-a çatıb
 * saytı dayandırıb). Hazır miniatür isə nginx-in birbaşa verdiyi statik
 * fayldır: nə sharp, nə keş, nə gecikmə.
 *
 * 128px seçilib, çünki eyni fayl iki yerdə işlənir: mega-menyuda 30px (4x
 * sıxlıq) və header story zolağında 56px (2.3x) — hər ikisində kəskin görünür.
 */

export const CATEGORY_IMAGE_DIR = path.join(process.cwd(), "public", "categories");
export const CATEGORY_THUMB_SIZE = 128;
export const CATEGORY_FULL_SIZE = 512;

/**
 * `full` bufer-i verilmiş adla yazır və yanında miniatürünü yaradır.
 * Qaytarır: DB-yə yazılacaq ictimai yol (keş sındırıcısı OLMADAN).
 *
 * @param fileBase uzantısız fayl adı, məs. `1688-10165`
 * @param full     hazır 512px webp bufer
 */
export async function writeCategoryImage(
  fileBase: string,
  full: Buffer,
): Promise<string> {
  await mkdir(CATEGORY_IMAGE_DIR, { recursive: true });

  const thumb = await sharp(full)
    .resize(CATEGORY_THUMB_SIZE, CATEGORY_THUMB_SIZE, {
      fit: "cover",
      position: "centre",
    })
    .webp({ quality: 80 })
    .toBuffer();

  await Promise.all([
    writeFile(path.join(CATEGORY_IMAGE_DIR, `${fileBase}.webp`), full),
    writeFile(path.join(CATEGORY_IMAGE_DIR, `${fileBase}-thumb.webp`), thumb),
  ]);

  return `/categories/${fileBase}.webp`;
}
