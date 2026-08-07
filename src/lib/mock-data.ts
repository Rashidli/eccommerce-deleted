import {
  Shirt,
  User2,
  Footprints,
  Briefcase,
  Sparkles,
  Flower2,
  Cpu,
  Home,
  Dumbbell,
  Baby,
  Tag,
  Globe2,
  BadgePercent,
  Truck,
  Headphones,
  ShoppingBag,
  ShoppingCart,
  LayoutGrid,
  LayoutDashboard,
  Percent,
  Heart,
  HelpCircle,
  Settings,
  LucideIcon,
} from "lucide-react";

// Types
export interface NavItem {
  icon: LucideIcon;
  key: CatKey;
  href?: string;
  active?: boolean;
}

import type { dict } from "@/lib/i18n";

// Naviqasiya mətnləri i18n lüğətindən gəlir (t.nav[key]) — 3 dildə
export type NavKey = keyof (typeof dict)["az"]["nav"];
// Kateqoriya adları da i18n-dən gəlir (t.cat[key]) — 3 dildə
export type CatKey = keyof (typeof dict)["az"]["cat"];

// Header (üst menyu) linki
export interface HeaderNavItem {
  key: NavKey;
  href: string;
  active?: boolean;
  hasDropdown?: boolean;
}

// Mobil alt menyu elementi
export interface BottomNavItem {
  key: NavKey;
  href: string;
  icon: LucideIcon;
}

export interface Category {
  key: CatKey;
  img: string;
  href?: string;
}

export interface Product {
  id: string;
  name: string;
  price: string;
  originalPrice?: string;
  rating: number;
  reviewCount?: number;
  brand: string;
  img: string;
  images?: string[];
  description?: string;
  sizes?: string[];
  colors?: { name: string; value: string }[];
  category?: string;
  inStock?: boolean;
}

// Perk mətnləri i18n-dən (t.perks[key])
export type PerkKey = keyof (typeof dict)["az"]["perks"];
export interface Perk {
  icon: LucideIcon;
  key: PerkKey;
}

// Mətnlər i18n-dədir (t.promo[key]) — burada yalnız görünüş və link saxlanır.
export type PromoKey = "summerSale" | "newArrivals" | "clearance";

export interface PromoTile {
  key: PromoKey;
  tint: string;
  img: string;
  href: string;
}

// Üst menyu (header) linkləri — label i18n-dən (t.nav[key])
export const headerNav: HeaderNavItem[] = [
  { key: "shop", href: "/products", active: true },
  { key: "categories", href: "/categories", hasDropdown: true },
  { key: "deals", href: "/deals" },
  { key: "newArrivals", href: "/new" },
  { key: "brands", href: "/brands" },
];

// Mobil alt menyu — əsas
// Mobil alt menyu — tətbiqdəki kimi: ana səhifə · kateqoriya · səbət · profil
export const bottomNavItems: BottomNavItem[] = [
  { key: "home", href: "/", icon: Home },
  { key: "categories", href: "/categories", icon: LayoutGrid },
  { key: "cart", href: "/cart", icon: ShoppingCart },
  { key: "account", href: "/account", icon: User2 },
];

// Mobil alt menyu — "Daha çox" bölməsi
export const bottomNavMore: BottomNavItem[] = [
  { key: "shop", href: "/products", icon: ShoppingBag },
  { key: "deals", href: "/deals", icon: Percent },
  { key: "new", href: "/new", icon: Sparkles },
  { key: "brands", href: "/brands", icon: Tag },
  { key: "wishlist", href: "/wishlist", icon: Heart },
  { key: "panel", href: "/panel", icon: LayoutDashboard },
  { key: "help", href: "/help", icon: HelpCircle },
  { key: "settings", href: "/settings", icon: Settings },
];

// Yan naviqasiya — adlar i18n-dən (t.cat[key])
export const sideNavItems: NavItem[] = [
  { icon: Shirt, key: "women", href: "/category/women" },
  { icon: User2, key: "men", href: "/category/men" },
  { icon: Footprints, key: "shoes", href: "/category/shoes" },
  { icon: Briefcase, key: "bags", href: "/category/bags" },
  { icon: Sparkles, key: "accessories", href: "/category/accessories" },
  { icon: Flower2, key: "beauty", href: "/category/beauty" },
  { icon: Cpu, key: "tech", href: "/category/tech" },
  { icon: Home, key: "home", href: "/category/home" },
  { icon: Dumbbell, key: "sports", href: "/category/sports" },
  { icon: Baby, key: "kids", href: "/category/kids" },
  { icon: Tag, key: "sale", href: "/sale", active: true },
];

// Categories Data
export const categories: Category[] = [
  { key: "women", img: "/assets/cat-women.png", href: "/category/women" },
  { key: "men", img: "/assets/cat-men.png", href: "/category/men" },
  { key: "shoes", img: "/assets/cat-shoes.png", href: "/category/shoes" },
  { key: "bags", img: "/assets/cat-bags.png", href: "/category/bags" },
  { key: "accessories", img: "/assets/cat-accessories.png", href: "/category/accessories" },
  { key: "beauty", img: "/assets/cat-beauty.png", href: "/category/beauty" },
  { key: "tech", img: "/assets/cat-tech.png", href: "/category/tech" },
  { key: "home", img: "/assets/cat-home.png", href: "/category/home" },
];

// Products Data
// TODO(phase-2): products/category/deals/sale/new/products[id] DB-yə keçəndə bu iki
// siyahı (və allProducts/findProduct) silinəcək — hazırda home DB-dəndir, bunlar hələ digər
// səhifələr və seed tərəfindən istifadə olunur.
export const trendingProducts: Product[] = [
  {
    id: "1",
    name: "Denim Jacket",
    price: "$54.90",
    originalPrice: "$79.90",
    rating: 4.8,
    reviewCount: 128,
    brand: "Zara",
    img: "https://images.unsplash.com/photo-1551028719-00167b16eac5?w=500&h=600&fit=crop",
    images: [
      "https://images.unsplash.com/photo-1551028719-00167b16eac5?w=500&h=600&fit=crop",
      "https://images.unsplash.com/photo-1576995853123-5a10305d93c0?w=500&h=600&fit=crop",
      "https://images.unsplash.com/photo-1548126032-079a0fb0099d?w=500&h=600&fit=crop",
    ],
    description: "Classic denim jacket with a modern fit. Made from premium cotton denim with slight stretch for comfort. Features traditional button closure, chest pockets, and adjustable waist tabs.",
    sizes: ["XS", "S", "M", "L", "XL"],
    colors: [
      { name: "Blue", value: "#3b82f6" },
      { name: "Black", value: "#1f2937" },
      { name: "Light Blue", value: "#93c5fd" },
    ],
    category: "Women",
    inStock: true,
  },
  {
    id: "2",
    name: "Sport Sneakers",
    price: "$59.00",
    originalPrice: "$89.00",
    rating: 4.9,
    reviewCount: 256,
    brand: "1688",
    img: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500&h=600&fit=crop",
    images: [
      "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500&h=600&fit=crop",
      "https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=500&h=600&fit=crop",
      "https://images.unsplash.com/photo-1600185365926-3a2ce3cdb9eb?w=500&h=600&fit=crop",
    ],
    description: "Lightweight sport sneakers designed for maximum comfort and performance. Breathable mesh upper with cushioned sole for all-day wear.",
    sizes: ["36", "37", "38", "39", "40", "41", "42", "43", "44"],
    colors: [
      { name: "White", value: "#ffffff" },
      { name: "Black", value: "#1f2937" },
      { name: "Red", value: "#ef4444" },
    ],
    category: "Shoes",
    inStock: true,
  },
  {
    id: "3",
    name: "Cotton Tee",
    price: "$19.90",
    rating: 4.7,
    reviewCount: 89,
    brand: "Uniqlo",
    img: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=500&h=600&fit=crop",
    images: [
      "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=500&h=600&fit=crop",
      "https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=500&h=600&fit=crop",
      "https://images.unsplash.com/photo-1618354691373-d851c5c3a990?w=500&h=600&fit=crop",
    ],
    description: "Essential cotton t-shirt with a relaxed fit. Made from 100% organic cotton for a soft, comfortable feel. Perfect for everyday wear.",
    sizes: ["XS", "S", "M", "L", "XL", "XXL"],
    colors: [
      { name: "White", value: "#ffffff" },
      { name: "Black", value: "#1f2937" },
      { name: "Gray", value: "#6b7280" },
      { name: "Navy", value: "#1e3a5f" },
    ],
    category: "Men",
    inStock: true,
  },
  {
    id: "4",
    name: "Chino Pants",
    price: "$39.90",
    originalPrice: "$54.90",
    rating: 4.6,
    reviewCount: 67,
    brand: "1688",
    img: "https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=500&h=600&fit=crop",
    images: [
      "https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=500&h=600&fit=crop",
      "https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=500&h=600&fit=crop",
      "https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=500&h=600&fit=crop",
    ],
    description: "Classic chino pants with a slim fit. Made from stretch cotton twill for comfort and mobility. Features a zip fly and button closure.",
    sizes: ["28", "30", "32", "34", "36", "38"],
    colors: [
      { name: "Khaki", value: "#c4a574" },
      { name: "Navy", value: "#1e3a5f" },
      { name: "Black", value: "#1f2937" },
    ],
    category: "Men",
    inStock: true,
  },
  {
    id: "5",
    name: "Knit Sweater",
    price: "$44.90",
    rating: 4.8,
    reviewCount: 112,
    brand: "Taobao",
    img: "https://images.unsplash.com/photo-1576871337632-b9aef4c17ab9?w=500&h=600&fit=crop",
    images: [
      "https://images.unsplash.com/photo-1576871337632-b9aef4c17ab9?w=500&h=600&fit=crop",
      "https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?w=500&h=600&fit=crop",
      "https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=500&h=600&fit=crop",
    ],
    description: "Cozy knit sweater perfect for layering. Made from a soft wool blend with ribbed cuffs and hem. Features a classic crew neck design.",
    sizes: ["S", "M", "L", "XL"],
    colors: [
      { name: "Cream", value: "#fef3c7" },
      { name: "Gray", value: "#6b7280" },
      { name: "Brown", value: "#92400e" },
    ],
    category: "Women",
    inStock: true,
  },
  { id: "6", name: "Leather Bag", price: "$89.00", rating: 4.7, brand: "Zara", img: "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=500&h=600&fit=crop", category: "Bags" },
  { id: "7", name: "Summer Dress", price: "$65.00", rating: 4.9, brand: "1688", img: "https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=500&h=600&fit=crop", category: "Women" },
  { id: "8", name: "Polo Shirt", price: "$29.90", rating: 4.6, brand: "Uniqlo", img: "https://images.unsplash.com/photo-1586363104862-3a5e2ab60d99?w=500&h=600&fit=crop", category: "Men" },
  { id: "9", name: "High Heels", price: "$79.90", rating: 4.5, brand: "1688", img: "https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=500&h=600&fit=crop", category: "Shoes" },
  { id: "10", name: "Wool Coat", price: "$129.00", rating: 4.9, brand: "Taobao", img: "https://images.unsplash.com/photo-1539533018447-63fcce2678e3?w=500&h=600&fit=crop", category: "Women" },
];

// New Arrivals Products Data
export const newArrivalsProducts: Product[] = [
  {
    id: "11",
    name: "Linen Blazer",
    price: "$89.90",
    rating: 4.8,
    reviewCount: 76,
    brand: "Zara",
    img: "https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=500&h=600&fit=crop",
    category: "Women",
    inStock: true,
  },
  {
    id: "12",
    name: "Cargo Pants",
    price: "$49.90",
    originalPrice: "$69.90",
    rating: 4.7,
    reviewCount: 134,
    brand: "1688",
    img: "https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=500&h=600&fit=crop",
    category: "Men",
    inStock: true,
  },
  {
    id: "13",
    name: "Floral Maxi Dress",
    price: "$75.00",
    rating: 4.9,
    reviewCount: 203,
    brand: "Taobao",
    img: "https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=500&h=600&fit=crop",
    category: "Women",
    inStock: true,
  },
  {
    id: "14",
    name: "Leather Boots",
    price: "$119.00",
    originalPrice: "$159.00",
    rating: 4.8,
    reviewCount: 89,
    brand: "Zara",
    img: "https://images.unsplash.com/photo-1608256246200-53e635b5b65f?w=500&h=600&fit=crop",
    category: "Shoes",
    inStock: true,
  },
  {
    id: "15",
    name: "Crossbody Bag",
    price: "$65.00",
    rating: 4.6,
    reviewCount: 156,
    brand: "1688",
    img: "https://images.unsplash.com/photo-1591561954557-26941169b49e?w=500&h=600&fit=crop",
    category: "Bags",
    inStock: true,
  },
  {
    id: "16",
    name: "Oversized Hoodie",
    price: "$45.90",
    rating: 4.9,
    reviewCount: 312,
    brand: "Uniqlo",
    img: "https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=500&h=600&fit=crop",
    category: "Men",
    inStock: true,
  },
  {
    id: "17",
    name: "Silk Scarf",
    price: "$29.90",
    rating: 4.7,
    reviewCount: 64,
    brand: "Taobao",
    img: "https://images.unsplash.com/photo-1601924994987-69e26d50dc26?w=500&h=600&fit=crop",
    category: "Accessories",
    inStock: true,
  },
  {
    id: "18",
    name: "Chelsea Boots",
    price: "$99.00",
    originalPrice: "$139.00",
    rating: 4.8,
    reviewCount: 148,
    brand: "1688",
    img: "https://images.unsplash.com/photo-1638247025967-b4e38f787b76?w=500&h=600&fit=crop",
    category: "Shoes",
    inStock: true,
  },
  {
    id: "19",
    name: "Pleated Skirt",
    price: "$39.90",
    rating: 4.6,
    reviewCount: 92,
    brand: "Zara",
    img: "https://images.unsplash.com/photo-1583496661160-fb5886a0aaaa?w=500&h=600&fit=crop",
    category: "Women",
    inStock: true,
  },
  {
    id: "20",
    name: "Bucket Hat",
    price: "$19.90",
    rating: 4.5,
    reviewCount: 71,
    brand: "1688",
    img: "https://images.unsplash.com/photo-1576871337622-98d48d1cf531?w=500&h=600&fit=crop",
    category: "Accessories",
    inStock: true,
  },
  {
    id: "21",
    name: "Puffer Vest",
    price: "$69.90",
    originalPrice: "$89.90",
    rating: 4.8,
    reviewCount: 187,
    brand: "Taobao",
    img: "https://images.unsplash.com/photo-1548883354-94bcfe321cbb?w=500&h=600&fit=crop",
    category: "Men",
    inStock: true,
  },
];

// Kataloqdakı bütün məhsullar — id ilə axtaranda hər iki siyahını nəzərə almaq lazımdır,
// yoxsa yalnız bir siyahıdakı məhsullar tapılır.
export const allProducts: Product[] = [
  ...trendingProducts,
  ...newArrivalsProducts,
];

export function findProduct(id: string): Product | undefined {
  return allProducts.find((p) => p.id === id);
}

// Perks Data
export const perks: Perk[] = [
  { icon: Globe2, key: "global" },
  { icon: BadgePercent, key: "prices" },
  { icon: Truck, key: "shipping" },
  { icon: Headphones, key: "support" },
];

// Promo Tiles Data
export const promoTiles: PromoTile[] = [
  {
    key: "summerSale",
    tint: "bg-[radial-gradient(ellipse_at_center,#ffffff_0%,#fff7ed_25%,#ffedd5_50%,#fed7aa_75%,#fdba74_100%)]",
    img: "/assets/promo-summer.png",
    href: "/sale",
  },
  {
    key: "newArrivals",
    tint: "bg-[radial-gradient(ellipse_at_center,#ffffff_0%,#f0f9ff_25%,#e0f2fe_50%,#c7d2fe_75%,#a5b4fc_100%)]",
    img: "/assets/promo-new.png",
    href: "/new",
  },
  {
    key: "clearance",
    tint: "bg-[radial-gradient(ellipse_at_center,#ffffff_0%,#faf5ff_25%,#f3e8ff_50%,#e9d5ff_75%,#d8b4fe_100%)]",
    img: "/assets/promo-clearance.png",
    href: "/deals",
  },
];
