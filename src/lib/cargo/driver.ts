import type {
  CargoBranchDTO,
  CargoOrderRequest,
  CargoOrderResult,
  CargoOrderUpdate,
  CargoQuote,
  CargoQuoteRequest,
  CargoStatus,
  CreateShipmentRequest,
  Shipment,
  TrackResult,
  WebhookResult,
} from "./types";

/**
 * Kargo şirkətinin konfiqurasiyası — DB-dəki `CargoCompany` sətrindən gəlir.
 * Kodda heç bir şirkətə xas dəyər saxlanmır (qayda #4).
 */
export type CargoDriverConfig = {
  key: string;
  name: string;
  apiBaseUrl?: string | null;
  /** SİRR — loglanmır, heç bir cavaba düşmür. */
  apiToken?: string | null;
};

/**
 * Bütün kargo şirkətləri bu interfeysi implement edir.
 * Yeni şirkət qoşmaq = bu faylı DƏYİŞMƏDƏN bir driver sinfi + bir DB sətri.
 *
 * Axının dörd addımı metodlarda birbaşa görünür:
 *   1) fetchBranches  — filialları çəkirik
 *   2) createOrder    — onlarda sifariş yaradıb ÖZ nömrəmizi göndəririk
 *   3) updateOrder    — çatdırılma nömrəsini əlavə edirik
 *   4) pushStatus     — "yola salındı"-ya qədər statusu BİZ göndəririk;
 *      ondan sonrakını ONLAR webhook ilə göndərir → `parseWebhook`
 */
export interface CargoDriver {
  /** Unikal açar — URL/DB-də istinad üçün (məs. "kango"). */
  readonly key: string;
  /** İnsana görünən ad. */
  readonly name: string;

  /* ------------------------- 1) filiallar ------------------------- */

  /**
   * Şirkətin filial siyahısı. Rayon adı mətn kimi qaytarılır; bizim
   * `District` sətri ilə uyğunlaşdırma sinxron qatında (`sync.ts`) olur.
   */
  fetchBranches(): Promise<CargoBranchDTO[]>;

  /* ---------------------- 2) sifariş yaratma ---------------------- */

  /** Şirkətdə sifariş yaradır, ONLARIN sifariş nömrəsini qaytarır. */
  createOrder(req: CargoOrderRequest): Promise<CargoOrderResult>;

  /* ------------------------ 3) yeniləmə ------------------------ */

  /** Mövcud sifarişi yeniləyir — əsasən çatdırılma nömrəsi əlavə etmək üçün. */
  updateOrder(req: CargoOrderUpdate): Promise<CargoOrderResult>;

  /* ------------------------- 4) statuslar ------------------------- */

  /**
   * Bizim tərəfin status dəyişikliyini şirkətə göndərir.
   * YALNIZ bizim sahiblik zonamızdakı statuslar üçün — çağıran qat bunu
   * `isDirectionAllowed()` ilə yoxlayır.
   */
  pushStatus(cargoOrderNumber: string, status: CargoStatus): Promise<void>;

  /**
   * Şirkətin webhook payload-unu normalize edir.
   * DİQQƏT: payload DATA-dır, əmr deyil — yalnız status/tracking çıxarılır.
   * İmza yoxlaması burada YOX, webhook route-unda olur (şirkətin sirri ilə).
   */
  parseWebhook(payload: unknown, headers: Headers): Promise<WebhookResult>;

  /* --------------------- əvvəlki mərhələdən --------------------- */

  /** Çəki/məsafəyə görə qiymət təklifləri. */
  quote(req: CargoQuoteRequest): Promise<CargoQuote[]>;

  /** Göndərmə yaradır, tracking kodu qaytarır. */
  createShipment(req: CreateShipmentRequest): Promise<Shipment>;

  /** Tracking koduna görə cari status + hadisələr. */
  track(trackingCode: string): Promise<TrackResult>;
}

/** DB sətrindən driver quran fabrik — hər driver modulu bunu ixrac edir. */
export type CargoDriverFactory = (cfg: CargoDriverConfig) => CargoDriver;
