import "server-only";
import { cookies } from "next/headers";
import { type Lang, DEFAULT_LANG } from "@/lib/i18n";

const VALID: Lang[] = ["az", "en", "ru"];
export const LANG_COOKIE = "ecommerce-lang";

/**
 * SSR locale körpüsü — client `ecommerce-lang` cookie-sini oxuyur.
 * Client i18n (lang-context) bu cookie-ni yazır; server dinamik məhsul/kateqoriya
 * mətnlərini bu dilə görə lokallaşdırır (pickLang).
 */
export async function getLang(): Promise<Lang> {
  const store = await cookies();
  const value = store.get(LANG_COOKIE)?.value as Lang | undefined;
  return value && VALID.includes(value) ? value : DEFAULT_LANG;
}
