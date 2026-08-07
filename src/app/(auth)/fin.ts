/**
 * FİN — Azərbaycan şəxsiyyət vəsiqəsinin fərdi identifikasiya nömrəsi.
 *
 * Format: 7 simvol, yalnız RƏQƏM (0-9) və BÖYÜK LATIN hərfi (A-Z). Məs. `5AB1C23`.
 *
 * Qeyd: bu fayl `"use server"` DEYİL — sinxron köməkçidir və həm `(auth)`
 * qeydiyyatından, həm də panel profilindən import olunur. `actions.ts`-ə
 * qoysaydıq işləməzdi: orada yalnız async server action ixrac oluna bilər
 * (`safe-next.ts` də eyni səbəbdən ayrıdır).
 *
 * ŞƏXSİ MƏLUMATDIR — heç bir halda loglanmır və URL-ə qoyulmur.
 */

/** 7 simvol: rəqəm və/və ya böyük latın hərfi. */
const FIN_PATTERN = /^[0-9A-Z]{7}$/;

/**
 * Daxil edilən dəyəri normallaşdırır: boşluqlar (o cümlədən daxildəkilər)
 * atılır, hərflər böyüdülür. İstifadəçi `5ab 1c23` yazsa da `5AB1C23` alınır.
 */
export function normalizeFin(input: unknown): string {
  return String(input ?? "")
    .replace(/\s+/g, "")
    .toUpperCase();
}

/** Normallaşdırılmış dəyər formata uyğundurmu. */
export function isValidFin(value: string): boolean {
  return FIN_PATTERN.test(value);
}

/**
 * Formadan gələn dəyəri emal edir.
 * `required` — qeydiyyatda məcburidir; profildə boş buraxmaq olar (dəyişməz).
 *
 * Qaytarır: `{ value }` uğurda (boş sətir = dəyər verilməyib),
 * `{ error }` isə i18n açarı ilə (hardcoded mətn yox — qayda #5).
 */
export function parseFin(
  input: unknown,
  { required }: { required: boolean },
): { value: string; error?: never } | { value?: never; error: string } {
  const value = normalizeFin(input);

  if (!value) {
    return required ? { error: "finRequired" } : { value: "" };
  }
  if (!isValidFin(value)) return { error: "finInvalid" };
  return { value };
}
