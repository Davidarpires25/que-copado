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
    // suppressHydrationWarning va aca por el script de abajo: le agrega la clase
    // `admin-dark` al <html> antes de que React hidrate, asi que el servidor
    // manda un elemento y el navegador encuentra otro. Eso disparaba
    // "Minified React error #418" en cada carga del admin en tema oscuro.
    //
    // Solo silencia el desajuste de este elemento —no se propaga a los hijos—
    // y es el patron documentado para el anti-FOUC de temas.
    <html lang="es" suppressHydrationWarning>
      <head>
        {/*
          Aplica el tema del admin antes del primer pintado.

          Sin esto la clase `admin-dark` la ponia un useEffect al montar el
          dashboard, o sea despues de que Next mostrara el loading.tsx de la
          ruta. Ese skeleton quedaba con los valores del tema claro aunque el
          usuario tuviera el oscuro, y ademas se veia un flash blanco en cada
          navegacion del admin.

          Va como script bloqueante en el head a proposito: cualquier otra cosa
          corre despues del primer frame, que es justo lo que hay que evitar.
        */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var s=localStorage.getItem('admin-theme');if(s&&JSON.parse(s).state.theme==='dark'){document.documentElement.classList.add('admin-dark')}}catch(e){}`,
          }}
        />
      </head>
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
