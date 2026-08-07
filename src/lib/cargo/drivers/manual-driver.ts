import { randomBytes } from "node:crypto";
import type { CargoDriver } from "../driver";
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

export type ManualCourierConfig = {
  key: string;
  name: string;
  /** Baza haqqı (sent, AZN). */
  baseCents: number;
  /** Hər kq üçün əlavə (sent). */
  perKgCents: number;
  etaDays: number;
};

// Real API-si olmayan yerli kargo şirkətləri üçün deterministik driver.
// HTTP əsaslı real driver eyni CargoDriver interfeysini implement edib bunu əvəz edə bilər.
export class ManualCargoDriver implements CargoDriver {
  readonly key: string;
  readonly name: string;
  private cfg: ManualCourierConfig;

  constructor(cfg: ManualCourierConfig) {
    this.key = cfg.key;
    this.name = cfg.name;
    this.cfg = cfg;
  }

  async quote(req: CargoQuoteRequest): Promise<CargoQuote[]> {
    const kg = Math.max(1, Math.ceil(req.weightGrams / 1000));
    const amountCents = this.cfg.baseCents + this.cfg.perKgCents * kg;
    return [
      {
        courier: this.key,
        serviceName: `${this.name} standart`,
        amountCents,
        currency: "AZN",
        etaDays: this.cfg.etaDays,
      },
    ];
  }

  async createShipment(req: CreateShipmentRequest): Promise<Shipment> {
    // Tracking kodu: ŞİRKƏT-REFERENCE-RANDOM (deterministik prefiks + təsadüfi son).
    const rand = randomBytes(4).toString("hex").toUpperCase();
    const trackingCode = `${this.key.toUpperCase()}-${req.orderRef}-${rand}`;
    return {
      courier: this.key,
      trackingCode,
      status: "created",
    };
  }

  async track(trackingCode: string): Promise<TrackResult> {
    // Manual driver-də əsl status DB-də operator/webhook ilə yenilənir;
    // burada yalnız yaradılma faktını təsdiq edirik.
    return {
      status: "created",
      events: [
        {
          status: "created",
          description: `${this.name}: göndərmə qeydə alındı (${trackingCode})`,
          at: new Date(),
        },
      ],
    };
  }

  /**
   * Manual şirkətin API-si yoxdur — filiallar admin tərəfindən əl ilə idarə
   * olunur. Boş massiv qaytarmaq DÜZGÜNDÜR: sinxron qatı "0 filial gəldi"
   * halında MÖVCUD filialları silmir (aşağıda `syncBranches`-ə bax).
   */
  async fetchBranches(): Promise<CargoBranchDTO[]> {
    return [];
  }

  /**
   * API olmadığı üçün sifariş nömrəsini biz yaradırıq — operator onu şirkətə
   * əl ilə ötürür. Nömrə deterministik prefiks + təsadüfi sonluqdur.
   */
  async createOrder(req: CargoOrderRequest): Promise<CargoOrderResult> {
    const rand = randomBytes(4).toString("hex").toUpperCase();
    return {
      cargoOrderNumber: `${this.key.toUpperCase()}-${req.orderRef}-${rand}`,
      status: "created",
    };
  }

  /** Çatdırılma nömrəsi operator tərəfindən daxil edilir. */
  async updateOrder(req: CargoOrderUpdate): Promise<CargoOrderResult> {
    return {
      cargoOrderNumber: req.cargoOrderNumber,
      deliveryNumber: req.deliveryNumber,
      status: "created",
    };
  }

  /**
   * Manual driver-də göndəriləcək yer yoxdur — hadisə yalnız bizim jurnala
   * yazılır (çağıran qat onu `CargoStatusEvent`-ə salır).
   */
  async pushStatus(): Promise<void> {
    return;
  }

  async parseWebhook(payload: unknown, _headers: Headers): Promise<WebhookResult> {
    const body = (payload ?? {}) as Record<string, unknown>;
    const trackingCode = String(
      body.trackingCode ?? body.tracking_code ?? body.tracking ?? "",
    );
    const status = normalizeStatus(
      typeof body.status === "string" ? body.status : undefined,
      STATUS_MAP,
    );
    const rawStatus =
      typeof body.status === "string" ? body.status : undefined;
    const deliveryNumber =
      typeof body.deliveryNumber === "string"
        ? body.deliveryNumber
        : typeof body.delivery_number === "string"
          ? body.delivery_number
          : undefined;
    const idempotencyKey =
      typeof body.eventId === "string"
        ? body.eventId
        : typeof body.event_id === "string"
          ? body.event_id
          : undefined;

    return {
      trackingCode,
      status,
      rawStatus,
      deliveryNumber,
      idempotencyKey,
      events: [
        {
          status,
          description: `${this.name} webhook: ${rawStatus ?? status}`,
          at: new Date(),
        },
      ],
    };
  }
}

// Xarici status mətnləri → normalize CargoStatus.
const STATUS_MAP: Record<string, CargoStatus> = {
  created: "created",
  registered: "created",
  in_transit: "in_transit",
  "in-transit": "in_transit",
  shipped: "in_transit",
  at_branch: "at_branch",
  "at-branch": "at_branch",
  ready: "at_branch",
  delivered: "delivered",
  completed: "delivered",
  returned: "returned",
  cancelled: "cancelled",
  canceled: "cancelled",
};
