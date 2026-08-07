// Kargo (çatdırılma) normalize edilmiş DTO-ları — bütün driver-lər bu tiplərlə danışır.
// Beləcə yeni kargo şirkəti əlavə etmək = eyni interfeysi implement etmək (qayda: asan genişlənmə).

export type CargoStatus =
  | "created"
  | "in_transit"
  | "at_branch"
  | "delivered"
  | "returned"
  | "cancelled";

export type Dimensions = { lengthCm: number; widthCm: number; heightCm: number };

export type CargoQuoteRequest = {
  weightGrams: number;
  dimensions?: Dimensions;
  originCountry: string; // ISO-2, məs. "CN"
  destCountry: string; // "AZ"
  destCity?: string;
  declaredValueCents: number;
};

export type CargoQuote = {
  courier: string; // driver key
  serviceName: string;
  amountCents: number;
  currency: string; // "AZN"
  etaDays: number;
};

export type Parcel = {
  weightGrams: number;
  dimensions?: Dimensions;
  contents?: string;
};

export type Recipient = {
  fullName: string;
  phone: string;
  addressLine: string;
  city: string;
  country: string; // "AZ"
};

export type CreateShipmentRequest = {
  orderRef: string; // Order.reference
  recipient: Recipient;
  parcels: Parcel[];
  pickupBranchId?: string;
};

export type Shipment = {
  courier: string;
  trackingCode: string;
  labelUrl?: string;
  status: CargoStatus;
};

export type TrackEvent = {
  status: CargoStatus;
  description: string;
  at: Date;
  location?: string;
};

export type TrackResult = {
  status: CargoStatus;
  events: TrackEvent[];
};

export type WebhookResult = {
  trackingCode: string;
  status: CargoStatus;
  events: TrackEvent[];
  /** Şirkətin öz status mətni — jurnalda saxlanır (normalize edilməmiş). */
  rawStatus?: string;
  /** Təkrar göndərişi tanımaq üçün açar. Şirkət vermirsə biz hesablayırıq. */
  idempotencyKey?: string;
  /** Şirkət çatdırılma nömrəsini webhook-da göndərə bilər. */
  deliveryNumber?: string;
};

/* ---------------------- FİLİAL (branch) sinxronu ---------------------- */

/** Şirkətin API-sindən gələn filial — normalize edilmiş şəkil. */
export type CargoBranchDTO = {
  /** Şirkətin öz kodu/nömrəsi — dedup açarı. */
  externalCode: string;
  name: string;
  /** Rayon adı — bizim `District` ilə uyğunlaşdırılır (ad üzrə, sonra əl ilə). */
  districtName?: string;
  address: string;
  lat?: number;
  lng?: number;
  workHours?: string;
  phone?: string;
  raw?: unknown;
};

/* ------------------- SİFARİŞ (order) sinxronu ------------------- */

export type CargoOrderRequest = {
  /** Bizim sifariş nömrəmiz (`Order.reference`) — onlara göndərilir. */
  orderRef: string;
  recipient: Recipient;
  parcels: Parcel[];
  /** Hansı filiala gedəcəyi (şirkətin öz kodu). */
  branchExternalCode?: string;
  declaredValueCents?: number;
};

export type CargoOrderResult = {
  /** Şirkətin ÖZ sifariş nömrəsi. */
  cargoOrderNumber: string;
  /** Varsa dərhal verilən çatdırılma nömrəsi. */
  deliveryNumber?: string;
  status: CargoStatus;
  raw?: unknown;
};

export type CargoOrderUpdate = {
  cargoOrderNumber: string;
  /** Çatdırılma/izləmə nömrəsi əlavə etmək — axının 3-cü addımı. */
  deliveryNumber?: string;
  recipient?: Partial<Recipient>;
  branchExternalCode?: string;
};

/* ==================== STATUS SAHİBLİYİ (iki istiqamətli) ====================
 * Axının 4-cü addımı: "yola salındı"-ya qədər statusları BİZ göndəririk,
 * ondan sonra ONLAR bizə göndərir.
 *
 * Bu, sadəcə razılaşma deyil — kodla təmin olunur: gələn hadisə bizim
 * sahiblik zonamıza aiddirsə, JURNALA yazılır, amma sifarişin vəziyyətini
 * DƏYİŞMİR. Əks halda son yazan qalib gəlirdi və şirkət səhvən "created"
 * göndərsə, artıq çatdırılmış sifariş geri qayıdardı.
 * ========================================================================== */

/** BİZİM sahiblik zonamız — bu statusları yalnız biz göndəririk. */
const OUTBOUND_OWNED: readonly CargoStatus[] = ["created", "in_transit"];

/** ŞİRKƏTİN sahiblik zonası — bunları yalnız onlar bildirir. */
const INBOUND_OWNED: readonly CargoStatus[] = [
  "at_branch",
  "delivered",
  "returned",
];

export type StatusDirection = "outbound" | "inbound";

/**
 * Gələn/gedən status qəbul edilə bilərmi?
 * `cancelled` hər iki tərəfdən gələ bilər (ləğv iki tərəfli hadisədir).
 */
export function isDirectionAllowed(
  status: CargoStatus,
  direction: StatusDirection,
): boolean {
  if (status === "cancelled") return true;
  return direction === "outbound"
    ? OUTBOUND_OWNED.includes(status)
    : INBOUND_OWNED.includes(status);
}

/** Statusun irəliləmə sırası — geriyə dönüş bloklanır. */
const STATUS_RANK: Record<CargoStatus, number> = {
  created: 1,
  in_transit: 2,
  at_branch: 3,
  delivered: 4,
  returned: 4,
  cancelled: 4,
};

/**
 * Yeni status mövcud statusu əvəz edə bilərmi?
 *
 * Yalnız İRƏLİ gedir. Terminal vəziyyətdən (delivered/returned/cancelled)
 * geri qayıtmaq olmaz — gecikmiş və ya təkrar webhook çatdırılmış sifarişi
 * "yolda"ya qaytarmasın.
 */
export function canAdvance(
  current: CargoStatus | null,
  next: CargoStatus,
): boolean {
  if (!current) return true;
  if (STATUS_RANK[current] >= 4) return false; // terminal
  return STATUS_RANK[next] > STATUS_RANK[current];
}

// Kargo statusu → Order.status (schema: processing | shipped | delivered | cancelled).
export function toOrderStatus(status: CargoStatus): string {
  switch (status) {
    case "created":
      return "processing";
    case "in_transit":
    case "at_branch":
      return "shipped";
    case "delivered":
      return "delivered";
    case "returned":
    case "cancelled":
      return "cancelled";
  }
}

// Xarici (driver-ə xas) status mətnlərini normalize CargoStatus-a map edən köməkçi.
export function normalizeStatus(
  raw: string | undefined | null,
  map: Record<string, CargoStatus>,
  fallback: CargoStatus = "in_transit",
): CargoStatus {
  if (!raw) return fallback;
  return map[raw.trim().toLowerCase()] ?? fallback;
}
