import type { Metadata, Viewport } from "next";
import { Rubik, Geist_Mono } from "next/font/google";
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

export const metadata: Metadata = {
  title: "Que Copado - Las mejores hamburguesas",
  description: "Las mejores hamburguesas de la zona. Pedí ahora por WhatsApp!",
  keywords: ["hamburguesas", "delivery", "comida", "fast food"],
  openGraph: {
    title: "Que Copado - Las mejores hamburguesas",
    description: "Las mejores hamburguesas de la zona. Pedí ahora por WhatsApp!",
    type: "website",
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
        className={`${rubik.variable} ${geistMono.variable} antialiased`}
      >
        {children}
        <FloatingCartButton />
        <Toaster position="top-right" richColors duration={2000} />
      </body>
    </html>
  );
}
