import type { Metadata, Viewport } from "next";
import { Geist_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { FloatingCartButton } from "@/components/floating-cart-button";
import "./globals.css";

// Sin preload: se usa a cuentagotas y no justifica una descarga anticipada en
// cada pagina. Se carga igual cuando algo la pide.
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  preload: false,
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

          Y se limita a /admin. Este layout envuelve tambien la tienda, y
          `admin-dark` en el <html> activa las variantes `dark:` de
          components/ui —button, badge, select, tabs—, que las dos mitades
          comparten. Sin el guard, alguien que dejo el panel en oscuro veia los
          botones de la tienda en oscuro sobre fondo claro.
        */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{if(location.pathname.indexOf('/admin')===0){var d=localStorage.getItem('admin-dark');if(d===null){var s=localStorage.getItem('admin-theme');d=s&&JSON.parse(s).state&&JSON.parse(s).state.theme==='dark'?'1':'0'}if(d==='1'){document.documentElement.classList.add('admin-dark')}}}catch(e){}`,
          }}
        />
      </head>
      <body
        className={`${geistMono.variable} antialiased`}
      >
        {children}
        <FloatingCartButton />
        <Toaster position="top-right" richColors duration={2000} />
      </body>
    </html>
  );
}
