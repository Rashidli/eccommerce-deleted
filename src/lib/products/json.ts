// JSONB sahələri `unknown` gəlir — adapterlər sınmasın deyə təhlükəsiz oxuyucular.
// Platformalar sahə tipini xəbərdarlıqsız dəyişə bilər (string ↔ number), ona görə
// hər oxuma müdafiəlidir: uyğun gəlməyən dəyər `undefined` qaytarır, exception atmır.

export function asRecord(value: unknown): Record<string, unknown> | undefined {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

export function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

export function asString(value: unknown): string | undefined {
  if (typeof value === "string") return value.trim() || undefined;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return undefined;
}

/** Rəqəm və ya rəqəm-mətn ("168.0") qəbul edir. */
export function asNumber(value: unknown): number | undefined {
  if (typeof value === "number") return Number.isFinite(value) ? value : undefined;
  if (typeof value === "string") {
    const n = Number.parseFloat(value);
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
}

/** Yuan (və ya digər valyuta) → sent. `"168.0"` → `16800`. */
export function toCents(value: unknown): number | undefined {
  const n = asNumber(value);
  return n === undefined ? undefined : Math.round(n * 100);
}

/** Verilmiş açarlardan İLK dolu olanı qaytarır (platformalar müxtəlif ad işlədir). */
export function pick(
  obj: Record<string, unknown> | undefined,
  ...keys: string[]
): unknown {
  if (!obj) return undefined;
  for (const key of keys) {
    const value = obj[key];
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return undefined;
}
