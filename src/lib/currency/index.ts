/**
 * VALYUTA QATI — giriş nöqtəsi.
 *
 * Bölünmə:
 *   · `types.ts`   — ortaq tiplər (client + server)
 *   · `convert.ts` — saf hesablama (client + server)
 *   · `config.ts`  — DB-dən oxuma (YALNIZ server, `server-only`)
 *
 * Client komponentlər `convert`/`types`-dan import edir, `config`-dan YOX —
 * əks halda `server-only` qoruyucusu build-i sındırar.
 */
export {
  convertCents,
  findRate,
  sumConverted,
} from "./convert";
export {
  EMPTY_CURRENCY_CONFIG,
  type ConvertedAmount,
  type CurrencyConfig,
} from "./types";
