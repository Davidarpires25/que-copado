'use client'

import { useEffect, type ReactNode } from 'react'
import { Printer } from 'lucide-react'
import { NEGOCIO } from '@/lib/negocio'

/**
 * El armazón de las hojas A4 del panel: la planilla de conteo, el reporte de
 * costos y la ficha técnica (spec hojas-impresas).
 *
 * La planilla y el reporte traían cada uno este mismo bloque copiado —barra de
 * pantalla, página, encabezado, estilos de tabla, `@page`— con una diferencia
 * de `letter-spacing`; la ficha tenía otro, de marzo, y parecía de otro
 * sistema. Acá vive una vez. Cada hoja agrega lo suyo por `estilos`, que va
 * después de la base y la pisa.
 */

interface HojaImpresaProps {
  /** Lo que dice la barra de pantalla, que no sale en el papel. */
  barra: ReactNode
  /** Qué hoja es: "Planilla de conteo de stock", "Ficha técnica". */
  titulo: string
  /** Debajo del título: de qué es y cuándo se imprimió. */
  meta: ReactNode
  /** Reglas propias de la hoja. */
  estilos?: string
  /** Abre el diálogo de imprimir al cargar, como hacían las tres. */
  imprimirAlAbrir?: boolean
  children: ReactNode
}

const BASE = `
  body { background: #f1f5f9; margin: 0; }

  .screen-bar {
    display: flex; align-items: center; justify-content: space-between;
    gap: 16px; padding: 10px 16px; background: #1e293b; color: #e2e8f0;
    font: 13px/1.4 system-ui, sans-serif; position: sticky; top: 0; z-index: 10;
  }
  .screen-bar button {
    display: inline-flex; align-items: center; gap: 6px;
    background: #f5c518; color: #111; border: 0; border-radius: 6px;
    padding: 7px 14px; font-weight: 600; cursor: pointer;
  }

  .a4-page {
    width: 210mm; min-height: 297mm; margin: 16px auto; padding: 15mm 18mm;
    background: #fff; box-shadow: 0 2px 12px rgba(0,0,0,.14);
    font: 10pt/1.35 system-ui, sans-serif; color: #111;
  }

  .hdr { display: flex; justify-content: space-between; align-items: flex-end;
         border-bottom: 2px solid #333; padding-bottom: 7pt; margin-bottom: 12pt; }
  .hdr-brand { font-size: 15pt; font-weight: 700; letter-spacing: .2pt; }
  .hdr-sub { font-size: 8pt; color: #666; }
  .doc-title { font-size: 12pt; font-weight: 700; text-align: right; }
  .doc-meta { font-size: 8pt; color: #666; text-align: right; margin-top: 2pt; }

  /* Lo que se escribe a mano: quien, cuando, que paso. Sin esto, dos hojas de
     dias distintos son indistinguibles una vez que estan sobre el mostrador. */
  .quien { display: flex; gap: 22px; margin: 9pt 0 11pt; }
  .quien-campo { flex: 1; }
  .quien-label { font-size: 7.5pt; color: #777; margin-bottom: 2pt; }
  .quien-linea { border-bottom: 1px solid #555; height: 15pt; }

  /* Una seccion de la hoja: banda gris con el nombre. */
  .grupo { margin-bottom: 11pt; }
  .grupo-nombre {
    font-size: 9.5pt; font-weight: 700; text-transform: uppercase;
    letter-spacing: .5pt; background: #eef2f7; padding: 4pt 6pt;
    border-left: 3px solid #333;
    display: flex; justify-content: space-between; align-items: baseline;
  }
  .grupo-origen { font-size: 7.5pt; font-weight: 500; color: #666; letter-spacing: .3pt; }

  table { width: 100%; border-collapse: collapse; }
  th {
    font-size: 7.5pt; text-transform: uppercase; letter-spacing: .4pt;
    color: #555; text-align: left; border-bottom: 1px solid #999;
  }
  td { font-size: 9.5pt; }
  .num { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
  .suave { color: #666; }

  /* Totales al pie o arriba: cifra grande, rotulo chico. */
  .resumen { display: flex; gap: 22pt; font-size: 9pt; }
  .resumen strong { font-size: 11pt; display: block; }
  .resumen span { color: #666; font-size: 7.5pt; }

  .nota-pie { margin-top: 10pt; padding-top: 5pt; border-top: 1px solid #ccc;
              font-size: 7.5pt; color: #777; display: flex; justify-content: space-between; }

  @page { size: A4 portrait; margin: 15mm 18mm 18mm 18mm; }
  @media print {
    html, body { background: #fff !important; }
    .screen-bar { display: none !important; }
    .a4-page { margin: 0; padding: 0; box-shadow: none; width: 100%; min-height: unset; }
    .grupo-nombre { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    tr { page-break-inside: avoid; }
    thead { display: table-header-group; }
  }
`

export function HojaImpresa({ barra, titulo, meta, estilos = '', imprimirAlAbrir = true, children }: HojaImpresaProps) {
  useEffect(() => {
    if (!imprimirAlAbrir) return
    const t = setTimeout(() => window.print(), 600)
    return () => clearTimeout(t)
  }, [imprimirAlAbrir])

  return (
    <>
      <style>{BASE + estilos}</style>

      <div className="screen-bar">
        <span>{barra}</span>
        <button onClick={() => window.print()}>
          <Printer className="h-4 w-4" />
          Imprimir
        </button>
      </div>

      <div className="a4-page">
        <div className="hdr">
          <div>
            <div className="hdr-brand">{NEGOCIO.nombre}</div>
            <div className="hdr-sub">{NEGOCIO.rubro}</div>
          </div>
          <div>
            <div className="doc-title">{titulo}</div>
            <div className="doc-meta">{meta}</div>
          </div>
        </div>
        {children}
      </div>
    </>
  )
}

/** La fila para escribir a mano debajo del encabezado. */
export function FilaParaEscribir({ campos }: { campos: string[] }) {
  return (
    <div className="quien">
      {campos.map((campo) => (
        <div className="quien-campo" key={campo}>
          <div className="quien-label">{campo}</div>
          <div className="quien-linea" />
        </div>
      ))}
    </div>
  )
}
