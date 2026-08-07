import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {

    // Xarici şəkil hostları — next/image YALNIZ burada icazə verilənləri açır,
    // əks halda 400 qaytarır. 1688/Taobao məhsul şəkilləri Alibaba CDN-lərindən
    // gəlir (cbu01/cbu02/img/gd1…), ona görə wildcard işlədilir.
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "**.alicdn.com" },
      { protocol: "http", hostname: "**.alicdn.com" },
      { protocol: "https", hostname: "**.taobaocdn.com" },
      { protocol: "https", hostname: "**.aliyuncs.com" },
      // Zara məhsul şəkilləri (static.zara.net). Host burada olmasa next/image
      // 400 qaytarır və şəkillər ümumiyyətlə açılmır.
      { protocol: "https", hostname: "**.zara.net" },
    ],

    // Alibaba CDN Çindədir: bir şəklin ilk optimizasiyası ~2.5s çəkir,
    // keşdən isə ~8ms. Ona görə optimizasiya nəticəsi uzun müddət saxlanılır.
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30 gün

    // Hər ölçü ayrıca optimizasiya deməkdir — məhsul kartı/qalereya üçün
    // lazım olan ölçülərlə məhdudlaşdırırıq ki, boş yerə variant yaranmasın.
    // Enlər Alibaba CDN-in ağ siyahısı ilə uzlaşdırılıb (bax: image-loader.ts) —
    // beləcə yuvarlaqlaşdırma nadir hallarda lazım olur və eyni fayl təkrar-təkrar
    // fərqli ölçüdə çəkilmir.
    deviceSizes: [640, 800, 960, 1200],
    imageSizes: [100, 200, 300, 400],
    qualities: [75],
  },
};

export default nextConfig;
