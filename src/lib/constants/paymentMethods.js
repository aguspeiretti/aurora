export const PAYMENT_METHODS = {
  CASH: 'cash',
  TRANSFER: 'transfer',
  DEBIT: 'debit_card',
  CREDIT: 'credit_card',
  QR: 'qr',
  GIFT_CARD: 'gift_card',
  PACKAGE: 'package',
  OTHER: 'other',
}

export const PAYMENT_METHOD_LABELS = {
  cash: 'Efectivo',
  transfer: 'Transferencia',
  debit_card: 'Débito',
  credit_card: 'Crédito',
  qr: 'QR / Billetera virtual',
  gift_card: 'Gift Card',
  package: 'Paquete',
  other: 'Otro',
}

export const PAYMENT_METHOD_ICONS = {
  cash: '💵',
  transfer: '🏦',
  debit_card: '💳',
  credit_card: '💳',
  qr: '📱',
  gift_card: '🎁',
  package: '📦',
  other: '💰',
}

export const PAYMENT_STATUS = {
  PENDING: 'pending',
  PARTIAL: 'partial',
  PAID: 'paid',
  REFUNDED: 'refunded',
  CANCELLED: 'cancelled',
}

export const PAYMENT_STATUS_LABELS = {
  pending: 'Pendiente',
  partial: 'Pago parcial',
  paid: 'Pagado',
  refunded: 'Reembolsado',
  cancelled: 'Cancelado',
}
