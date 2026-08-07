/**
 * Gemini ilə şəkil generasiya edir və ağ fonunu ŞƏFFAF edir.
 * Kateqoriya, platforma, banner — istənilən şəkil üçün ümumi alət.
 *
 * İstifadə:
 *   npm run image:gen -- --name kisi-geyimi --subject "Men's Clothing"
 *   npm run image:gen -- --name taobao-bag --prompt "Realistic photo of ..."
 *   npm run image:gen -- --name x --subject "Toys" --out public/categories --model gemini-3-pro-image
 *   npm run image:gen -- --name x --subject "Toys" --keep-bg      # fonu saxla
 *
 * Parametrlər:
 *   --name      (məcburi)  çıxış faylının adı (uzantısız)
 *   --subject   qısa mövzu — kataloq üslublu prompt-a sarılır
 *   --prompt    tam prompt (subject əvəzinə, olduğu kimi göndərilir)
 *   --out       qovluq (default: public/categories)
 *   --model     default: GEMINI_IMAGE_MODEL və ya gemini-3.1-flash-image
 *   --size      kvadrat ölçü (default 512)
 *   --keep-bg   fonu silmə
 */
import "dotenv/config";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { GoogleGenAI } from "@google/genai";
import sharp from "sharp";
import { removeWhiteBackground } from "../src/lib/images/remove-white-bg";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : undefined;
}
const flag = (name: string) => process.argv.includes(`--${name}`);

/** Kataloq üslubu: tək məhsul, təmiz ağ fon (sonra şəffaf edilir). */
function catalogPrompt(subject: string): string {
  return (
    `Professional e-commerce product photograph of ONE single representative ` +
    `product for "${subject}". The product is centered and isolated on a pure ` +
    `plain white background, soft even studio lighting, subtle natural shadow, ` +
    `sharp focus, high detail, realistic. Only one object, nothing else in frame. ` +
    `No people, no text, no words, no logos, no watermarks. Square framing.`
  );
}

async function main() {
  const name = arg("name");
  const subject = arg("subject");
  const custom = arg("prompt");

  if (!name || (!subject && !custom)) {
    console.error(
      "İstifadə: npm run image:gen -- --name <ad> (--subject <mövzu> | --prompt <tam prompt>)",
    );
    process.exit(1);
  }

  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    console.error("GEMINI_API_KEY .env-də yoxdur");
    process.exit(1);
  }

  const model =
    arg("model") ?? process.env.GEMINI_IMAGE_MODEL ?? "gemini-3.1-flash-image";
  const outDir = path.resolve(arg("out") ?? "public/categories");
  const size = Number(arg("size") ?? 512);
  const prompt = custom ?? catalogPrompt(subject!);

  console.log(`model: ${model}`);
  console.log(`prompt: ${prompt.slice(0, 90)}…`);

  const ai = new GoogleGenAI({ apiKey: key });
  const started = Date.now();
  const res = await ai.models.generateContent({ model, contents: prompt });

  const part = (res.candidates?.[0]?.content?.parts ?? []).find(
    (p) => p.inlineData?.data,
  );
  if (!part?.inlineData?.data) {
    console.error("Model şəkil qaytarmadı.");
    process.exit(1);
  }

  const raw = Buffer.from(part.inlineData.data, "base64");
  const out = flag("keep-bg")
    ? await sharp(raw).resize(size, size, { fit: "cover" }).webp({ quality: 85 }).toBuffer()
    : await removeWhiteBackground(raw, { size });

  await mkdir(outDir, { recursive: true });
  const file = path.join(outDir, `${name}.webp`);
  await writeFile(file, out);

  console.log(
    `✓ ${file}  ${Math.round(out.length / 1024)}KB  ${((Date.now() - started) / 1000).toFixed(1)}s` +
      `${flag("keep-bg") ? "" : "  (fon şəffaf)"}`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
