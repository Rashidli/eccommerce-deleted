// ============================================================
//  DİL / TƏRCÜMƏ MƏRKƏZİ  (AZ · EN · RU)
// ============================================================
// Bütün interfeys mətnləri burada 3 dildə saxlanır.
// Yeni mətn əlavə edəndə hər 3 dilə də yaz.
// Komponentdə istifadə:  const { t } = useLang();  →  t.nav.shop

export type Lang = "az" | "en" | "ru";

export const LANGS: { code: Lang; label: string; name: string }[] = [
  { code: "az", label: "AZ", name: "Azərbaycan" },
  { code: "en", label: "EN", name: "English" },
  { code: "ru", label: "RU", name: "Русский" },
];

export const DEFAULT_LANG: Lang = "az";

interface Dict {
  nav: {
    home: string;
    search: string;
    cart: string;
    panel: string;
    shop: string;
    categories: string;
    deals: string;
    newArrivals: string;
    new: string;
    brands: string;
    wishlist: string;
    account: string;
    help: string;
    settings: string;
    more: string;
  };
  common: {
    search: string;
    searchHint: string;
    addToCart: string;
    seeAll: string;
    close: string;
    select: string;
    noResults: string;
    noResultsHint: string;
    searchTitle: string;
    searchSub: string;
    login: string;
  };
  hero: { title: string; subtitle: string; description: string; cta: string };
  promo: Record<
    "summerSale" | "newArrivals" | "clearance",
    { eyebrow: string; title: string; cta: string }
  >;
  sections: {
    categories: string;
    trending: string;
    newArrivals: string;
    platforms: string;
    platformsSub: string;
    explore: string;
    noPlatformCategories: string;
  };
  cat: {
    women: string;
    men: string;
    shoes: string;
    bags: string;
    accessories: string;
    beauty: string;
    tech: string;
    home: string;
    sports: string;
    kids: string;
    sale: string;
  };
  search: { platform: string; all: string };
  pages: {
    categories: string;
    deals: string;
    new: string;
    brands: string;
    account: string;
    help: string;
    settings: string;
    wishlist: string;
    cart: string;
    sale: string;
    empty: string;
    loginTitle: string;
    loginSub: string;
    registerTitle: string;
    registerSub: string;
    email: string;
    password: string;
    confirmPassword: string;
    phone: string;
    signIn: string;
    signUp: string;
    haveAccount: string;
    noAccount: string;
    fillFields: string;
    passwordMismatch: string;
    invalidCredentials: string;
    emailTaken: string;
    finRequired: string;
    finInvalid: string;
    finTaken: string;
    demoNote: string;
    name: string;
    productsFound: string;
    subtotal: string;
    checkout: string;
    viewCart: string;
    viewWishlist: string;
    continueShopping: string;
    emptyCart: string;
  };
  panel: {
    title: string;
    subtitle: string;
    dashboard: string;
    totalOrders: string;
    savedAddresses: string;
    recentOrders: string;
    orders: string;
    profile: string;
    addresses: string;
    payment: string;
    logout: string;
    orderNo: string;
    date: string;
    status: string;
    total: string;
    items: string;
    pending: string;
    processing: string;
    shipped: string;
    delivered: string;
    cancelled: string;
    noOrders: string;
    tracking: string;
    courier: string;
    pickupPoint: string;
    eta: string;
    deliveredOn: string;
    details: string;
    hideDetails: string;
    qty: string;
    fullName: string;
    phone: string;
    save: string;
    addAddress: string;
    defaultLabel: string;
    edit: string;
    remove: string;
    addressLabel: string;
    addressLine: string;
    makeDefault: string;
    profileSaved: string;
    balance: string;
    topUp: string;
    addCard: string;
    expires: string;
    noPaymentMethods: string;
    /* FİN — şəxsiyyət vəsiqəsi kodu */
    fin: string;
    finHint: string;
    /** Müştəri kodu — Zara sifarişində flat sahəsinə yazılır. */
    customerCode: string;
    customerCodeHint: string;
    finLocked: string;
    finEmpty: string;
    /* Sifariş prosesi (timeline) */
    timeline: string;
    stepPlaced: string;
    stepPaid: string;
    stepProcessing: string;
    stepShipped: string;
    stepDelivered: string;
    stepCancelled: string;
    awaitingPayment: string;
    /* Boş vəziyyət */
    noOrdersHint: string;
    startShopping: string;
    orderNumber: string;
    /* Ünvanlar — şəhər/rayon və xəta mətnləri */
    city: string;
    district: string;
    chooseDistrict: string;
    noAddresses: string;
    noAddressesHint: string;
    errMissingFields: string;
    errMissingRegion: string;
    errNotFound: string;
  };
  checkout: {
    title: string;
    stepDelivery: string;
    stepPayment: string;
    chooseCarrier: string;
    chooseBranch: string;
    selectedBranch: string;
    continueBtn: string;
    back: string;
    orderSummary: string;
    subtotal: string;
    delivery: string;
    grandTotal: string;
    /** Platforma üzrə çatdırılma bölgüsünün başlığı. */
    platformShipping: string;
    /** Platforma qiymət vermədi — sonra dəqiqləşəcək. */
    shippingPending: string;
    /** Çevrilmiş TƏXMİNİ yekun — tutulan məbləğ deyil. */
    approxTotal: string;
    /** Çatdırılma pulsuzdur (hədd keçilib). */
    freeShipping: string;
    payNow: string;
    pickBranchFirst: string;
    emptyCart: string;
    branches: string;
    cardNumber: string;
    /* ödəniş axını */
    gatewayTitle: string;
    gatewayNote: string;
    amountToPay: string;
    orderRef: string;
    confirmPay: string;
    cancelPay: string;
    successTitle: string;
    successNote: string;
    pendingNote: string;
    viewOrders: string;
    placing: string;
    securePayNote: string;
    errUnavailable: string;
    errMissingDelivery: string;
    errEmptyCart: string;
    errGeneric: string;
    /* Çatdırılma üsulu — kuryer / PUDO */
    deliveryMethod: string;
    methodCourier: string;
    methodCourierHint: string;
    methodPickup: string;
    methodPickupHint: string;
    chooseAddress: string;
    choosePickup: string;
    noAddressYet: string;
    manageAddresses: string;
    localDelivery: string;
    errNoAddress: string;
    errNoPickup: string;
  };
  product: {
    home: string;
    products: string;
    reviews: string;
    off: string;
    defaultColor: string;
    color: string;
    selectColor: string;
    size: string;
    selectSize: string;
    /** Ölçü/rəng seçilmədən səbətə atmaq cəhdi. */
    selectRequired: string;
    sizeGuide: string;
    quantity: string;
    buyNow: string;
    freeShipping: string;
    freeShippingSub: string;
    easyReturns: string;
    easyReturnsSub: string;
    securePayment: string;
    securePaymentSub: string;
    youMayAlsoLike: string;
    saveToWishlist: string;
    sku: string;
    stock: string;
    minOrder: string;
    unit: string;
    specifications: string;
    unavailable: string;
    priceTiers: string;
  };
  /** SEO mətnləri — başlıq/təsvir şablonları (hardcoded string qadağan, qayda #5). */
  seo: {
    homeTitle: string;
    homeDescription: string;
    categoriesTitle: string;
    categoriesDescription: string;
    productsTitle: string;
    productsDescription: string;
    /** `{query}` əvəzlənir. */
    searchTitle: string;
    /** `{category}` əvəzlənir. */
    categoryBrowseTitle: string;
    /** `{category}` + `{platform}` əvəzlənir. */
    categoryBrowseDescription: string;
    /** Məhsul təsviri boş olanda işlənir: `{name}` + `{brand}`. */
    productFallbackDescription: string;
    breadcrumbHome: string;
  };
  filters: {
    allProducts: string;
    allCategories: string;
    /** Kateqoriya baxışında sol paneldəki alt kateqoriya siyahısının başlığı. */
    subcategories: string;
    allBrands: string;
    allPrices: string;
    category: string;
    brand: string;
    price: string;
    sort: string;
    clearFilters: string;
    /** Açılmış alt kateqoriya siyahısını yığmaq. */
    showLess: string;
    noProducts: string;
    priceUnder25: string;
    price25_50: string;
    price50_100: string;
    priceOver100: string;
    sortFeatured: string;
    sortPriceLow: string;
    sortPriceHigh: string;
    sortNewest: string;
    sortBestRating: string;
  };
  perks: {
    global: { title: string; sub: string };
    prices: { title: string; sub: string };
    shipping: { title: string; sub: string };
    support: { title: string; sub: string };
  };
  footer: {
    tagline: string;
    shop: string;
    account: string;
    downloadApp: string;
    rights: string;
    terms: string;
    privacy: string;
    cookies: string;
  };
}

export const dict: Record<Lang, Dict> = {
  az: {
    nav: {
      home: "Ana səhifə",
      search: "Axtarış",
      cart: "Səbət",
      panel: "Panel",
      shop: "Mağaza",
      categories: "Kateqoriyalar",
      deals: "Endirimlər",
      newArrivals: "Yeni gələnlər",
      new: "Yeni",
      brands: "Brendlər",
      wishlist: "İstək siyahısı",
      account: "Hesab",
      help: "Kömək",
      settings: "Ayarlar",
      more: "Daha çox",
    },
    common: {
      search: "Məhsul axtar...",
      searchHint: "Açmaq üçün Ctrl+K",
      addToCart: "Səbətə at",
      seeAll: "Hamısına bax",
      close: "bağla",
      select: "seç",
      noResults: "Nəticə tapılmadı",
      noResultsHint: "Başqa açar sözlə yoxlayın",
      searchTitle: "Məhsul axtar",
      searchSub: "Kataloqda axtarmaq üçün yazmağa başlayın",
      login: "Daxil ol",
    },
    hero: {
      title: "Qlobal trendləri kəşf et",
      subtitle: "Hamısı bir yerdə",
      description: "Seçilmiş məhsullar.\nEtibar edə biləcəyin keyfiyyət.",
      cta: "İndi al",
    },
    promo: {
      summerSale: {
        eyebrow: "Yay endirimi",
        title: "60%-dək endirim",
        cta: "Təkliflərə bax",
      },
      newArrivals: {
        eyebrow: "Yeni gələnlər",
        title: "Hər gün yeni məhsul",
        cta: "Kəşf et",
      },
      clearance: {
        eyebrow: "Satış",
        title: "Məhdud vaxt təklifi",
        cta: "İndi al",
      },
    },
    sections: {
      categories: "Kateqoriyalar",
      trending: "Trend məhsullar",
      newArrivals: "Yeni gələnlər",
      platforms: "Bütün platformalar bir yerdə",
      platformsSub: "Milyonlarla məhsul, bir yerdə",
      explore: "Kəşf et",
      noPlatformCategories: "Bu platforma kateqoriya ağacı təqdim etmir — axtarışdan istifadə edin",
    },
    cat: {
      women: "Qadın",
      men: "Kişi",
      shoes: "Ayaqqabı",
      bags: "Çantalar",
      accessories: "Aksesuarlar",
      beauty: "Gözəllik",
      tech: "Texnologiya",
      home: "Ev",
      sports: "İdman",
      kids: "Uşaq",
      sale: "Endirim",
    },
    search: { platform: "Platforma", all: "Hamısı" },
    pages: {
      categories: "Kateqoriyalar",
      deals: "Endirimlər",
      new: "Yeni gələnlər",
      brands: "Brendlər",
      account: "Hesabım",
      help: "Kömək mərkəzi",
      settings: "Ayarlar",
      wishlist: "İstək siyahısı",
      cart: "Səbətim",
      sale: "Endirim",
      empty: "Burada hələ heç nə yoxdur",
      loginTitle: "Hesabına daxil ol",
      loginSub: "E-poçt və şifrə ilə davam et",
      registerTitle: "Yeni hesab yarat",
      registerSub: "Bir neçə saniyədə qeydiyyatdan keç",
      email: "E-poçt",
      password: "Şifrə",
      confirmPassword: "Şifrəni təsdiqlə",
      phone: "Telefon",
      signIn: "Daxil ol",
      signUp: "Qeydiyyatdan keç",
      haveAccount: "Artıq hesabın var?",
      noAccount: "Hesabın yoxdur?",
      fillFields: "Bütün xanaları doldur",
      passwordMismatch: "Şifrələr uyğun gəlmir",
      invalidCredentials: "E-poçt və ya şifrə yanlışdır",
      emailTaken: "Bu e-poçt artıq qeydiyyatdadır",
      finRequired: "FİN kod məcburidir",
      finInvalid: "FİN kod 7 simvol olmalıdır (rəqəm və böyük hərf)",
      finTaken: "Bu FİN kod artıq qeydiyyatdadır",
      demoNote: "Demo giriş — xanalar öncədən doldurulub, sadəcə davam et",
      name: "Ad Soyad",
      productsFound: "məhsul tapıldı",
      subtotal: "Cəmi",
      checkout: "Ödənişə keç",
      viewCart: "Səbətə bax",
      viewWishlist: "Siyahıya bax",
      continueShopping: "Alış-verişə davam et",
      emptyCart: "Səbətin boşdur",
    },
    panel: {
      title: "İstifadəçi paneli",
      subtitle: "Hesabını və sifarişlərini idarə et",
      dashboard: "İcmal",
      totalOrders: "Ümumi sifariş",
      savedAddresses: "Yadda saxlanmış ünvan",
      recentOrders: "Son sifarişlər",
      orders: "Sifarişlərim",
      profile: "Profil",
      addresses: "Ünvanlarım",
      payment: "Balans və kartlar",
      logout: "Çıxış",
      orderNo: "Sifariş nömrəsi",
      date: "Tarix",
      status: "Status",
      total: "Məbləğ",
      items: "məhsul",
      pending: "Ödəniş gözlənilir",
      processing: "Hazırlanır",
      shipped: "Yoldadır",
      delivered: "Çatdırıldı",
      cancelled: "Ləğv edildi",
      noOrders: "Hələ sifarişin yoxdur",
      tracking: "İzləmə nömrəsi",
      courier: "Kargo",
      pickupPoint: "Təhvil məntəqəsi",
      eta: "Təxmini çatdırılma",
      deliveredOn: "Çatdırıldı",
      details: "Detallara bax",
      hideDetails: "Detalları gizlət",
      qty: "ədəd",
      fullName: "Ad Soyad",
      phone: "Telefon",
      save: "Yadda saxla",
      addAddress: "Yeni ünvan əlavə et",
      defaultLabel: "Əsas",
      edit: "Redaktə et",
      remove: "Sil",
      addressLabel: "Etiket (məs. Ev, İş)",
      addressLine: "Ünvan",
      makeDefault: "Əsas et",
      profileSaved: "Profil yeniləndi",
      balance: "Balans",
      topUp: "Balansı artır",
      addCard: "Kart əlavə et",
      expires: "Bitmə tarixi",
      noPaymentMethods: "Hələ yadda saxlanmış ödəniş üsulu yoxdur",
      fin: "FİN kod",
      finHint: "Şəxsiyyət vəsiqəsindəki 7 simvol (məs. 5AB1C23)",
      customerCode: "Müştəri kodun",
      customerCodeHint: "Sifarişlərin anbarda bu kodla tanınır",
      finLocked: "FİN kod bir dəfə yazılır. Dəyişmək üçün dəstəyə yazın.",
      finEmpty: "Təyin edilməyib",
      timeline: "Sifarişin gedişi",
      stepPlaced: "Sifariş verildi",
      stepPaid: "Ödəniş alındı",
      stepProcessing: "Hazırlanır",
      stepShipped: "Yola salındı",
      stepDelivered: "Çatdırıldı",
      stepCancelled: "Ləğv edildi",
      awaitingPayment: "Ödəniş gözlənilir",
      noOrdersHint: "İlk sifarişinizi verin — məhsullar burada görünəcək.",
      startShopping: "Alış-verişə başla",
      orderNumber: "Sifariş nömrəsi",
      city: "Şəhər",
      district: "Rayon",
      chooseDistrict: "Rayon seçin",
      noAddresses: "Hələ ünvan əlavə etməmisiniz",
      noAddressesHint: "Kuryer çatdırılması üçün ünvan lazımdır",
      errMissingFields: "Bütün sahələri doldurun",
      errMissingRegion: "Şəhər və rayon seçin",
      errNotFound: "Ünvan tapılmadı",
    },
    checkout: {
      title: "Ödənişə keç",
      stepDelivery: "Kargo və filial",
      stepPayment: "Ödəniş",
      chooseCarrier: "Kargo şirkətini seç",
      chooseBranch: "Xəritədən və ya siyahıdan filial seç",
      selectedBranch: "Seçilmiş filial",
      continueBtn: "Davam et",
      back: "Geri",
      orderSummary: "Sifariş xülasəsi",
      subtotal: "Məhsulların cəmi",
      delivery: "Çatdırılma",
      grandTotal: "Yekun məbləğ",
      platformShipping: "Platforma çatdırılması",
      shippingPending: "Çatdırılma sifariş zamanı dəqiqləşəcək",
      approxTotal: "Təxmini yekun",
      freeShipping: "Pulsuz",
      payNow: "İndi ödə",
      pickBranchFirst: "Davam etmək üçün filial seç",
      emptyCart: "Səbətin boşdur — əvvəlcə məhsul əlavə et",
      branches: "filial",
      cardNumber: "Kart nömrəsi",
      gatewayTitle: "Ödəniş",
      gatewayNote: "Kart məlumatları yalnız ödəniş provayderində daxil edilir — bizim sistemə düşmür.",
      amountToPay: "Ödəniləcək məbləğ",
      orderRef: "Sifariş nömrəsi",
      confirmPay: "Ödənişi təsdiqlə",
      cancelPay: "Ləğv et və geri qayıt",
      successTitle: "Sifariş təsdiqləndi",
      successNote: "Ödəniş uğurla tamamlandı",
      pendingNote: "Ödəniş gözlənilir",
      viewOrders: "Sifarişlərim",
      placing: "Sifariş yaradılır…",
      securePayNote: "Ödəniş təhlükəsiz provayder səhifəsində aparılır",
      errUnavailable: "Bəzi məhsullar artıq mövcud deyil — səbəti yenilə",
      errMissingDelivery: "Əvvəlcə kargo və filial seç",
      errEmptyCart: "Səbətin boşdur",
      errGeneric: "Sifariş yaradıla bilmədi — yenidən cəhd et",
      deliveryMethod: "Çatdırılma üsulu",
      methodCourier: "Kuryer ilə ünvana",
      methodCourierHint: "Biz çatdırırıq — ünvan seçin",
      methodPickup: "Məntəqədən götürmə",
      methodPickupHint: "Özünüz gəlib götürürsünüz",
      chooseAddress: "Ünvan seçin",
      choosePickup: "Məntəqə seçin",
      noAddressYet: "Ünvanınız yoxdur",
      manageAddresses: "Ünvanları idarə et",
      localDelivery: "Yerli çatdırılma",
      errNoAddress: "Ünvan seçin",
      errNoPickup: "Məntəqə seçin",
    },
    product: {
      home: "Ana səhifə",
      products: "Məhsullar",
      reviews: "rəy",
      off: "ENDİRİM",
      defaultColor: "Standart",
      color: "Rəng",
      selectColor: "Rəng seç",
      size: "Ölçü",
      selectSize: "Ölçü seç",
      selectRequired: "Əvvəlcə seçin",
      sizeGuide: "Ölçü cədvəli",
      quantity: "Say",
      buyNow: "İndi al",
      freeShipping: "Pulsuz çatdırılma",
      freeShippingSub: "$50-dən yuxarı sifarişlərə",
      easyReturns: "Asan geri qaytarma",
      easyReturnsSub: "30 gün ərzində",
      securePayment: "Təhlükəsiz ödəniş",
      securePaymentSub: "100% qorunur",
      youMayAlsoLike: "Bunlar da xoşuna gələ bilər",
      saveToWishlist: "İstək siyahısına əlavə et",
      sku: "Artikul",
      stock: "Anbarda",
      minOrder: "Minimum sifariş",
      unit: "Vahid",
      specifications: "Xüsusiyyətlər",
      unavailable: "Mövcud deyil",
      priceTiers: "Topdan qiymət",
    },
    seo: {
      homeTitle: "E-Commerce — Qlobal trendləri kəşf et",
      homeDescription:
        "Minlərlə məhsul — ən yaxşı qiymətə, Azərbaycana çatdırılma.",
      categoriesTitle: "Bütün kateqoriyalar",
      categoriesDescription:
        "Geyim, ayaqqabı, elektronika, ev və daha çox — platformalar üzrə bütün kateqoriyalar.",
      productsTitle: "Bütün məhsullar",
      productsDescription:
        "Bütün məhsullar bir yerdə — qiymətə, brendə və kateqoriyaya görə süz.",
      searchTitle: "“{query}” üzrə axtarış nəticələri",
      categoryBrowseTitle: "{category}",
      categoryBrowseDescription:
        "{category} kateqoriyasındakı məhsullar — E-Commerce-də.",
      productFallbackDescription:
        "{name} — {brand}. E-Commerce-də sifariş et, Azərbaycana çatdırılsın.",
      breadcrumbHome: "Ana səhifə",
    },
    filters: {
      allProducts: "Bütün məhsullar",
      allCategories: "Bütün kateqoriyalar",
      subcategories: "Alt kateqoriyalar",
      allBrands: "Bütün brendlər",
      allPrices: "Bütün qiymətlər",
      category: "Kateqoriya",
      brand: "Brend",
      price: "Qiymət",
      sort: "Sırala",
      clearFilters: "Filtrləri təmizlə",
      showLess: "Yığ",
      noProducts: "Bu filtrlərlə məhsul tapılmadı.",
      priceUnder25: "$25-dən aşağı",
      price25_50: "$25 - $50",
      price50_100: "$50 - $100",
      priceOver100: "$100-dən yuxarı",
      sortFeatured: "Seçilmiş",
      sortPriceLow: "Qiymət: aşağıdan yuxarı",
      sortPriceHigh: "Qiymət: yuxarıdan aşağı",
      sortNewest: "Ən yeni",
      sortBestRating: "Ən yüksək reytinq",
    },
    perks: {
      global: { title: "Qlobal təchizat", sub: "Ən yaxşı təchizatçılar" },
      prices: { title: "Ən yaxşı qiymətlər", sub: "Rəqabətsiz təkliflər" },
      shipping: { title: "Sürətli çatdırılma", sub: "Dünya üzrə çatdırılma" },
      support: { title: "24/7 Dəstək", sub: "Həmişə yanınızdayıq" },
    },
    footer: {
      tagline: "Qlobal məhsullar üçün ən sərfəli ünvanın.",
      shop: "Mağaza",
      account: "Hesab",
      downloadApp: "Tətbiqi yüklə",
      rights: "Bütün hüquqlar qorunur.",
      terms: "Şərtlər",
      privacy: "Məxfilik",
      cookies: "Kukilər",
    },
  },
  en: {
    nav: {
      home: "Home",
      search: "Search",
      cart: "Cart",
      panel: "Panel",
      shop: "Shop",
      categories: "Categories",
      deals: "Deals",
      newArrivals: "New Arrivals",
      new: "New",
      brands: "Brands",
      wishlist: "Wishlist",
      account: "Account",
      help: "Help",
      settings: "Settings",
      more: "More",
    },
    common: {
      search: "Search products...",
      searchHint: "Press Ctrl+K to open",
      addToCart: "Add to Cart",
      seeAll: "See all",
      close: "to close",
      select: "to select",
      noResults: "No results found",
      noResultsHint: "Try searching with different keywords",
      searchTitle: "Search for products",
      searchSub: "Start typing to search through our catalog",
      login: "Log in",
    },
    hero: {
      title: "Discover Global Trends",
      subtitle: "All in One Place",
      description: "Curated products.\nQuality you can trust.",
      cta: "Shop Now",
    },
    promo: {
      summerSale: {
        eyebrow: "Summer sale",
        title: "Up to 60% off",
        cta: "See offers",
      },
      newArrivals: {
        eyebrow: "New arrivals",
        title: "New products every day",
        cta: "Explore",
      },
      clearance: {
        eyebrow: "Clearance",
        title: "Limited time offer",
        cta: "Shop now",
      },
    },
    sections: {
      categories: "Categories",
      trending: "Trending Products",
      newArrivals: "New Arrivals",
      platforms: "All platforms in one place",
      platformsSub: "Millions of products, all in one place",
      explore: "Explore",
      noPlatformCategories: "This platform doesn't provide a category tree — use search instead",
    },
    cat: {
      women: "Women",
      men: "Men",
      shoes: "Shoes",
      bags: "Bags",
      accessories: "Accessories",
      beauty: "Beauty",
      tech: "Tech",
      home: "Home",
      sports: "Sports",
      kids: "Kids",
      sale: "Sale",
    },
    search: { platform: "Platform", all: "All" },
    pages: {
      categories: "Categories",
      deals: "Deals",
      new: "New Arrivals",
      brands: "Brands",
      account: "My Account",
      help: "Help Center",
      settings: "Settings",
      wishlist: "Wishlist",
      cart: "My Cart",
      sale: "Sale",
      empty: "Nothing here yet",
      loginTitle: "Sign in to your account",
      loginSub: "Continue with email and password",
      registerTitle: "Create an account",
      registerSub: "Sign up in a few seconds",
      email: "Email",
      password: "Password",
      confirmPassword: "Confirm password",
      phone: "Phone",
      signIn: "Sign in",
      signUp: "Sign up",
      haveAccount: "Already have an account?",
      noAccount: "Don't have an account?",
      fillFields: "Please fill in all fields",
      passwordMismatch: "Passwords do not match",
      invalidCredentials: "Invalid email or password",
      emailTaken: "This email is already registered",
      finRequired: "FIN code is required",
      finInvalid: "FIN code must be 7 characters (digits and capital letters)",
      finTaken: "This FIN code is already registered",
      demoNote: "Demo login — fields are pre-filled, just continue",
      name: "Full name",
      productsFound: "products found",
      subtotal: "Subtotal",
      checkout: "Checkout",
      viewCart: "View cart",
      viewWishlist: "View wishlist",
      continueShopping: "Continue shopping",
      emptyCart: "Your cart is empty",
    },
    panel: {
      title: "User panel",
      subtitle: "Manage your account and orders",
      dashboard: "Overview",
      totalOrders: "Total orders",
      savedAddresses: "Saved addresses",
      recentOrders: "Recent orders",
      orders: "My orders",
      profile: "Profile",
      addresses: "My addresses",
      payment: "Balance & cards",
      logout: "Sign out",
      orderNo: "Order number",
      date: "Date",
      status: "Status",
      total: "Total",
      items: "items",
      pending: "Awaiting payment",
      processing: "Processing",
      shipped: "Shipped",
      delivered: "Delivered",
      cancelled: "Cancelled",
      noOrders: "You have no orders yet",
      tracking: "Tracking number",
      courier: "Courier",
      pickupPoint: "Pickup point",
      eta: "Estimated delivery",
      deliveredOn: "Delivered",
      details: "View details",
      hideDetails: "Hide details",
      qty: "pcs",
      fullName: "Full name",
      phone: "Phone",
      save: "Save",
      addAddress: "Add new address",
      defaultLabel: "Default",
      edit: "Edit",
      remove: "Remove",
      addressLabel: "Label (e.g. Home, Work)",
      addressLine: "Address",
      makeDefault: "Set default",
      profileSaved: "Profile updated",
      balance: "Balance",
      topUp: "Top up",
      addCard: "Add card",
      expires: "Expires",
      noPaymentMethods: "No saved payment methods yet",
      fin: "FIN code",
      finHint: "7 characters from your ID card (e.g. 5AB1C23)",
      customerCode: "Your customer code",
      customerCodeHint: "Your parcels are identified by this code at our warehouse",
      finLocked: "The FIN code is set once. Contact support to change it.",
      finEmpty: "Not set",
      timeline: "Order progress",
      stepPlaced: "Order placed",
      stepPaid: "Payment received",
      stepProcessing: "Processing",
      stepShipped: "Shipped",
      stepDelivered: "Delivered",
      stepCancelled: "Cancelled",
      awaitingPayment: "Awaiting payment",
      noOrdersHint: "Place your first order — it will appear here.",
      startShopping: "Start shopping",
      orderNumber: "Order number",
      city: "City",
      district: "District",
      chooseDistrict: "Select district",
      noAddresses: "No addresses yet",
      noAddressesHint: "Courier delivery needs an address",
      errMissingFields: "Fill in all fields",
      errMissingRegion: "Select city and district",
      errNotFound: "Address not found",
    },
    checkout: {
      title: "Checkout",
      stepDelivery: "Courier & branch",
      stepPayment: "Payment",
      chooseCarrier: "Choose a courier company",
      chooseBranch: "Pick a branch from the map or the list",
      selectedBranch: "Selected branch",
      continueBtn: "Continue",
      back: "Back",
      orderSummary: "Order summary",
      subtotal: "Subtotal",
      delivery: "Delivery",
      grandTotal: "Total",
      platformShipping: "Platform shipping",
      shippingPending: "Shipping will be confirmed at checkout",
      approxTotal: "Approx. total",
      freeShipping: "Free",
      payNow: "Pay now",
      pickBranchFirst: "Select a branch to continue",
      emptyCart: "Your cart is empty — add a product first",
      branches: "branches",
      cardNumber: "Card number",
      gatewayTitle: "Payment",
      gatewayNote: "Card details are entered only at the payment provider — they never reach our systems.",
      amountToPay: "Amount to pay",
      orderRef: "Order number",
      confirmPay: "Confirm payment",
      cancelPay: "Cancel and go back",
      successTitle: "Order confirmed",
      successNote: "Payment completed successfully",
      pendingNote: "Awaiting payment",
      viewOrders: "My orders",
      placing: "Creating order…",
      securePayNote: "Payment is handled on a secure provider page",
      errUnavailable: "Some products are no longer available — refresh your cart",
      errMissingDelivery: "Choose a courier and branch first",
      errEmptyCart: "Your cart is empty",
      errGeneric: "Could not create the order — please try again",
      deliveryMethod: "Delivery method",
      methodCourier: "Courier to your address",
      methodCourierHint: "We deliver — choose an address",
      methodPickup: "Pickup point",
      methodPickupHint: "You collect it yourself",
      chooseAddress: "Choose an address",
      choosePickup: "Choose a pickup point",
      noAddressYet: "You have no address yet",
      manageAddresses: "Manage addresses",
      localDelivery: "Local delivery",
      errNoAddress: "Choose an address",
      errNoPickup: "Choose a pickup point",
    },
    product: {
      home: "Home",
      products: "Products",
      reviews: "reviews",
      off: "OFF",
      defaultColor: "Default",
      color: "Color",
      selectColor: "Select a color",
      size: "Size",
      selectSize: "Select a size",
      selectRequired: "Please select",
      sizeGuide: "Size guide",
      quantity: "Quantity",
      buyNow: "Buy now",
      freeShipping: "Free shipping",
      freeShippingSub: "Orders over $50",
      easyReturns: "Easy returns",
      easyReturnsSub: "30-day policy",
      securePayment: "Secure payment",
      securePaymentSub: "100% protected",
      youMayAlsoLike: "You may also like",
      saveToWishlist: "Save to wishlist",
      sku: "SKU",
      stock: "In stock",
      minOrder: "Minimum order",
      unit: "Unit",
      specifications: "Specifications",
      unavailable: "Unavailable",
      priceTiers: "Wholesale price",
    },
    seo: {
      homeTitle: "E-Commerce — Discover global trends",
      homeDescription:
        "Thousands of products — best prices, delivered to Azerbaijan.",
      categoriesTitle: "All categories",
      categoriesDescription:
        "Clothing, shoes, electronics, home and more — every category across all platforms.",
      productsTitle: "All products",
      productsDescription:
        "All products in one place — filter by price, brand and category.",
      searchTitle: "Search results for “{query}”",
      categoryBrowseTitle: "{category}",
      categoryBrowseDescription:
        "Products in the {category} category — at E-Commerce.",
      productFallbackDescription:
        "{name} — {brand}. Order on E-Commerce with delivery to Azerbaijan.",
      breadcrumbHome: "Home",
    },
    filters: {
      allProducts: "All Products",
      allCategories: "All Categories",
      subcategories: "Subcategories",
      allBrands: "All Brands",
      allPrices: "All Prices",
      category: "Category",
      brand: "Brand",
      price: "Price",
      sort: "Sort",
      clearFilters: "Clear all filters",
      showLess: "Show less",
      noProducts: "No products found with these filters.",
      priceUnder25: "Under $25",
      price25_50: "$25 - $50",
      price50_100: "$50 - $100",
      priceOver100: "Over $100",
      sortFeatured: "Featured",
      sortPriceLow: "Price: Low to High",
      sortPriceHigh: "Price: High to Low",
      sortNewest: "Newest",
      sortBestRating: "Best Rating",
    },
    perks: {
      global: { title: "Global Sourcing", sub: "Top suppliers" },
      prices: { title: "Best Prices", sub: "Unbeatable deals" },
      shipping: { title: "Fast Shipping", sub: "Worldwide delivery" },
      support: { title: "24/7 Support", sub: "We're here for you" },
    },
    footer: {
      tagline: "Your one-stop destination for global products.",
      shop: "Shop",
      account: "Account",
      downloadApp: "Download App",
      rights: "All rights reserved.",
      terms: "Terms",
      privacy: "Privacy",
      cookies: "Cookies",
    },
  },
  ru: {
    nav: {
      home: "Главная",
      search: "Поиск",
      cart: "Корзина",
      panel: "Кабинет",
      shop: "Магазин",
      categories: "Категории",
      deals: "Скидки",
      newArrivals: "Новинки",
      new: "Новое",
      brands: "Бренды",
      wishlist: "Избранное",
      account: "Аккаунт",
      help: "Помощь",
      settings: "Настройки",
      more: "Ещё",
    },
    common: {
      search: "Поиск товаров...",
      searchHint: "Ctrl+K чтобы открыть",
      addToCart: "В корзину",
      seeAll: "Смотреть все",
      close: "закрыть",
      select: "выбрать",
      noResults: "Ничего не найдено",
      noResultsHint: "Попробуйте другие ключевые слова",
      searchTitle: "Поиск товаров",
      searchSub: "Начните вводить, чтобы искать в каталоге",
      login: "Войти",
    },
    hero: {
      title: "Откройте мировые тренды",
      subtitle: "Всё в одном месте",
      description: "Отобранные товары.\nКачество, которому можно доверять.",
      cta: "Купить",
    },
    promo: {
      summerSale: {
        eyebrow: "Летняя распродажа",
        title: "Скидки до 60%",
        cta: "Смотреть предложения",
      },
      newArrivals: {
        eyebrow: "Новинки",
        title: "Новые товары каждый день",
        cta: "Открыть",
      },
      clearance: {
        eyebrow: "Распродажа",
        title: "Предложение ограничено",
        cta: "Купить сейчас",
      },
    },
    sections: {
      categories: "Категории",
      trending: "Популярные товары",
      newArrivals: "Новинки",
      platforms: "Все площадки в одном месте",
      platformsSub: "Миллионы товаров в одном месте",
      explore: "Смотреть",
      noPlatformCategories: "Эта платформа не предоставляет дерево категорий — используйте поиск",
    },
    cat: {
      women: "Женское",
      men: "Мужское",
      shoes: "Обувь",
      bags: "Сумки",
      accessories: "Аксессуары",
      beauty: "Красота",
      tech: "Техника",
      home: "Дом",
      sports: "Спорт",
      kids: "Дети",
      sale: "Скидки",
    },
    search: { platform: "Платформа", all: "Все" },
    pages: {
      categories: "Категории",
      deals: "Скидки",
      new: "Новинки",
      brands: "Бренды",
      account: "Мой аккаунт",
      help: "Центр помощи",
      settings: "Настройки",
      wishlist: "Избранное",
      cart: "Моя корзина",
      sale: "Скидки",
      empty: "Здесь пока ничего нет",
      loginTitle: "Войдите в аккаунт",
      loginSub: "Продолжите с почтой и паролем",
      registerTitle: "Создать аккаунт",
      registerSub: "Зарегистрируйтесь за пару секунд",
      email: "Эл. почта",
      password: "Пароль",
      confirmPassword: "Подтвердите пароль",
      phone: "Телефон",
      signIn: "Войти",
      signUp: "Регистрация",
      haveAccount: "Уже есть аккаунт?",
      noAccount: "Нет аккаунта?",
      fillFields: "Заполните все поля",
      passwordMismatch: "Пароли не совпадают",
      invalidCredentials: "Неверный e-mail или пароль",
      emailTaken: "Этот e-mail уже зарегистрирован",
      finRequired: "ФИН код обязателен",
      finInvalid: "ФИН код должен состоять из 7 символов (цифры и заглавные буквы)",
      finTaken: "Этот ФИН код уже зарегистрирован",
      demoNote: "Демо-вход — поля заполнены заранее, просто продолжите",
      name: "Имя и фамилия",
      productsFound: "товаров найдено",
      subtotal: "Итого",
      checkout: "Оформить заказ",
      viewCart: "Открыть корзину",
      viewWishlist: "Открыть избранное",
      continueShopping: "Продолжить покупки",
      emptyCart: "Ваша корзина пуста",
    },
    panel: {
      title: "Личный кабинет",
      subtitle: "Управляйте аккаунтом и заказами",
      dashboard: "Обзор",
      totalOrders: "Всего заказов",
      savedAddresses: "Сохранённые адреса",
      recentOrders: "Последние заказы",
      orders: "Мои заказы",
      profile: "Профиль",
      addresses: "Мои адреса",
      payment: "Баланс и карты",
      logout: "Выход",
      orderNo: "Номер заказа",
      date: "Дата",
      status: "Статус",
      total: "Сумма",
      items: "товаров",
      pending: "Ожидается оплата",
      processing: "В обработке",
      shipped: "В пути",
      delivered: "Доставлен",
      cancelled: "Отменён",
      noOrders: "У вас пока нет заказов",
      tracking: "Трек-номер",
      courier: "Служба доставки",
      pickupPoint: "Пункт выдачи",
      eta: "Ожидаемая доставка",
      deliveredOn: "Доставлен",
      details: "Подробности",
      hideDetails: "Скрыть подробности",
      qty: "шт",
      fullName: "Имя и фамилия",
      phone: "Телефон",
      save: "Сохранить",
      addAddress: "Добавить адрес",
      defaultLabel: "Основной",
      edit: "Изменить",
      remove: "Удалить",
      addressLabel: "Метка (напр. Дом, Работа)",
      addressLine: "Адрес",
      makeDefault: "Сделать основным",
      profileSaved: "Профиль обновлён",
      balance: "Баланс",
      topUp: "Пополнить",
      addCard: "Добавить карту",
      expires: "Срок",
      noPaymentMethods: "Пока нет сохранённых способов оплаты",
      fin: "ФИН код",
      finHint: "7 символов из удостоверения личности (напр. 5AB1C23)",
      customerCode: "Ваш код клиента",
      customerCodeHint: "По этому коду ваши посылки опознаются на складе",
      finLocked: "ФИН код указывается один раз. Для изменения обратитесь в поддержку.",
      finEmpty: "Не указан",
      timeline: "Ход заказа",
      stepPlaced: "Заказ оформлен",
      stepPaid: "Оплата получена",
      stepProcessing: "В обработке",
      stepShipped: "Отправлен",
      stepDelivered: "Доставлен",
      stepCancelled: "Отменён",
      awaitingPayment: "Ожидается оплата",
      noOrdersHint: "Оформите первый заказ — он появится здесь.",
      startShopping: "Начать покупки",
      orderNumber: "Номер заказа",
      city: "Город",
      district: "Район",
      chooseDistrict: "Выберите район",
      noAddresses: "Адресов пока нет",
      noAddressesHint: "Для курьерской доставки нужен адрес",
      errMissingFields: "Заполните все поля",
      errMissingRegion: "Выберите город и район",
      errNotFound: "Адрес не найден",
    },
    checkout: {
      title: "Оформление заказа",
      stepDelivery: "Доставка и филиал",
      stepPayment: "Оплата",
      chooseCarrier: "Выберите службу доставки",
      chooseBranch: "Выберите филиал на карте или в списке",
      selectedBranch: "Выбранный филиал",
      continueBtn: "Продолжить",
      back: "Назад",
      orderSummary: "Итог заказа",
      subtotal: "Сумма товаров",
      delivery: "Доставка",
      grandTotal: "Итого",
      platformShipping: "Доставка платформы",
      shippingPending: "Стоимость доставки уточнится при оформлении",
      approxTotal: "Примерный итог",
      freeShipping: "Бесплатно",
      payNow: "Оплатить",
      pickBranchFirst: "Выберите филиал, чтобы продолжить",
      emptyCart: "Корзина пуста — сначала добавьте товар",
      branches: "филиалов",
      cardNumber: "Номер карты",
      gatewayTitle: "Оплата",
      gatewayNote: "Данные карты вводятся только у платёжного провайдера — они не попадают в наши системы.",
      amountToPay: "Сумма к оплате",
      orderRef: "Номер заказа",
      confirmPay: "Подтвердить оплату",
      cancelPay: "Отменить и вернуться",
      successTitle: "Заказ подтверждён",
      successNote: "Оплата прошла успешно",
      pendingNote: "Ожидается оплата",
      viewOrders: "Мои заказы",
      placing: "Создание заказа…",
      securePayNote: "Оплата проходит на защищённой странице провайдера",
      errUnavailable: "Некоторых товаров больше нет — обновите корзину",
      errMissingDelivery: "Сначала выберите службу доставки и филиал",
      errEmptyCart: "Корзина пуста",
      errGeneric: "Не удалось создать заказ — попробуйте снова",
      deliveryMethod: "Способ доставки",
      methodCourier: "Курьером на адрес",
      methodCourierHint: "Мы доставим — выберите адрес",
      methodPickup: "Пункт выдачи",
      methodPickupHint: "Вы забираете сами",
      chooseAddress: "Выберите адрес",
      choosePickup: "Выберите пункт выдачи",
      noAddressYet: "У вас пока нет адреса",
      manageAddresses: "Управление адресами",
      localDelivery: "Локальная доставка",
      errNoAddress: "Выберите адрес",
      errNoPickup: "Выберите пункт выдачи",
    },
    product: {
      home: "Главная",
      products: "Товары",
      reviews: "отзывов",
      off: "СКИДКА",
      defaultColor: "Стандартный",
      color: "Цвет",
      selectColor: "Выберите цвет",
      size: "Размер",
      selectSize: "Выберите размер",
      selectRequired: "Сначала выберите",
      sizeGuide: "Таблица размеров",
      quantity: "Количество",
      buyNow: "Купить сейчас",
      freeShipping: "Бесплатная доставка",
      freeShippingSub: "При заказе от $50",
      easyReturns: "Лёгкий возврат",
      easyReturnsSub: "В течение 30 дней",
      securePayment: "Безопасная оплата",
      securePaymentSub: "100% защита",
      youMayAlsoLike: "Вам также может понравиться",
      saveToWishlist: "Добавить в избранное",
      sku: "Артикул",
      stock: "В наличии",
      minOrder: "Минимальный заказ",
      unit: "Единица",
      specifications: "Характеристики",
      unavailable: "Недоступно",
      priceTiers: "Оптовая цена",
    },
    seo: {
      homeTitle: "E-Commerce — Открой мировые тренды",
      homeDescription:
        "Тысячи товаров — лучшие цены, доставка в Азербайджан.",
      categoriesTitle: "Все категории",
      categoriesDescription:
        "Одежда, обувь, электроника, дом и другое — все категории по всем платформам.",
      productsTitle: "Все товары",
      productsDescription:
        "Все товары в одном месте — фильтруй по цене, бренду и категории.",
      searchTitle: "Результаты поиска по запросу «{query}»",
      categoryBrowseTitle: "{category}",
      categoryBrowseDescription:
        "Товары в категории {category} — в E-Commerce.",
      productFallbackDescription:
        "{name} — {brand}. Закажи в E-Commerce с доставкой в Азербайджан.",
      breadcrumbHome: "Главная",
    },
    filters: {
      allProducts: "Все товары",
      allCategories: "Все категории",
      subcategories: "Подкатегории",
      allBrands: "Все бренды",
      allPrices: "Все цены",
      category: "Категория",
      brand: "Бренд",
      price: "Цена",
      sort: "Сортировка",
      clearFilters: "Сбросить фильтры",
      showLess: "Свернуть",
      noProducts: "Товары по этим фильтрам не найдены.",
      priceUnder25: "До $25",
      price25_50: "$25 - $50",
      price50_100: "$50 - $100",
      priceOver100: "Более $100",
      sortFeatured: "Рекомендуемые",
      sortPriceLow: "Цена: по возрастанию",
      sortPriceHigh: "Цена: по убыванию",
      sortNewest: "Новые",
      sortBestRating: "Лучший рейтинг",
    },
    perks: {
      global: { title: "Глобальные поставки", sub: "Лучшие поставщики" },
      prices: { title: "Лучшие цены", sub: "Непревзойдённые предложения" },
      shipping: { title: "Быстрая доставка", sub: "Доставка по всему миру" },
      support: { title: "Поддержка 24/7", sub: "Мы всегда на связи" },
    },
    footer: {
      tagline: "Лучшее место для товаров со всего мира.",
      shop: "Магазин",
      account: "Аккаунт",
      downloadApp: "Скачать приложение",
      rights: "Все права защищены.",
      terms: "Условия",
      privacy: "Конфиденциальность",
      cookies: "Cookies",
    },
  },
};
