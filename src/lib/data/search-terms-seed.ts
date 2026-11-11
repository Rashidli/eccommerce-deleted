/**
 * AXTARIŞ LÜĞƏTİNİN BAŞLANĞIC MƏZMUNU (`SearchTerm` cədvəli üçün seed).
 *
 * NİYƏ BURADADIR: qayda #4 hardcoded məhsul/mətn/kateqoriya qadağan edir, amma
 * "mock data yalnız seed üçün" istisnası var — bu, məhz odur. İşləyən sistem
 * lüğəti BAZADAN oxuyur; bu fayl yalnız ilk doldurma üçündür və admin/AI
 * sonradan üstünə yazır.
 *
 * NƏ ÜÇÜN LAZIMDIR: müştəri kataloq dilində yox, DANIŞIQ dilində yazır —
 * əsasən Azərbaycan dilində işlənən rus alınmaları ilə. Nə bizim tərcüməçi,
 * nə 1688-in öz tərcüməsi bunları tanıyır (ölçüldü: "sumka" → sabun/keçə/saç
 * sancağı, "nike krossovka" → 0 nəticə).
 *
 * YAZILIŞ VARİANTLARI QƏSDƏN ÇOXDUR: eyni sözü hər kəs başqa cür yazır
 * ("basanojka" / "pasanojka" / "pasaniska"). Yaxınlıq (fuzzy) uyğunluğu
 * yazılış səhvini tutur, amma b/p, o/i kimi 3+ fərqli variantı tutmur — ona
 * görə ən çox rast gəlinən formalar açıq yazılır.
 *
 * AÇAR SÖZLƏR UYDURULMAYIB — hamısı 1688-də ölçülüb (`npm run search:terms -- --verify`).
 */

/** Bir anlayış: bir açar söz + onu ifadə edən bütün yazılış variantları. */
export type SeedConcept = {
  /** Platformaya göndəriləcək açar söz (hədəf dildə). */
  keyword: string;
  /** Sorğuda rast gəlinən formalar — normallaşdırma seed zamanı olunur. */
  terms: string[];
};

/**
 * Hədəf dil `zh` (1688 / Taobao) üçün azərbaycanca sorğular.
 *
 * Rus dilində yazan istifadəçi üçün ayrıca `ru` dəsti lazım deyil: `lang=ru`
 * sorğusu onsuz da tərcüməçiyə düşür və rusca söz modeldə problem yaratmır.
 * Problem MƏHZ azərbaycanca yazılmış rus alınmalarındadır — lüğət də onlara
 * fokuslanır.
 */
export const AZ_TO_ZH: SeedConcept[] = [
  /* ---------------------------- Çanta / baqaj ---------------------------- */
  // Ölçüldü: 包 → 2000, `gucci 包` → 1049 (女包 ilə cəmi 300 idi — geniş forma
  // brendlə birlikdə daha yaxşı işləyir, ona görə 包 seçilib).
  { keyword: "包", terms: ["sumka", "sumqa", "somka", "çanta", "canta"] },
  { keyword: "女包", terms: ["qadın çantası", "qadin sumkasi", "женская сумка"] },
  { keyword: "双肩包", terms: ["ryukzak", "rukzak", "ryugzak", "bel çantası", "kürək çantası"] },
  { keyword: "行李箱", terms: ["çemodan", "chemodan", "camadan", "çamadan", "baqaj"] },
  { keyword: "钱包", terms: ["koshelek", "kaşelok", "koşelek", "pul kisəsi", "portmane"] },

  /* -------------------------------- Ayaqqabı ------------------------------- */
  { keyword: "鞋", terms: ["ayaqqabı", "ayaqqabi", "ayakkabi"] },
  { keyword: "运动鞋", terms: ["krossovka", "krasovka", "krosovka", "krossovki", "krasofka", "idman ayaqqabısı"] },
  { keyword: "凉鞋", terms: ["basanojka", "bosonojka", "pasanojka", "pasaniska", "basanoshka", "sandal", "sandalet"] },
  { keyword: "皮鞋", terms: ["tufli", "tufel", "tufliya", "dəri ayaqqabı"] },
  { keyword: "高跟鞋", terms: ["dabanlı ayaqqabı", "kabluk", "kabluklu"] },
  { keyword: "靴子", terms: ["sapoq", "sapog", "sapogi", "çəkmə", "cekme"] },
  { keyword: "拖鞋", terms: ["tapoçka", "tapochka", "tapoçki", "şəppək", "terlik"] },

  /* --------------------------------- Geyim --------------------------------- */
  { keyword: "连衣裙", terms: ["platye", "platya", "plate", "don"] },
  { keyword: "衬衫", terms: ["rubaşka", "rubashka", "köynək", "koynek"] },
  { keyword: "T恤", terms: ["futbolka", "futbolqa", "mayka"] },
  { keyword: "裤子", terms: ["bryuki", "bruki", "şalvar", "salvar"] },
  { keyword: "牛仔裤", terms: ["djins", "cins şalvar", "cins salvar", "djinsi"] },
  { keyword: "夹克", terms: ["kurtka", "kurtqa", "gurtka", "gödəkçə"] },
  { keyword: "大衣", terms: ["palto", "palito"] },
  { keyword: "毛衣", terms: ["sviter", "svitr", "kofta", "koftochka", "jemper"] },
  { keyword: "裙子", terms: ["yubka", "yupka", "ətək"] },
  { keyword: "西装", terms: ["kostyum", "kastum", "kostum"] },
  { keyword: "帽子", terms: ["şapka", "sapka", "papaq", "kepka"] },
  { keyword: "围巾", terms: ["şarf", "sarf", "şal"] },
  { keyword: "手套", terms: ["perçatka", "perchatka", "əlcək", "elcek"] },
  { keyword: "袜子", terms: ["noski", "noskı", "corab", "çorab"] },

  /* ------------------------------ Elektronika ------------------------------ */
  { keyword: "手机", terms: ["telefon", "mobil telefon", "smartfon"] },
  { keyword: "笔记本电脑", terms: ["noutbuk", "noutbook", "notbuk", "netbuk"] },
  { keyword: "平板电脑", terms: ["planşet", "planset", "planshet"] },
  { keyword: "耳机", terms: ["naushnik", "nauşnik", "naushniki", "qulaqlıq", "qulaqliq"] },
  { keyword: "手表", terms: ["saat", "qol saatı", "çasi"] },
  { keyword: "键盘", terms: ["klaviatura", "klavyatura"] },
  { keyword: "鼠标", terms: ["mışka", "mishka", "myshka", "siçan"] },
  { keyword: "充电器", terms: ["zaryadka", "zaradka", "zaryatka", "adapter", "şarj cihazı"] },
  { keyword: "音箱", terms: ["kolonka", "qolonka", "dinamik"] },

  /* ------------------------------- Kosmetika ------------------------------- */
  { keyword: "口红", terms: ["pomada", "dodaq boyası", "damaq boyasi"] },
  { keyword: "睫毛膏", terms: ["tuş", "tush", "kirpik tuşu"] },
  { keyword: "面霜", terms: ["krem", "üz kremi"] },
  { keyword: "洗发水", terms: ["şampun", "sampun", "shampun"] },
  { keyword: "香水", terms: ["ətir", "etir", "dux", "parfum", "духи"] },

  /* --------------------------------- Ev ----------------------------------- */
  { keyword: "锅", terms: ["kastrül", "kastrul", "qazan"] },
  { keyword: "水壶", terms: ["çaydan", "caydan", "çaynik"] },
  { keyword: "地毯", terms: ["xalça", "xalca", "kover", "kovyor"] },
  { keyword: "窗帘", terms: ["pərdə", "perde", "ştor", "shtora"] },
  { keyword: "被子", terms: ["yorğan", "yorgan", "adyal", "odeyal"] },
  { keyword: "枕头", terms: ["yastıq", "yastiq", "poduşka", "podushka"] },

  /* ------------------------------ Uşaq / digər ----------------------------- */
  { keyword: "婴儿推车", terms: ["kolyaska", "qolyaska", "uşaq arabası"] },
  { keyword: "玩具", terms: ["oyuncaq", "iqruşka", "igrushka"] },
  { keyword: "自行车", terms: ["velosiped", "velosipet"] },

  /* ------------------------------ TƏYİNEDİCİLƏR ---------------------------- */
  // Bunlar tək başına axtarılmır, amma İSİMLƏ BİRLİKDƏ çox işlənir: "kişi
  // şalvarı", "qırmızı sumka". Lüğətə düşməsələr latın hərfi kimi qalırdılar
  // və ölçüldü ki, naməlum latın sözü sorğunu ÖLDÜRÜR ("qirmizi 女包" → 0).
  // Ayrı-ayrı tokenlər kimi işləyirlər — yoxlandı: "红色 女包" → 2000 nəticə.
  { keyword: "男", terms: ["kişi", "kisi", "kişilər üçün", "mujskoy", "erkək"] },
  { keyword: "女", terms: ["qadın", "qadin", "xanım", "jenski", "jenskiy"] },
  { keyword: "儿童", terms: ["uşaq", "usaq", "detski", "detskiy", "uşaqlar üçün"] },
  { keyword: "女孩", terms: ["qız", "qiz", "qız uşağı"] },
  { keyword: "男孩", terms: ["oğlan", "oglan", "oğlan uşağı"] },
  { keyword: "婴儿", terms: ["körpə", "korpe", "body"] },

  /* --------------------------------- Rənglər -------------------------------- */
  { keyword: "黑色", terms: ["qara", "çorni", "chorni"] },
  { keyword: "白色", terms: ["ağ", "belı", "beli"] },
  { keyword: "红色", terms: ["qırmızı", "qirmizi", "krasni"] },
  { keyword: "蓝色", terms: ["mavi", "göy", "goy", "sini"] },
  { keyword: "绿色", terms: ["yaşıl", "yasil", "zeloni"] },
  { keyword: "黄色", terms: ["sarı", "sari", "jolti"] },
  { keyword: "灰色", terms: ["boz", "seri"] },
  { keyword: "粉色", terms: ["çəhrayı", "cehrayi", "rozovi", "rozovıy"] },
  { keyword: "紫色", terms: ["bənövşəyi", "benovseyi", "fioletovi"] },
  { keyword: "棕色", terms: ["qəhvəyi", "qehveyi", "korichnevi"] },
];
