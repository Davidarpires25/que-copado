import { applyPaymentAmount, validateHybridPaymentSplits } from '../lib/utils/payment-split.ts'
type M = 'cash' | 'card' | 'transfer' | 'mercadopago'
const METHODS: M[] = ['cash', 'card', 'transfer', 'mercadopago']

let fallos = 0
const chequear = (nombre: string, cond: boolean, extra = '') => {
  if (!cond) { fallos++; console.log(`  ✗ ${nombre} ${extra}`) }
  else console.log(`  ✓ ${nombre}`)
}

console.log('\n— El caso de David —')
let p = applyPaymentAmount([], 'cash', 200, 38500)
p = applyPaymentAmount(p, 'transfer', 38300, 38500)
chequear('efectivo 200 + transferencia 38.300 = 38.500',
  JSON.stringify(p) === JSON.stringify([{method:'cash',amount:200},{method:'transfer',amount:38300}]),
  JSON.stringify(p))
chequear('el servidor lo acepta', validateHybridPaymentSplits(p, 38500) === null,
  String(validateHybridPaymentSplits(p, 38500)))

console.log('\n— Clic con el total ya cubierto (era el clic muerto) —')
let q = applyPaymentAmount([], 'cash', 38500, 38500)
q = applyPaymentAmount(q, 'transfer', 10000, 38500)
chequear('transferencia 10.000 entra y el efectivo cede a 28.500',
  q.find(x=>x.method==='transfer')?.amount === 10000 && q.find(x=>x.method==='cash')?.amount === 28500,
  JSON.stringify(q))
chequear('no inventa vuelto: cubierto == total',
  Math.abs(q.reduce((s,x)=>s+x.amount,0) - 38500) < 0.02, JSON.stringify(q))

console.log('\n— Editar el efectivo a mano si deja vuelto —')
let w = applyPaymentAmount([], 'transfer', 8500, 38500)
w = applyPaymentAmount(w, 'cash', 50000, 38500)
chequear('transferencia 8.500 + efectivo 50.000 -> el efectivo no se recorta',
  w.find(x=>x.method==='cash')?.amount === 50000, JSON.stringify(w))

console.log('\n— Un medio no efectivo se come todo el total —')
let r = applyPaymentAmount([], 'cash', 20000, 38500)
r = applyPaymentAmount(r, 'transfer', 38500, 38500)
chequear('el efectivo se saca (el servidor lo rechazaria)',
  !r.some(x=>x.method==='cash'), JSON.stringify(r))

console.log('\n— Tres medios no efectivo: el ultimo manda, el mas grande cede —')
let t = applyPaymentAmount([], 'card', 20000, 38500)
t = applyPaymentAmount(t, 'transfer', 18500, 38500)
t = applyPaymentAmount(t, 'mercadopago', 30000, 38500)
chequear('suma no-efectivo = total',
  Math.abs(t.filter(x=>x.method!=='cash').reduce((s,x)=>s+x.amount,0) - 38500) < 0.02, JSON.stringify(t))

console.log('\n— Vuelto: el efectivo si puede superar el total —')
const v = applyPaymentAmount([], 'cash', 50000, 38500)
chequear('efectivo 50.000 sobre total 38.500 se respeta', v[0].amount === 50000, JSON.stringify(v))

console.log('\n— Barrido aleatorio: 20.000 secuencias —')
let rechazos = 0, negativos = 0, ejemplo = ''
for (let i = 0; i < 20000; i++) {
  const total = [1, 100, 38500, 92500, 1234567][i % 5]
  let acc: {method:M;amount:number}[] = []
  const pasos = 1 + (i % 6)
  for (let k = 0; k < pasos; k++) {
    const m = METHODS[Math.floor(Math.random() * 4)]
    const amt = Math.floor(Math.random() * total * 1.6)
    acc = applyPaymentAmount(acc, m, amt, total) as {method:M;amount:number}[]
  }
  if (acc.some(x => x.amount < 0)) { negativos++; continue }
  const cubierto = acc.reduce((s, x) => s + x.amount, 0)
  // Solo importa lo que la pantalla dejaria confirmar: cuando cubre el total.
  if (acc.length > 1 && cubierto >= total - 0.02) {
    const err = validateHybridPaymentSplits(acc, total)
    if (err) { rechazos++; if (!ejemplo) ejemplo = `total=${total} ${JSON.stringify(acc)} -> ${err}` }
  }
}
chequear('ningun monto negativo', negativos === 0, `negativos=${negativos}`)
chequear('el servidor nunca rechaza lo que la UI deja confirmar', rechazos === 0, `rechazos=${rechazos} ej: ${ejemplo}`)

console.log(fallos === 0 ? '\nTODO OK\n' : `\n${fallos} FALLOS\n`)
process.exit(fallos === 0 ? 0 : 1)
