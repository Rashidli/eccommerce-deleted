import "server-only";
import { SITE_URL } from "@/lib/site-url";

/**
 * Kargo inteqrasiyasının OpenAPI müqaviləsi.
 *
 * İKİ İSTİQAMƏTİ birlikdə təsvir edir:
 *  · "E-Commerce → Kargo"  — biz onların API-sini çağırırıq (filial, sifariş, status)
 *  · "Kargo → E-Commerce"  — onlar bizim webhook-a status göndərir
 *
 * Təsvirlər AZƏRBAYCANCA-dır (sənədi oxuyan tərəf yerli şirkətdir), sahə
 * ADLARI isə ingiliscə qalır — onlar texniki açarlardır.
 *
 * STATUS SAHİBLİYİ (ən vacib qayda): sifarişin həyat dövrü "dispatched"-ə
 * QƏDƏR bizimdir, ondan sonra kargonundur. Sənəddə açıq yazılır ki, sonradan
 * "biz belə başa düşdük" mübahisəsi olmasın.
 */

const STATUS_VALUES = [
  "created",
  "in_transit",
  "at_branch",
  "delivered",
  "returned",
  "cancelled",
] as const;

export function buildCargoOpenApi() {
  return {
    openapi: "3.0.3",
    info: {
      title: "E-Commerce — Kargo İnteqrasiyası",
      version: "1.0.0",
      description: [
        "Bu sənəd E-Commerce ilə kargo şirkəti arasındakı inteqrasiyanı təsvir edir.",
        "",
        "**İki istiqamət var:**",
        "",
        "1. **E-Commerce → Kargo** (`Kargo tərəfi` teqi) — bu endpoint-ləri KARGO ŞİRKƏTİ",
        "   öz serverində hazırlayır, biz çağırırıq: filial siyahısı, sifariş yaratma,",
        "   sifariş yeniləmə (çatdırılma nömrəsi), status göndərmə.",
        "2. **Kargo → E-Commerce** (`E-Commerce tərəfi` teqi) — bu endpoint BİZDƏ hazırdır,",
        "   kargo şirkəti çağırır: status bildirişi (webhook).",
        "",
        "**STATUS SAHİBLİYİ — pozulmamalıdır:**",
        "",
        "| Status | Kim göndərir |",
        "|---|---|",
        "| `created` | E-Commerce (sifariş yaradılanda) |",
        "| `in_transit` | E-Commerce — yola salınana qədər |",
        "| `at_branch` | Kargo |",
        "| `delivered` | Kargo |",
        "| `returned` | Kargo |",
        "| `cancelled` | Hər iki tərəf |",
        "",
        "Kargo sahibi olmadığı status göndərsə (məs. `created`), hadisə **qeyd olunur**,",
        "amma sifarişin vəziyyətini DƏYİŞMİR. Cavabda `applied: false` qayıdır.",
      ].join("\n"),
      contact: { name: "E-Commerce", url: SITE_URL },
    },
    servers: [
      { url: SITE_URL, description: "E-Commerce (canlı)" },
      {
        url: "https://kargo-sirketi.example/api/v1",
        description: "Kargo şirkətinin API-si — real ünvan admin paneldə təyin olunur",
      },
    ],
    tags: [
      {
        name: "Kargo tərəfi",
        description:
          "Bu endpoint-ləri KARGO ŞİRKƏTİ hazırlayır. E-Commerce onları çağırır.",
      },
      {
        name: "E-Commerce tərəfi",
        description:
          "Bu endpoint BİZDƏ hazırdır. Kargo şirkəti status bildirişi üçün çağırır.",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          description:
            "Kargo şirkətinin verdiyi token. Admin paneldə saxlanılır, heç bir cavabda qaytarılmır.",
        },
        webhookSignature: {
          type: "apiKey",
          in: "header",
          name: "X-Cargo-Signature",
          description: [
            "Webhook imzası — **məcburidir**.",
            "`HMAC-SHA256(gövdə, paylaşılan açar)` hex formatında.",
            "İmzasız və ya səhv imzalı sorğu **401** alır və sifarişə TOXUNMUR.",
            "Səbəb: imzasız POST ilə istənilən adam sifarişi «təhvil verildi» edə bilərdi.",
          ].join(" "),
        },
      },
      schemas: {
        Branch: {
          type: "object",
          required: ["code", "name", "address"],
          properties: {
            code: {
              type: "string",
              description: "Filialın sizdəki unikal kodu/nömrəsi",
              example: "BR-028",
            },
            name: { type: "string", description: "Filialın adı", example: "28 May filialı" },
            district: {
              type: "string",
              description:
                "Filialın yerləşdiyi RAYON. Bizdəki rayon siyahısı ilə uyğunlaşdırılır — çatdırılma tarifi rayona görə hesablanır.",
              example: "Nəsimi",
            },
            address: {
              type: "string",
              description: "Tam ünvan",
              example: "Azərbaycan pr. 12, Bakı",
            },
            lat: { type: "number", format: "double", example: 40.3791 },
            lng: { type: "number", format: "double", example: 49.8489 },
            workHours: {
              type: "string",
              description: "İş saatları — sərbəst mətn",
              example: "B.e-Ş: 09:00-19:00, Bazar: bağlı",
            },
            phone: { type: "string", example: "+994 12 000 00 00" },
          },
        },
        OrderItem: {
          type: "object",
          properties: {
            name: { type: "string", example: "Kişi köynəyi (L, ağ)" },
            quantity: { type: "integer", example: 2 },
            weightGrams: { type: "integer", example: 450 },
            declaredValueCents: {
              type: "integer",
              description: "Bəyan edilmiş dəyər — SENTLƏ (kəsr yuvarlaqlaşma xətası olmasın)",
              example: 2795,
            },
            currency: { type: "string", example: "AZN" },
          },
        },
        CreateOrderRequest: {
          type: "object",
          required: ["orderNumber", "recipient", "items"],
          properties: {
            orderNumber: {
              type: "string",
              description:
                "BİZİM sifariş nömrəmiz. Sizin sistemdə saxlanmalıdır — sonrakı bütün sorğularda istinad üçün işlədilir.",
              example: "SO-CT5TS8-537V",
            },
            deliveryMethod: {
              type: "string",
              enum: ["courier", "pickup"],
              description: "`courier` — ünvana çatdırılır; `pickup` — filialdan götürülür",
              example: "courier",
            },
            branchCode: {
              type: "string",
              description: "`pickup` seçiləndə hansı filialdan götürüləcəyi",
              example: "BR-028",
            },
            recipient: {
              type: "object",
              required: ["fullName", "phone"],
              properties: {
                fullName: { type: "string", example: "Ada Məmmədova" },
                phone: { type: "string", example: "+994 50 123 45 67" },
                fin: {
                  type: "string",
                  description: "Şəxsiyyət vəsiqəsinin FİN kodu — gömrük bəyannaməsi üçün",
                  example: "5AB1C23",
                },
                city: { type: "string", example: "Bakı" },
                district: { type: "string", example: "Nəsimi" },
                address: { type: "string", example: "Nizami küç. 24, mənzil 12" },
              },
            },
            items: { type: "array", items: { $ref: "#/components/schemas/OrderItem" } },
          },
        },
        OrderResult: {
          type: "object",
          required: ["cargoOrderNumber"],
          properties: {
            cargoOrderNumber: {
              type: "string",
              description: "SİZİN sifariş nömrəniz — biz onu saxlayırıq və sonrakı sorğularda göndəririk",
              example: "KRG-2026-88123",
            },
            deliveryNumber: {
              type: "string",
              description: "İzləmə (tracking) nömrəsi — məlum olanda qaytarın, yoxsa sonra `PATCH` ilə əlavə edin",
              example: "AZ123456789",
            },
          },
        },
        StatusEvent: {
          type: "object",
          required: ["orderNumber", "status", "eventId"],
          properties: {
            orderNumber: {
              type: "string",
              description: "BİZİM sifariş nömrəmiz",
              example: "SO-CT5TS8-537V",
            },
            cargoOrderNumber: { type: "string", example: "KRG-2026-88123" },
            deliveryNumber: {
              type: "string",
              description: "İzləmə nömrəsi — bu bildirişlə birlikdə də göndərilə bilər",
              example: "AZ123456789",
            },
            status: {
              type: "string",
              enum: [...STATUS_VALUES],
              example: "delivered",
            },
            occurredAt: {
              type: "string",
              format: "date-time",
              description: "Hadisənin BAŞ VERDİYİ vaxt (göndərilmə vaxtı deyil)",
              example: "2026-07-30T14:22:11Z",
            },
            eventId: {
              type: "string",
              description: [
                "Hadisənin unikal ID-si — **təkrar qoruması** üçün məcburidir.",
                "Eyni `eventId` ikinci dəfə gəlsə, biz onu TƏTBİQ ETMİRİK və `duplicate: true` qaytarırıq.",
                "Şəbəkə problemində eyni bildirişi təhlükəsiz təkrar göndərə bilərsiniz.",
              ].join(" "),
              example: "evt_7f3a91",
            },
            note: { type: "string", example: "Qapıda təhvil verildi" },
          },
        },
      },
    },
    paths: {
      /* ---------------- E-Commerce → Kargo (onlar hazırlayır) ---------------- */
      "/branches": {
        get: {
          tags: ["Kargo tərəfi"],
          summary: "1) Filialların siyahısı",
          description:
            "Biz filialları mütəmadi çəkib bazamıza yazırıq. Rayon adı bizdəki rayonlarla uyğunlaşdırılır.",
          security: [{ bearerAuth: [] }],
          responses: {
            "200": {
              description: "Filial siyahısı",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      data: { type: "array", items: { $ref: "#/components/schemas/Branch" } },
                    },
                  },
                  example: {
                    data: [
                      {
                        code: "BR-028",
                        name: "28 May filialı",
                        district: "Nəsimi",
                        address: "Azərbaycan pr. 12, Bakı",
                        lat: 40.3791,
                        lng: 49.8489,
                        workHours: "B.e-Ş: 09:00-19:00",
                        phone: "+994 12 000 00 00",
                      },
                    ],
                  },
                },
              },
            },
          },
        },
      },
      "/orders": {
        post: {
          tags: ["Kargo tərəfi"],
          summary: "2) Sifariş yaratmaq",
          description:
            "Biz sifarişi sizdə yaradırıq və ÖZ nömrəmizi göndəririk. Cavabda sizin sifariş nömrənizi gözləyirik.",
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/CreateOrderRequest" },
                example: {
                  orderNumber: "SO-CT5TS8-537V",
                  deliveryMethod: "courier",
                  recipient: {
                    fullName: "Ada Məmmədova",
                    phone: "+994 50 123 45 67",
                    fin: "5AB1C23",
                    city: "Bakı",
                    district: "Nəsimi",
                    address: "Nizami küç. 24, mənzil 12",
                  },
                  items: [
                    {
                      name: "Kişi köynəyi (L, ağ)",
                      quantity: 2,
                      weightGrams: 450,
                      declaredValueCents: 2795,
                      currency: "AZN",
                    },
                  ],
                },
              },
            },
          },
          responses: {
            "200": {
              description: "Sifariş yaradıldı",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/OrderResult" },
                  example: { cargoOrderNumber: "KRG-2026-88123" },
                },
              },
            },
            "409": {
              description:
                "Eyni `orderNumber` artıq mövcuddur — TƏKRAR yaratmayın, mövcud nömrəni qaytarın",
            },
          },
        },
      },
      "/orders/{cargoOrderNumber}": {
        patch: {
          tags: ["Kargo tərəfi"],
          summary: "3) Sifarişi yeniləmək (çatdırılma nömrəsi)",
          description:
            "Çatdırılma/izləmə nömrəsi sonradan məlum olanda bu endpoint ilə əlavə edilir.",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "cargoOrderNumber",
              in: "path",
              required: true,
              schema: { type: "string" },
              example: "KRG-2026-88123",
            },
          ],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                example: { deliveryNumber: "AZ123456789" },
              },
            },
          },
          responses: {
            "200": {
              description: "Yeniləndi",
              content: {
                "application/json": {
                  example: {
                    cargoOrderNumber: "KRG-2026-88123",
                    deliveryNumber: "AZ123456789",
                  },
                },
              },
            },
          },
        },
      },
      "/orders/{cargoOrderNumber}/status": {
        post: {
          tags: ["Kargo tərəfi"],
          summary: "4) Status göndərmək (E-Commerce → Kargo)",
          description: [
            "Sifariş yola salınana qədər statusu BİZ göndəririk.",
            "Yalnız `created`, `in_transit` və `cancelled` göndərilir —",
            "`delivered` / `at_branch` / `returned` SİZİN sahənizdir.",
          ].join(" "),
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "cargoOrderNumber",
              in: "path",
              required: true,
              schema: { type: "string" },
            },
          ],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                example: { status: "in_transit", occurredAt: "2026-07-30T10:00:00Z" },
              },
            },
          },
          responses: { "200": { description: "Qəbul edildi" } },
        },
      },

      /* ---------------- Kargo → E-Commerce (bizdə hazırdır) ---------------- */
      "/api/cargo/{driver}/webhook": {
        post: {
          tags: ["E-Commerce tərəfi"],
          summary: "5) Status bildirişi (Kargo → E-Commerce)",
          description: [
            "Sifariş yola salınandan SONRA statusu siz göndərirsiniz.",
            "",
            "**Məcburi şərtlər:**",
            "· `X-Cargo-Signature` başlığı — HMAC-SHA256(gövdə, paylaşılan açar), hex.",
            "· `eventId` — təkrar göndərilən bildiriş ikinci dəfə tətbiq olunmur.",
            "",
            "**Cavablar:** `applied: true` — vəziyyət dəyişdi; `applied: false` —",
            "hadisə qeyd olundu, amma vəziyyət dəyişmədi (məs. sahibi olmadığınız status).",
            "",
            "Hər çağırış — rədd edilən də daxil — jurnala yazılır ki, inteqrasiya",
            "problemi sonradan araşdırıla bilsin.",
          ].join("\n"),
          security: [{ webhookSignature: [] }],
          parameters: [
            {
              name: "driver",
              in: "path",
              required: true,
              schema: { type: "string" },
              description: "Kargo şirkətinin açarı (admin paneldə təyin olunur)",
              example: "kango",
            },
          ],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/StatusEvent" },
                example: {
                  orderNumber: "SO-CT5TS8-537V",
                  cargoOrderNumber: "KRG-2026-88123",
                  deliveryNumber: "AZ123456789",
                  status: "delivered",
                  occurredAt: "2026-07-30T14:22:11Z",
                  eventId: "evt_7f3a91",
                  note: "Qapıda təhvil verildi",
                },
              },
            },
          },
          responses: {
            "200": {
              description: "Qəbul edildi",
              content: {
                "application/json": {
                  examples: {
                    tetbiq: {
                      summary: "Tətbiq olundu",
                      value: { ok: true, applied: true, status: "delivered" },
                    },
                    tekrar: {
                      summary: "Təkrar bildiriş — təhlükəsiz",
                      value: { ok: true, applied: false, duplicate: true },
                    },
                    sahibsiz: {
                      summary: "Sahibi olmadığınız status",
                      value: {
                        ok: true,
                        applied: false,
                        reason: "status_not_owned_by_carrier",
                      },
                    },
                  },
                },
              },
            },
            "401": {
              description: "İmza yoxdur və ya səhvdir — sifarişə TOXUNULMUR",
              content: { "application/json": { example: { ok: false, reason: "invalid_signature" } } },
            },
            "404": { description: "Sifariş tapılmadı" },
          },
        },
      },
    },
  } as const;
}
