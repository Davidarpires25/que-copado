'use client'

import { SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement> & {
  size?: number | string
}

// Hamburguesa - Icono principal de la marca
export function BurgerIcon({ size = 24, ...props }: IconProps) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24">
    <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2">
    <path d="M5 12a2 2 0 0 1-2-2a9 7 0 0 1 18 0a2 2 0 0 1-2 2l-3.5 4.1c-.8 1-2.4 1.1-3.4.3L7 12"/>
    <path d="M11.7 16H4a2 2 0 0 1 0-4h16a2 2 0 0 1 0 4h-4.3M5 16a2 2 0 0 0-2 2c0 1.7 1.3 3 3 3h12c1.7 0 3-1.3 3-3a2 2 0 0 0-2-2"/></g></svg>
  )
}

// Papas fritas
export function FriesIcon({ size = 24, ...props }: IconProps) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><g fill="none" fillRule="evenodd"><path d="m12.594 23.258l-.012.002l-.071.035l-.02.004l-.014-.004l-.071-.036q-.016-.004-.024.006l-.004.01l-.017.428l.005.02l.01.013l.104.074l.015.004l.012-.004l.104-.074l.012-.016l.004-.017l-.017-.427q-.004-.016-.016-.018m.264-.113l-.014.002l-.184.093l-.01.01l-.003.011l.018.43l.005.012l.008.008l.201.092q.019.005.029-.008l.004-.014l-.034-.614q-.005-.019-.02-.022m-.715.002a.02.02 0 0 0-.027.006l-.006.014l-.034.614q.001.018.017.024l.015-.002l.201-.093l.01-.008l.003-.011l.018-.43l-.003-.012l-.01-.01z"/><path fill="currentColor" d="M14 2a2 2 0 0 1 2 2h1a2 2 0 0 1 2 2v3.003a2 2 0 0 1 1.885 2.196l-.71 7.1A3 3 0 0 1 17.19 21H6.81a3 3 0 0 1-2.985-2.701l-.71-7.1A2 2 0 0 1 5 9.003V5a2 2 0 0 1 2-2h1a2 2 0 0 1 2 2h1V4a2 2 0 0 1 2-2zm-7.24 9H5.105l.71 7.1l.019.115a1 1 0 0 0 .86.778L6.81 19h10.38l.117-.007a1 1 0 0 0 .86-.778l.018-.116l.71-7.099H17.24l-.019.01a.3.3 0 0 0-.081.088A6 6 0 0 1 12 14a6 6 0 0 1-5.14-2.902a.3.3 0 0 0-.08-.089zM14 4h-1v7.874l.262-.077q.26-.086.501-.205l.237-.127zm-3 3h-1v4.465l.237.127q.242.119.5.205l.263.077zm6-1h-1v3.425l.145-.101c.199-.128.423-.225.668-.278L17 9.014zM8 5H7v4.014c.319.038.607.15.855.31L8 9.425z"/></g></svg>
  )
}

// Bebida/Soda
export function SodaIcon({ size = 24, ...props }: IconProps) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 32 32"><path fill="currentColor" d="m23 10.414l3-3L24.586 6l-3.293 3.293A1 1 0 0 0 21 10v4h-7.074l1.143 16h8.862l1.143-16H23zM22.07 28h-5.14l-.856-12h6.852z"/><path fill="currentColor" d="M15 1h-5a1 1 0 0 0-1 1v7.37c-1.067.606-3 2.178-3 5.63v14a1 1 0 0 0 1 1h5v-2H8V15c0-3.754 3-4.28 3-4.28V3h3v7h2V2a1 1 0 0 0-1-1"/></svg>
  )
}

// Pizza
export function PizzaIcon({ size = 24, ...props }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      {/* Porción de pizza */}
      <path d="M12 2L3 20h18L12 2z" />
      {/* Pepperoni */}
      <circle cx="10" cy="12" r="1.5" fill="currentColor" />
      <circle cx="14" cy="14" r="1.5" fill="currentColor" />
      <circle cx="11" cy="17" r="1.5" fill="currentColor" />
      {/* Borde */}
      <path d="M12 2c0 0-2 1-2 2s2 2 4 2 2-1 2-2-2-2-2-2" />
    </svg>
  )
}

// Helado
export function IceCreamIcon({ size = 24, ...props }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      {/* Cono */}
      <path d="M8 13l4 9 4-9" />
      {/* Bolas de helado */}
      <circle cx="12" cy="9" r="4" />
      <circle cx="8" cy="7" r="3" />
      <circle cx="16" cy="7" r="3" />
      {/* Cereza */}
      <circle cx="12" cy="4" r="1.5" fill="currentColor" />
      <path d="M12 4v-2" />
    </svg>
  )
}

// Cerveza
export function BeerIcon({ size = 24, ...props }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      {/* Vaso */}
      <path d="M5 6h10v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6z" />
      {/* Espuma */}
      <path d="M5 6c0-1 0-2 2-2h6c2 0 2 1 2 2" />
      <path d="M5 8h10" />
      {/* Asa */}
      <path d="M15 8h2a2 2 0 012 2v4a2 2 0 01-2 2h-2" />
      {/* Burbujas */}
      <circle cx="8" cy="13" r="0.5" fill="currentColor" />
      <circle cx="11" cy="15" r="0.5" fill="currentColor" />
      <circle cx="9" cy="17" r="0.5" fill="currentColor" />
    </svg>
  )
}

// Bolsa de delivery
export function DeliveryBagIcon({ size = 24, ...props }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      {/* Bolsa */}
      <path d="M4 9h16l-1 12H5L4 9z" />
      {/* Asas */}
      <path d="M8 9V6a4 4 0 118 0v3" />
      {/* Corazón/Logo */}
      <path d="M12 14l-1.5-1.5a1.5 1.5 0 112.1-2.1l.4.4.4-.4a1.5 1.5 0 112.1 2.1L12 16" />
    </svg>
  )
}

// Moto de delivery
export function DeliveryBikeIcon({ size = 24, ...props }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      {/* Ruedas */}
      <circle cx="5" cy="18" r="3" />
      <circle cx="19" cy="18" r="3" />
      {/* Cuerpo de la moto */}
      <path d="M5 18h3l2-4h4l1 4h4" />
      <path d="M10 14l2-5h3l1 2" />
      {/* Caja de delivery */}
      <rect x="14" y="6" width="5" height="5" rx="1" />
      {/* Manubrio */}
      <path d="M8 9l2 0" />
    </svg>
  )
}

// WhatsApp
export function WhatsAppIcon({ size = 24, ...props }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      {...props}
    >
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  )
}

// Fuego/Hot
export function FireIcon({ size = 24, ...props }: IconProps) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 16 16"><path fill="#000000" d="M8 16c3.314 0 6-2 6-5.5c0-1.5-.5-4-2.5-6c.25 1.5-1.25 2-1.25 2C11 4 9 .5 6 0c.357 2 .5 4-2 6c-1.25 1-2 2.729-2 4.5C2 14 4.686 16 8 16m0-1c-1.657 0-3-1-3-2.75c0-.75.25-2 1.25-3C6.125 10 7 10.5 7 10.5c-.375-1.25.5-3.25 2-3.5c-.179 1-.25 2 1 3c.625.5 1 1.364 1 2.25C11 14 9.657 15 8 15"/></svg>
  )
}

// Sandwich/Lomito
export function SandwichIcon({ size = 24, ...props }: IconProps) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"><path d="m2.37 11.223l8.372-6.777a2 2 0 0 1 2.516 0l8.371 6.777M21 15a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1h-5.25M3 15a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1h9"/><path d="m6.67 15l6.13 4.6a2 2 0 0 0 2.8-.4l3.15-4.2"/><rect width="20" height="4" x="2" y="11" rx="1"/></g></svg>

  )
}

// Ensalada
export function SaladIcon({ size = 24, ...props }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      {/* Bowl */}
      <path d="M4 12h16c0 5-3.5 9-8 9s-8-4-8-9z" />
      {/* Hojas de lechuga */}
      <path d="M8 12c0-3 2-6 4-6s4 3 4 6" />
      <path d="M6 12c0-2 1-4 3-5" />
      <path d="M18 12c0-2-1-4-3-5" />
      {/* Tomate */}
      <circle cx="10" cy="9" r="1.5" fill="currentColor" />
      <circle cx="15" cy="10" r="1" fill="currentColor" />
    </svg>
  )
}

// Estrella para ratings
export function StarFilledIcon({ size = 24, ...props }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      stroke="currentColor"
      strokeWidth="1"
      {...props}
    >
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  )

  
}

export function ComboIcon({ size = 24, ...props }: IconProps) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" stroke="currentColor" d="M18.06 23h1.66c.84 0 1.53-.65 1.63-1.47L23 5.05h-5V1h-1.97v4.05h-4.97l.3 2.34c1.71.47 3.31 1.32 4.27 2.26c1.44 1.42 2.43 2.89 2.43 5.29zM1 22v-1h15.03v1c0 .54-.45 1-1.03 1H2c-.55 0-1-.46-1-1m15.03-7C16.03 7 1 7 1 15zM1 17h15v2H1z"/></svg>
  
  )

}


export function LomosIcon({ size = 24, ...props }: IconProps) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 15 15"><path fill="currentColor" d="M8.5 9.5L10 11l1.5-1.5H14v.5c0 1.11-.89 2-2 2H3a2 2 0 0 1-2-2v-.5zM2.5 8c.28 0 .5.22.5.5s-.22.5-.5.5h-1c-.28 0-.5-.22-.5-.5s.22-.5.5-.5zm4 0h-2c-.28 0-.5.22-.5.5s.22.5.5.5h2c.28 0 .5-.22.5-.5S6.78 8 6.5 8m7 0h-2c-.28 0-.5.22-.5.5s.22.5.5.5h2c.28 0 .5-.22.5-.5s-.22-.5-.5-.5m-4 0h-1c-.28 0-.5.22-.5.5s.22.5.5.5h1c.28 0 .5-.22.5-.5S9.78 8 9.5 8m-.18-4l-.75 1.24c-.14.24-.06.55.17.69c.24.14.55.06.69-.17L10.5 4H12c1.11 0 2 .89 2 2v1.5H1V6a2 2 0 0 1 2-2h1.32l-.75 1.24c-.14.24-.06.55.17.69c.24.14.55.06.69-.17L5.5 4h1.32l-.75 1.24c-.14.24-.06.55.17.69c.24.14.55.06.69-.17L8 4z"/></svg>
    
  )

}
