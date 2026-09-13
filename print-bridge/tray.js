// Icono en la bandeja del sistema.
//
// El bridge corria como una consola negra abierta todo el dia: cualquiera la
// cerraba sin querer, no habia forma de saber si estaba imprimiendo, y para
// cambiar la IP de la impresora habia que editar un .txt.
//
// REGLA DE ORO: la bandeja nunca puede tumbar la impresion. Todo lo de aca esta
// envuelto en try/catch y, si falla —no hay entorno grafico, el binario no esta,
// el SO no lo soporta—, el bridge sigue funcionando exactamente como antes y
// solo pierde el icono.

const fs = require('fs')
const os = require('os')
const path = require('path')

const ESTADOS = {
  conectando: { icono: 'conectando', texto: 'Conectando...' },
  listo: { icono: 'listo', texto: 'Listo — esperando tickets' },
  imprimiendo: { icono: 'imprimiendo', texto: 'Imprimiendo...' },
  error: { icono: 'error', texto: 'Problema con la impresora' },
}

/** `pkg` extrae los assets a un directorio virtual; fuera de pkg es el propio dir. */
function rutaIcono(nombre) {
  return path.join(__dirname, 'iconos', `${nombre}.ico`)
}

function leerIcono(nombre) {
  try {
    return fs.readFileSync(rutaIcono(nombre)).toString('base64')
  } catch {
    return ''
  }
}

class Bandeja {
  constructor() {
    this.debug = process.env.BRIDGE_DEBUG === '1'
    this.systray = null
    this.activa = false
    this.estado = 'conectando'
    this.detalle = ''
  }

  /**
   * @param {object} acciones
   * @param {() => Promise<void>} acciones.onProbar   imprimir un ticket de prueba
   * @param {() => void}          acciones.onVerLog   abrir el archivo de log
   * @param {() => void}          acciones.onSalir    cerrar el bridge
   * @param {string}              acciones.impresora  para mostrarla en el menu
   */
  iniciar({ onProbar, onVerLog, onSalir, impresora }) {
    // Ultima linea de defensa. systray2 lanza su binario con spawn y, si el
    // sistema lo rechaza (sin permisos, sin entorno grafico), el fallo llega
    // como excepcion no capturada y mata el proceso: el local deja de imprimir
    // por un icono. El filtro es deliberadamente estrecho —solo errores cuyo
    // rastro menciona a la bandeja— y cualquier otro se vuelve a lanzar.
    process.on('uncaughtException', (err) => {
      const rastro = `${err?.message ?? ''} ${err?.stack ?? ''}`
      if (/systray|tray_|node-systray/i.test(rastro)) {
        this.activa = false
        if (process.env.BRIDGE_DEBUG) console.error('[bandeja] deshabilitada:', err.message)
        return
      }
      throw err
    })

    try {
      const SysTray = require('systray2').default

      // npm puede bloquear los install scripts del paquete, y entonces el
      // binario de la bandeja queda sin permiso de ejecucion.
      if (process.platform !== 'win32') {
        try {
          const bin = path.join(
            __dirname, 'node_modules', 'systray2', 'traybin',
            process.platform === 'darwin' ? 'tray_darwin_release' : 'tray_linux_release'
          )
          if (fs.existsSync(bin)) fs.chmodSync(bin, 0o755)

          // `copyDir: true` no ejecuta ese binario sino una copia en la cache
          // del usuario, que hereda los permisos del original.
          const cache = path.join(os.homedir(), '.cache', 'node-systray')
          if (fs.existsSync(cache)) {
            for (const version of fs.readdirSync(cache)) {
              for (const f of fs.readdirSync(path.join(cache, version))) {
                if (f.startsWith('tray_')) fs.chmodSync(path.join(cache, version, f), 0o755)
              }
            }
          }
        } catch { /* si no se puede, el guard de arriba lo desactiva */ }
      }

      this.systray = new SysTray({
        menu: {
          icon: leerIcono('conectando'),
          isTemplateIcon: false,
          title: 'Que Copado',
          tooltip: 'Que Copado — Impresion',
          items: [
            { title: ESTADOS.conectando.texto, tooltip: '', enabled: false, checked: false },
            { title: `Impresora: ${impresora}`, tooltip: '', enabled: false, checked: false },
            SysTray.separator,
            // Los clicks del menu no llegan al proceso principal cuando esto
            // corre empaquetado con pkg (verificado en Windows 11: ni el click
            // ni un error aparecen por ningun lado). Se dejan como texto
            // informativo en vez de botones que no hacen nada, y las dos
            // acciones se ofrecen como probar-impresora.bat y ver-registro.bat.
            { title: 'Para probar: probar-impresora.bat', tooltip: '', enabled: false, checked: false },
            { title: 'Para ver el detalle: ver-registro.bat', tooltip: '', enabled: false, checked: false },
          ],
        },
        // SIEMPRE false, aunque estemos diagnosticando: systray2 elige el
        // binario con este flag —`tray_windows.exe` en debug contra
        // `tray_windows_release.exe` en normal— y el de debug no viene en el
        // paquete. Activarlo deshabilitaba la bandeja entera. Nuestro propio
        // diagnostico va por this.debug, que es independiente.
        debug: false,
        copyDir: true,
      })

      // systray2 lanza el binario en un proceso hijo: si ese proceso falla, el
      // error llega de forma asincrona y ningun try/catch lo atrapa. Sin este
      // handler, un problema de la bandeja mata el bridge y se deja de imprimir,
      // que es exactamente lo que no puede pasar.
      this.systray.onError((err) => {
        this.activa = false
        if (process.env.BRIDGE_DEBUG) {
          console.error('[bandeja] deshabilitada:', err?.message ?? String(err))
        }
      })

      this.systray.onExit(() => { this.activa = false })

      // Los clicks se resuelven por indice (seq_id) y no por titulo: el titulo
      // del primer item cambia con el estado, y comparar textos es fragil.
      // Orden del menu: 0 estado, 1 impresora, 2 separador, 3 probar,
      // 4 registro, 5 separador, 6 salir.
      const ACCIONES = { 3: () => onProbar(), 4: () => onVerLog(), 6: () => onSalir() }

      this.systray.onClick((accion) => {
        if (this.debug) console.error('[bandeja] click:', JSON.stringify(accion))
        try {
          const porIndice = ACCIONES[accion?.seq_id]
          if (porIndice) return void Promise.resolve(porIndice()).catch(() => {})

          // Respaldo por titulo, por si otra version reordena los indices.
          const titulo = accion?.item?.title ?? ''
          if (titulo.startsWith('Imprimir prueba')) Promise.resolve(onProbar()).catch(() => {})
          else if (titulo.startsWith('Ver registro')) onVerLog()
          else if (titulo.startsWith('Salir')) onSalir()
        } catch { /* un click no puede tumbar el bridge */ }
      })

      // Se asume viva apenas se crea. Antes esto esperaba a ready(), y si ese
      // handshake no completaba —lo que pasa en Windows con el binario
      // empaquetado— `activa` quedaba en false y NINGUNA actualizacion se
      // enviaba: el icono se quedaba con el color inicial para siempre.
      // Si en realidad no esta viva, sendAction falla y el try/catch lo absorbe.
      this.activa = true
      this.systray.ready()
        .then(() => { if (this.debug) console.error('[bandeja] handshake ok') })
        .catch((e) => { if (this.debug) console.error('[bandeja] ready() fallo:', e?.message) })
    } catch {
      // Sin bandeja: el bridge sigue igual, escribiendo en consola y en el log.
      this.activa = false
    }
  }

  /** Cambia icono y texto del menu. `detalle` se agrega entre parentesis. */
  actualizar(estado, detalle = '') {
    this.estado = estado
    this.detalle = detalle
    if (!this.activa || !this.systray) return

    const cfg = ESTADOS[estado] ?? ESTADOS.listo
    const texto = detalle ? `${cfg.texto} (${detalle})` : cfg.texto

    try {
      this.systray.sendAction({
        type: 'update-item',
        item: { title: texto, tooltip: '', checked: false, enabled: false },
        seq_id: 0,
      })
      const icono = leerIcono(cfg.icono)
      if (icono) {
        this.systray.sendAction({
          type: 'update-menu',
          menu: { icon: icono, isTemplateIcon: false, title: 'Que Copado', tooltip: `Que Copado — ${texto}` },
        })
      }
    } catch (e) {
      if (this.debug) console.error('[bandeja] sendAction fallo:', e?.message)
    }
  }

  cerrar() {
    try { this.systray?.kill(false) } catch { /* ya estaba cerrado */ }
  }
}

module.exports = { Bandeja }
