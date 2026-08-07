import "server-only";

// OTAPI (OT Commerce) aqreqator client — YALNIZ server (qayda #2).
// Tək instanceKey → Tmall, 1688, Alibaba, AliExpress, JD, Pinduoduo (provider param ilə).
// QEYD: OTAPI-nin dəqiq base URL/auth/response formatı canlı instanceKey ilə təsdiqlənməlidir
// (docs.otapi.net). Aşağıdakı envelope (ErrorCode/Result) və metod adları sənəddən götürülüb.
const BASE = process.env.OTAPI_BASE_URL ?? "https://otapi.net/service-json";

export class OtapiError extends Error {
  constructor(
    public code: string,
    message: string,
    public body?: unknown,
  ) {
    super(message);
    this.name = "OtapiError";
  }
}

function instanceKey(): string {
  const k = process.env.OTAPI_INSTANCE_KEY;
  if (!k) throw new OtapiError("NO_KEY", "OTAPI_INSTANCE_KEY təyin olunmayıb");
  return k;
}

type Primitive = string | number | boolean | undefined | null;

// OTAPI envelope: { ErrorCode: "Ok", ErrorDescription, Result | <MethodResult> }
type OtapiEnvelope<T> = {
  ErrorCode?: string;
  ErrorDescription?: string;
  Result?: T;
} & Record<string, unknown>;

/**
 * OTAPI metod çağırışı. Metodlar path əsaslıdır (məs. BatchSearchItemsFrame),
 * instanceKey + language + provider query param kimi ötürülür.
 */
export async function otapiCall<T = unknown>(
  method: string,
  params: Record<string, Primitive> = {},
  signal?: AbortSignal,
): Promise<OtapiEnvelope<T>> {
  const url = new URL(`${BASE}/${method}`);
  url.searchParams.set("instanceKey", instanceKey());
  url.searchParams.set("language", String(params.language ?? "en"));
  for (const [k, v] of Object.entries(params)) {
    if (k !== "language" && v !== undefined && v !== null) {
      url.searchParams.set(k, String(v));
    }
  }

  const res = await fetch(url, { signal, cache: "no-store" });
  const text = await res.text();
  let json: OtapiEnvelope<T>;
  try {
    json = text ? (JSON.parse(text) as OtapiEnvelope<T>) : {};
  } catch {
    throw new OtapiError("PARSE", `OTAPI cavabı JSON deyil (${res.status})`, text);
  }

  // OTAPI HTTP 200 qaytarıb məntiqi xətanı ErrorCode-da verir.
  if (json.ErrorCode && json.ErrorCode !== "Ok") {
    throw new OtapiError(
      json.ErrorCode,
      json.ErrorDescription ?? `OTAPI xətası: ${json.ErrorCode}`,
      json,
    );
  }
  if (!res.ok) {
    throw new OtapiError(String(res.status), `OTAPI HTTP ${res.status}`, json);
  }

  return json;
}
