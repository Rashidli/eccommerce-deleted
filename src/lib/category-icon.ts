import {
  Anchor,
  Baby,
  Bed,
  Blocks,
  BookOpen,
  Boxes,
  Briefcase,
  Brush,
  Camera,
  Car,
  CircuitBoard,
  Coffee,
  Cog,
  Cpu,
  Droplets,
  Drill,
  Dumbbell,
  Factory,
  Fish,
  FlaskConical,
  Flame,
  Flower2,
  Footprints,
  Gem,
  Gift,
  Handshake,
  HardHat,
  Heart,
  House,
  Layers,
  Lightbulb,
  Magnet,
  Package,
  PawPrint,
  Pill,
  Plug,
  Printer,
  Recycle,
  Ruler,
  Shield,
  Shirt,
  Smartphone,
  Sofa,
  Sparkles,
  Sprout,
  Store,
  Sun,
  Tag,
  TreePine,
  Truck,
  UserRound,
  Utensils,
  Warehouse,
  Wrench,
  Zap,
  type LucideIcon,
} from "lucide-react";

// Kateqoriya ikonları — şəkli olmayan kateqoriyalar boş görünməsin.
// İki mərhələ: (1) bizim daxili kateqoriyalar SLUG ilə (dildən asılı deyil),
// (2) platforma kateqoriyaları AD ilə açar-söz uyğunluğu.
// Partzona `translated_name`-i bütün dillər üçün ingiliscə qaytarır, ona görə
// ingilis açar sözləri hər üç dildə işləyir; çincə variantlar ehtiyat üçündür.

/** Bizim `Category.slug` dəyərləri — dil dəyişəndə sınmır. */
const SLUG_ICONS: Record<string, LucideIcon> = {
  women: Shirt,
  men: UserRound,
  shoes: Footprints,
  bags: Briefcase,
  accessories: Sparkles,
  beauty: Flower2,
  tech: Cpu,
  home: House,
  sports: Dumbbell,
  kids: Baby,
  sale: Tag,
};

/**
 * Açar söz → ikon. Sıra ƏHƏMİYYƏTLİDİR: daha spesifik ifadələr yuxarıda olmalıdır
 * (məs. "new energy" → "energy"-dən əvvəl, "sportswear" → "wear"-dan əvvəl).
 */
const KEYWORD_ICONS: [RegExp, LucideIcon][] = [
  // --- spesifiklər (əvvəl gəlməlidir) ---
  [/new energy|新能源/, Sun],
  [/building material|home improvement|建材|家装/, HardHat],
  [/sportswear|sports outdoor|运动/, Dumbbell],
  [/children'?s clothing|童装/, Baby],
  [/maternal|infant|母婴/, Baby],
  [/underwear|内衣/, Shirt],
  [/menswear|\bmen'?s clothing|男装/, UserRound],
  [/women'?s clothing|女装/, Shirt],
  [/home textile|home decoration|家纺|家饰/, Sofa],
  [/bedding|床上用品/, Bed],
  [/towel|毛巾/, Droplets],
  [/machine tool|机床/, Drill],
  [/machinery|industry equipment|机械/, Cog],
  [/used equipment|二手/, Warehouse],
  [/electronic component|电子元器件/, CircuitBoard],
  [/electrician|electrical|电工|电气/, Zap],
  [/household appliance|家用电器/, Plug],
  [/communication|通信/, Smartphone],
  [/digital|computer|数码|电脑/, Cpu],
  [/automotive|auto parts|汽车|汽摩/, Car],
  [/storage|cleaning appliance|收纳|清洁/, Boxes],
  [/home clear|guard|个护|家清/, Brush],
  [/daily food|kitchen|drinking utensil|餐厨|饮具/, Coffee],
  [/catering|fresh|餐饮|生鲜/, Fish],
  [/food|drink|食品|酒水/, Utensils],
  [/adult supplies|成人用品/, Heart],
  [/pets|gardening|宠物|园艺/, PawPrint],
  [/luggage|leather goods|箱包|皮具/, Briefcase],
  [/clothing accessor|accessor|服饰配件|饰品/, Sparkles],
  [/jewelry|珠宝/, Gem],

  // --- ümumilər ---
  [/agriculture|农业/, Sprout],
  [/textile|leather|纺织|皮革/, Layers],
  [/chemical|化工/, FlaskConical],
  [/metallurg|mineral|steel|冶金|矿产|钢铁/, Magnet],
  [/energy|能源/, Flame],
  [/transport|交通|运输/, Truck],
  [/home daily|daily necessities|居家|日用/, House],
  [/arts and crafts|gift|工艺品|礼品/, Gift],
  [/media|radio|television|传媒|广电/, Camera],
  [/rubber|plastic|橡塑/, Recycle],
  [/lighting|灯饰|照明/, Lightbulb],
  [/hardware|tool|五金|工具/, Wrench],
  [/environmental|环保/, TreePine],
  [/medicine|maintenance|医药|保养/, Pill],
  [/office|culture|办公|文化/, BookOpen],
  [/printing|印刷/, Printer],
  [/packaging|包装/, Package],
  [/business service|商务服务/, Store],
  [/agent|代理/, Handshake],
  [/project cooperation|项目合作/, Handshake],
  [/safety|protection|安全|防护/, Shield],
  [/beauty|skin care|makeup|美容|护肤|彩妆/, Flower2],
  [/toys|玩具/, Blocks],
  [/processing|加工/, Factory],
  [/instrument|仪器|仪表/, Ruler],
  [/shoes|鞋/, Footprints],
  [/marine|shipping|船/, Anchor],

  // --- TƏK SÖZLÜ adlar (ƏN SONDA) ---
  // Zara kimi platformalar kateqoriyanı sadəcə "Women" / "Shoes" / "VESTIDOS"
  // adlandırır; yuxarıdakı ifadələr isə "women's clothing" kimi söz birləşməsi
  // gözləyir, ona görə hamısı `Tag` fallback-inə düşürdü.
  //
  // Bu blok QƏSDƏN sonda dayanır: yuxarıdakı spesifik uyğunluqlar öz üstünlüyünü
  // saxlayır (məs. "Home Textile" → Sofa, burada `\bhome\b` → House DEYİL).
  //
  // `\b` sərhədi vacibdir: `\bmen\b` "women" sözünə UYĞUN GƏLMİR, çünki "o" ilə
  // "m" arasında söz sərhədi yoxdur — əks halda qadın kateqoriyası kişi ikonu alardı.
  //
  // Zara adları İSPANCA gəlir (tərcümədən əvvəl), ona görə ispanca qarşılıqlar da var.
  [/\b(women|woman|mujer|qadın)\b/, Shirt],
  [/\b(men|man|hombre|kişi)\b/, UserRound],
  [/\b(kids?|niñ[oa]s?|ninos?|uşaq)\b/, Baby],
  [/\b(baby|beb[eé]s?|körpə)/, Baby],
  [/\b(dress(es)?|vestidos?|don)\b/, Shirt],
  [/\b(skirts?|faldas?)\b/, Shirt],
  [/\b(t-?shirts?|camisetas?|tops?|polos?)\b/, Shirt],
  [/\b(shirts?|camisas?|blusas?)\b/, Shirt],
  [/\b(knit(wear)?|punto|jers[eé]is|c[aá]rdigans?|sweaters?)\b/, Layers],
  [/\b(trousers|pantalones|jeans|denim|shorts|bermudas|leggings)\b/, Ruler],
  [/\b(coats?|abrigos?|jackets?|cazadoras?|blazers?|sudaderas?)\b/, Shirt],
  [/\b(shoes?|zapatos?|zapatillas|calzado|sneakers?|ayaqqabı)\b/, Footprints],
  [/\b(bags?|bolsos?|mochilas?|çanta)\b/, Briefcase],
  [/\b(perfum(e|es)?|fragrance|ətir)\b/, Flower2],
  [/\b(beauty|maquillaje|makeup|labios|ojos|rostro|gözəllik)\b/, Flower2],
  [/\b(jewel(le)?ry|bisuteria|bisutería|zərgər)\b/, Gem],
  [/\b(accessor(y|ies)|accesorios|aksesuar)\b/, Sparkles],
  [/\b(underwear|lenceria|lencería|calzoncillos|calcetines|socks|ropa interior)\b/, Shirt],
  [/\b(swim|baño|bano|bañadores|banadores)\b/, Droplets],
  [/\b(sport|deporte|running|trekking|gimnasio|athleisure|activewear|idman)\b/, Dumbbell],
  [/\b(sunglasses|gafas|eyewear|eynək)\b/, Sparkles],
  [/\b(belts?|cinturones?|corbatas?|ties?|gorr[ao]s?|caps?|bandanas?|kəmər)\b/, Sparkles],
  [/\b(watch(es)?|relojes?|saat)\b/, Cog],
  [/\b(mobile|phones?|smartphones?|telefon)\b/, Smartphone],
  [/\b(home|hogar|casa|ev)\b/, House],
  [/\b(pyjamas?|pijamas?|sleepwear)\b/, Bed],
];

/**
 * Kateqoriya üçün ikon seçir.
 * @param key  Daxili kateqoriyada slug, platforma kateqoriyasında externalId.
 * @param name Göstərilən ad (platforma kateqoriyaları üçün ingiliscə).
 */
/**
 * `nameEn` VACİBDİR: açar sözlər ingiliscədir, göstərilən `name` isə
 * istifadəçinin dilindədir (az/ru) — yalnız ona baxsaq hər şey fallback-ə düşür.
 */
export function getCategoryIcon(
  key: string,
  name?: string,
  nameEn?: string,
): LucideIcon {
  const bySlug = SLUG_ICONS[key.toLowerCase()];
  if (bySlug) return bySlug;

  const haystack = `${nameEn ?? ""} ${name ?? ""}`.toLowerCase();
  for (const [pattern, Icon] of KEYWORD_ICONS) {
    if (pattern.test(haystack)) return Icon;
  }
  return Tag;
}
