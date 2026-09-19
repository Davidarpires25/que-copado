function Barra({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-[var(--admin-skeleton)] ${className ?? ''}`} />
}

/**
 * La caja no pasa por AdminLayout: ocupa la pantalla entera, asi que tiene su
 * propio esqueleto. Es el unico.
 *
 * A proposito dibuja poco. El que habia imitaba la pantalla renglon por
 * renglon, incluida una banda de 48px abajo con la info del turno --que se
 * mudo adentro del POS hace rato-- y una tira de pedidos pendientes. Mostraba
 * secciones que ya no existen. Aca quedan las dos unicas cosas que el POS tuvo
 * siempre y va a seguir teniendo: la grilla de productos y el panel del pedido.
 */
export default function CajaLoading() {
  return (
    <div className="fixed inset-0 bg-[var(--admin-bg)] flex flex-col lg:pl-[72px]">
      {/* Banda de arriba */}
      <div className="shrink-0 h-12 border-b border-[var(--admin-border)] bg-[var(--admin-surface)] flex items-center gap-3 px-4">
        <Barra className="h-4 w-28" />
        <Barra className="h-4 w-20" />
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Grilla de productos */}
        <div className="flex-1 min-w-0 flex flex-col p-4 gap-3">
          <Barra className="h-10 w-full max-w-sm" />
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5 gap-2.5">
            {Array.from({ length: 12 }).map((_, i) => (
              <Barra key={i} className="h-[84px] rounded-xl" />
            ))}
          </div>
        </div>

        {/* Panel del pedido */}
        <div className="w-[380px] shrink-0 hidden md:flex md:flex-col border-l border-[var(--admin-border)] bg-[var(--admin-surface)] p-5 gap-3">
          <Barra className="h-4 w-28" />
          <div className="flex-1" />
          <Barra className="h-[52px] w-full" />
        </div>
      </div>
    </div>
  )
}
