import "server-only";
import { otapiCall } from "./client";

// OTAPI yüksək səviyyəli funksiyalar. `provider` OTAPI-nin mənbə kodudur
// (Platform.providerKey-də saxlanır): məs. Taobao, Tmall, Alibaba1688, Aliexpress, Jd, Pinduoduo.
// QEYD: dəqiq parametr adları (keyword/frame/paging) canlı instanceKey ilə docs.otapi.net üzrə
// təsdiqlənməlidir — normalize.ts real payload görəndə tamamlanacaq.

export type OtapiProvider =
  | "Taobao"
  | "Tmall"
  | "Alibaba1688"
  | "Aliexpress"
  | "Jd"
  | "Pinduoduo"
  | "Alibaba";

export function otapiSearch(params: {
  provider: OtapiProvider;
  keyword: string;
  framePosition?: number; // paging offset
  frameSize?: number; // page size
  language?: string;
}) {
  return otapiCall("BatchSearchItemsFrame", { ...params });
}

export function otapiItemDetail(params: {
  provider: OtapiProvider;
  itemId: string;
  language?: string;
}) {
  return otapiCall("BatchGetItemFullInfo", { ...params });
}

export function otapiRootCategories(provider: OtapiProvider, language = "en") {
  return otapiCall("GetRootCategoryInfoList", { provider, language });
}

export function otapiProviderInfo(provider: OtapiProvider, language = "en") {
  return otapiCall("GetProviderInfo", { provider, language });
}
