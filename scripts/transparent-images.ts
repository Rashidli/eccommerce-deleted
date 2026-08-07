/**
 * Qovluqdakı şəkillərin ağ fonunu şəffafa çevirir (yerində yazır).
 *
 * İstifadə:
 *   npm run images:transparent                 → public/categories
 *   npm run images:transparent -- public/assets → başqa qovluq
 *   npm run images:transparent -- public/categories --dry
 */
import { readdir, readFile, writeFile, stat } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { removeWhiteBackground } from "../src/lib/images/remove-white-bg";

const EXT = new Set([".webp", ".png", ".jpg", ".jpeg"]);

async function main() {
  const args = process.argv.slice(2);
  const dry = args.includes("--dry");
  const dir = path.resolve(args.find((a) => !a.startsWith("--")) ?? "public/categories");

  const files = (await readdir(dir)).filter((f) => EXT.has(path.extname(f).toLowerCase()));
  if (files.length === 0) {
    console.log(`Şəkil tapılmadı: ${dir}`);
    return;
  }

  console.log(`${dir} → ${files.length} şəkil${dry ? " (DRY RUN)" : ""}`);
  let changed = 0;
  let skipped = 0;

  for (const file of files) {
    const full = path.join(dir, file);
    const before = (await stat(full)).size;
    const input = await readFile(full);

    // Onsuz da şəffafdırsa toxunmuruq.
    const meta = await sharp(input).metadata();
    if (meta.hasAlpha) {
      const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
      let transparent = 0;
      for (let i = 3; i < data.length; i += 4) if (data[i] === 0) transparent++;
      // 2%-dən çox tam şəffaf piksel varsa artıq emal olunub.
      if (transparent / (info.width * info.height) > 0.02) {
        skipped++;
        continue;
      }
    }

    const out = await removeWhiteBackground(input);
    if (!dry) await writeFile(full, out);
    changed++;
    console.log(`  ✓ ${file}  ${Math.round(before / 1024)}KB → ${Math.round(out.length / 1024)}KB`);
  }

  console.log(`Bitdi: ${changed} emal olundu, ${skipped} artıq şəffaf idi.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
