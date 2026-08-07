import "server-only";
import { randomBytes } from "node:crypto";

/**
 * İnsan oxuya bilən unikal istinad: `SO-7K2M4P-QX9T` (sifariş) / `PY-...` (ödəniş).
 *
 * Ardıcıl nömrə İSTİFADƏ OLUNMUR: `SO-000123` formatı həm gündəlik sifariş
 * sayını kənara sızdırır, həm də başqasının sifarişini təxmin etməyə imkan verir.
 * Qarışan simvollar (0/O, 1/I) əlifbadan çıxarılıb ki, telefonla oxunanda səhv düşməsin.
 */
const ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

function block(length: number): string {
  const bytes = randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i++) {
    out += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return out;
}

export function orderReference(): string {
  return `SO-${block(6)}-${block(4)}`;
}

export function paymentReference(): string {
  return `PY-${block(6)}-${block(4)}`;
}
