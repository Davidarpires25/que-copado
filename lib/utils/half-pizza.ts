export function calcHalfPizzaPrice(
  method: string,
  markupPct: number | null,
  p1: { price: number; cost: number | null },
  p2: { price: number; cost: number | null },
  fixedPrice: number
): number {
  switch (method) {
    case 'max':
      return Math.max(p1.price, p2.price)
    case 'average':
      return Math.round((p1.price + p2.price) / 2)
    case 'cost_markup': {
      const avgCost = ((p1.cost ?? 0) + (p2.cost ?? 0)) / 2
      return Math.round(avgCost * (1 + (markupPct ?? 30) / 100))
    }
    case 'fixed':
    default:
      return fixedPrice
  }
}
