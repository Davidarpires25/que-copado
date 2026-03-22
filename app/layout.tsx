import type { Metadata, Viewport } from "next";
import { Rubik, Geist_Mono, Inter } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { FloatingCartButton } from "@/components/floating-cart-button";
import "./globals.css";

const rubik = Rubik({
  variable: "--font-rubik",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Inter: fuente para el panel de administración.
// Diseñada para alta densidad de información, con figuras tabulares
// nativas — ideal para dashboards y POS con columnas de precios.
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'),
  title: "Que Copado - Las mejores hamburguesas",
  description: "Las mejores hamburguesas de la zona. Pedí ahora por WhatsApp!",
  keywords: ["hamburguesas", "delivery", "comida", "fast food"],
  icons: {
    icon: "/logo.svg",
    apple: "/logo.svg",
  },
  openGraph: {
    title: "Que Copado - Las mejores hamburguesas",
    description: "Las mejores hamburguesas de la zona. Pedí ahora por WhatsApp!",
    type: "website",
    images: ["/logo.svg"],
  },
};

export const viewport: Viewport = {
  themeColor: "#FF6B35",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body
        className={`${rubik.variable} ${geistMono.variable} ${inter.variable} antialiased`}
      >
        {children}
        <FloatingCartButton />
        <Toaster position="top-right" richColors duration={2000} />
      </body>
    </html>
  );
}
