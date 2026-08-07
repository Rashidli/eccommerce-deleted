import type { CargoDriver, CargoDriverConfig } from "../driver";
import {
  normalizeStatus,
  type CargoBranchDTO,
  type CargoOrderRequest,
  type CargoOrderResult,
  type CargoOrderUpdate,
  type CargoQuote,
  type CargoQuoteRequest,
  type CargoStatus,
  type CreateShipmentRequest,
  type Shipment,
  type TrackResult,
  type WebhookResult,
} from "../types";

/**
 * REAL API-si olan kargo şirkətləri üçün ümumi HTTP driver.
 *
 * Şirkət bizim OpenAPI müqaviləsini (`/api/cargo/openapi.json`) implement
 * edirsə, bu driver heç bir dəyişiklik olmadan işləyir — yalnız DB-də
 * `apiBaseUrl` + `apiToken` doldurulur.
 *
 * Şirkətin öz forması fərqlidirsə, bu sinifdən törəyib yalnız uyğun metodu
 * override etmək kifayətdir (qayda #6 — fərq driver-də qalır).
 */
export class HttpCargoDriver implements CargoDriver {
  readonly key: string;
  readonly name: string;
  protected baseUrl: string;
  /** SİRR — yalnız `Authorization` başlığında işlədilir, heç yerə yazılmır. */
  protected token: string;

  constructor(cfg: CargoDriverConfig) {
    this.key = cfg.key;
    this.name = cfg.name;
    this.baseUrl = (cfg.apiBaseUrl ?? "").replace(/\/+$/, "");
    this.token = cfg.apiToken ?? "";
  }

  /**
   * Ortaq HTTP çağırışı.
   *
   * Xəta mesajında ŞİRKƏTİN CAVABI yer alır, amma token HEÇ VAXT —
   * loglara sirr düşməsin. `baseUrl` boşdursa aydın xəta atırıq ki,
   * konfiqurasiya problemi şəbəkə problemi kimi görünməsin.
   */
  protected async call<T>(
    path: string,
    init?: { method?: string; body?: unknown },
  ): Promise<T> {
    if (!this.baseUrl) {
      throw new Error(`${this.key}: apiBaseUrl təyin olunmayıb`);
    }

    const res = await fetch(`${this.baseUrl}${path}`, {
      method: init?.method ?? "GET",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
      },
      body: init?.body ? JSON.stringify(init.body) : undefined,
      // Kargo API-ləri yavaş ola bilər, amma sonsuz gözləmək olmaz.
      signal: AbortSignal.timeout(20_000),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(
        `${this.key} ${res.status}: ${text.slice(0, 200) || "cavab boşdur"}`,
      );
    }
    return (await res.json()) as T;
  }

  /* ------------------------- 1) filiallar ------------------------- */

  async fetchBranches(): Promise<CargoBranchDTO[]> {
    const res = await this.call<{ data?: unknown[]; branches?: unknown[] }>(
      "/branches",
    );
    const rows = res.data ?? res.branches ?? [];
    if (!Array.isArray(rows)) return [];

    return rows
      // Qaytarılan tip AÇIQ yazılır: `satisfies` daxildəki obyektə aiddir və
      // `null` variantını massiv tipinə daşımır — ona görə TS massivi
      // `CargoBranchDTO[]` kimi qəbul etmirdi.
      .map((r): CargoBranchDTO | null => {
        const b = (r ?? {}) as Record<string, unknown>;
        const code = String(b.code ?? b.id ?? b.externalCode ?? "").trim();
        if (!code) return null;
        return {
          externalCode: code,
          name: String(b.name ?? code),
          districtName:
            typeof b.district === "string"
              ? b.district
              : typeof b.districtName === "string"
                ? b.districtName
                : undefined,
          address: String(b.address ?? ""),
          lat: typeof b.lat === "number" ? b.lat : undefined,
          lng: typeof b.lng === "number" ? b.lng : undefined,
          workHours:
            typeof b.workHours === "string"
              ? b.workHours
              : typeof b.hours === "string"
                ? b.hours
                : undefined,
          phone: typeof b.phone === "string" ? b.phone : undefined,
          raw: b,
        };
      })
      .filter((b): b is CargoBranchDTO => b !== null);
  }

  /* ---------------------- 2) sifariş yaratma ---------------------- */

  async createOrder(req: CargoOrderRequest): Promise<CargoOrderResult> {
    const res = await this.call<Record<string, unknown>>("/orders", {
      method: "POST",
      body: {
        orderNumber: req.orderRef,
        branchCode: req.branchExternalCode,
        recipient: req.recipient,
        parcels: req.parcels,
        declaredValueCents: req.declaredValueCents,
      },
    });

    const number = String(
      res.cargoOrderNumber ?? res.orderNumber ?? res.id ?? "",
    );
    if (!number) {
      throw new Error(`${this.key}: cavabda sifariş nömrəsi yoxdur`);
    }

    return {
      cargoOrderNumber: number,
      deliveryNumber:
        typeof res.deliveryNumber === "string" ? res.deliveryNumber : undefined,
      status: normalizeStatus(
        typeof res.status === "string" ? res.status : undefined,
        STATUS_MAP,
        "created",
      ),
      raw: res,
    };
  }

  /* ------------------------ 3) yeniləmə ------------------------ */

  async updateOrder(req: CargoOrderUpdate): Promise<CargoOrderResult> {
    const res = await this.call<Record<string, unknown>>(
      `/orders/${encodeURIComponent(req.cargoOrderNumber)}`,
      {
        method: "PATCH",
        body: {
          deliveryNumber: req.deliveryNumber,
          branchCode: req.branchExternalCode,
          recipient: req.recipient,
        },
      },
    );

    return {
      cargoOrderNumber: req.cargoOrderNumber,
      deliveryNumber:
        typeof res.deliveryNumber === "string"
          ? res.deliveryNumber
          : req.deliveryNumber,
      status: normalizeStatus(
        typeof res.status === "string" ? res.status : undefined,
        STATUS_MAP,
        "created",
      ),
      raw: res,
    };
  }

  /* ------------------------- 4) statuslar ------------------------- */

  async pushStatus(
    cargoOrderNumber: string,
    status: CargoStatus,
  ): Promise<void> {
    await this.call(
      `/orders/${encodeURIComponent(cargoOrderNumber)}/status`,
      { method: "POST", body: { status, at: new Date().toISOString() } },
    );
  }

  async parseWebhook(
    payload: unknown,
    _headers: Headers,
  ): Promise<WebhookResult> {
    const b = (payload ?? {}) as Record<string, unknown>;
    const rawStatus = typeof b.status === "string" ? b.status : undefined;
    const status = normalizeStatus(rawStatus, STATUS_MAP);

    return {
      trackingCode: String(
        b.deliveryNumber ?? b.trackingCode ?? b.tracking ?? "",
      ),
      status,
      rawStatus,
      deliveryNumber:
        typeof b.deliveryNumber === "string" ? b.deliveryNumber : undefined,
      idempotencyKey:
        typeof b.eventId === "string" ? b.eventId : undefined,
      events: [
        {
          status,
          description: `${this.name}: ${rawStatus ?? status}`,
          at: b.at ? new Date(String(b.at)) : new Date(),
        },
      ],
    };
  }

  /* --------------------- əvvəlki mərhələdən --------------------- */

  async quote(req: CargoQuoteRequest): Promise<CargoQuote[]> {
    const res = await this.call<{ data?: unknown[] }>(
      `/quote?weightGrams=${req.weightGrams}&destCountry=${req.destCountry}`,
    );
    const rows = Array.isArray(res.data) ? res.data : [];
    return rows.map((r) => {
      const q = (r ?? {}) as Record<string, unknown>;
      return {
        courier: this.key,
        serviceName: String(q.serviceName ?? this.name),
        amountCents: Number(q.amountCents ?? 0),
        currency: String(q.currency ?? "AZN"),
        etaDays: Number(q.etaDays ?? 0),
      };
    });
  }

  /** Köhnə `createShipment` → yeni `createOrder` üzərindən. */
  async createShipment(req: CreateShipmentRequest): Promise<Shipment> {
    const res = await this.createOrder({
      orderRef: req.orderRef,
      recipient: req.recipient,
      parcels: req.parcels,
      branchExternalCode: req.pickupBranchId,
    });
    return {
      courier: this.key,
      trackingCode: res.deliveryNumber ?? res.cargoOrderNumber,
      status: res.status,
    };
  }

  async track(trackingCode: string): Promise<TrackResult> {
    const res = await this.call<Record<string, unknown>>(
      `/orders/${encodeURIComponent(trackingCode)}/track`,
    );
    const status = normalizeStatus(
      typeof res.status === "string" ? res.status : undefined,
      STATUS_MAP,
    );
    const rows = Array.isArray(res.events) ? res.events : [];
    return {
      status,
      events: rows.map((e) => {
        const ev = (e ?? {}) as Record<string, unknown>;
        return {
          status: normalizeStatus(
            typeof ev.status === "string" ? ev.status : undefined,
            STATUS_MAP,
          ),
          description: String(ev.description ?? ""),
          at: ev.at ? new Date(String(ev.at)) : new Date(),
          location:
            typeof ev.location === "string" ? ev.location : undefined,
        };
      }),
    };
  }
}

/** Xarici status mətnləri → normalize `CargoStatus`. */
const STATUS_MAP: Record<string, CargoStatus> = {
  created: "created",
  registered: "created",
  accepted: "created",
  in_transit: "in_transit",
  "in-transit": "in_transit",
  shipped: "in_transit",
  dispatched: "in_transit",
  at_branch: "at_branch",
  "at-branch": "at_branch",
  ready: "at_branch",
  ready_for_pickup: "at_branch",
  delivered: "delivered",
  completed: "delivered",
  returned: "returned",
  cancelled: "cancelled",
  canceled: "cancelled",
};
