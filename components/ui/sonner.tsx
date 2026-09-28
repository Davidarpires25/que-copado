"use client"

import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from "lucide-react"
import { useTheme } from "next-themes"
import { usePathname } from "next/navigation"
import { useThemeStore } from "@/lib/store/theme-store"
import { useHydrated } from "@/lib/hooks/use-hydrated"
import { Toaster as Sonner, type ToasterProps } from "sonner"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()
  // En el panel manda su propio tema, no el de la tienda: en el panel oscuro
  // los avisos salian claros. Hasta hidratar se usa el de la tienda, igual que
  // en el servidor, para no desencontrar el primer render.
  const temaDelPanel = useThemeStore((s) => s.theme)
  const enPanel = usePathname()?.startsWith("/admin") ?? false
  const hidratado = useHydrated()
  const tema = enPanel && hidratado ? temaDelPanel : theme

  return (
    <Sonner
      theme={tema as ToasterProps["theme"]}
      className="toaster group"
      icons={{
        success: <CircleCheckIcon className="size-4" />,
        info: <InfoIcon className="size-4" />,
        warning: <TriangleAlertIcon className="size-4" />,
        error: <OctagonXIcon className="size-4" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }
