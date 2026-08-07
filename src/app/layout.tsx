import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { JsonLd, organizationLd, websiteLd } from "@/lib/seo/jsonld";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin", "cyrillic"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://e-commerce.ini.az"),
  title: {
    default: "E-Commerce — Qlobal trendləri kəşf et",
    template: "%s · E-Commerce",
  },
  description:
    "1688, Taobao və digər platformalardan məhsullar — ən yaxşı qiymətə, Azərbaycana çatdırılma.",
  applicationName: "E-Commerce",
  keywords: ["1688", "Taobao", "dropshipping", "onlayn alış", "Azərbaycan"],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: "E-Commerce",
    title: "E-Commerce — Qlobal trendləri kəşf et",
    description:
      "1688, Taobao və digər platformalardan məhsullar — ən yaxşı qiymətə.",
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
    title: "E-Commerce — Qlobal trendləri kəşf et",
    description: "1688, Taobao və digər platformalardan məhsullar.",
  },
  // iOS-da ana ekrandan açılanda brauzer paneli göstərilmir.
  appleWebApp: {
    capable: true,
    title: "E-Commerce",
    statusBarStyle: "default",
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  // Notch/home-indicator sahələrini əhatə et ki, safe-area dəyərləri işləsin.
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#7c3aed" },
    { media: "(prefers-color-scheme: dark)", color: "#1e1b4b" },
  ],
};

// Kök layout yalnız sənəd çərçivəsidir — mağaza və admin öz layout-larını gətirir.
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="az" className={`${inter.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">
        <JsonLd data={organizationLd()} />
        <JsonLd data={websiteLd()} />
        {children}
      </body>
    </html>
  );
}
