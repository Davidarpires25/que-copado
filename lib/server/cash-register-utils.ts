export function getSalesField(paymentMethod: string): string {
  switch (paymentMethod) {
    case 'cash':
      return 'total_cash_sales'
    case 'card':
      return 'total_card_sales'
    case 'transfer':
    case 'mercadopago':
      return 'total_transfer_sales'
    default:
      return 'total_cash_sales'
  }
}
