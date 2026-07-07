
export const PAGINATION = {
  DEFAULT_LIMIT: 20,
  MAX_LIMIT:     100,
} as const;

// ─── App Info ─────────────────────────────────────────────────────────────────
export const APP_NAME    = "Prepaid Wallet POS";
export const APP_VERSION = "1.0.0";

export const STAFF_ROLES = {
  SUPER_ADMIN: "Super Admin",
  ADMIN:       "Admin",
  CASHIER:     "Cashier",
} as const;
export type StaffRole = (typeof STAFF_ROLES)[keyof typeof STAFF_ROLES];

export const RECORD_STATUS = {
  ACTIVE:   "Active",
  INACTIVE: "Inactive",
} as const;
export type RecordStatus = (typeof RECORD_STATUS)[keyof typeof RECORD_STATUS];

export const CARD_STATUS = {
  ACTIVE:   "Active",
  INACTIVE: "Inactive",
  REPLACED: "Replaced",
  EXPIRED:  "Expired",
} as const;
export type CardStatus = (typeof CARD_STATUS)[keyof typeof CARD_STATUS];

export const BILL_STATUS = {
  CONFIRMED: "Confirmed",
} as const;
export type BillStatus = (typeof BILL_STATUS)[keyof typeof BILL_STATUS];

export const PRODUCT_UNITS = {
  PIECE:   "Piece",
  KG:      "Kg",
  GRAM:    "Gram",
  LITRE:   "Litre",
  ML:      "Ml",
  PACKET:  "Packet",
  DOZEN:   "Dozen",
  CUP:     "Cup",
  PLATE:   "Plate",
  BOWL:    "Bowl",
  BOTTLE:  "Bottle",
  BOX:     "Box",
} as const;
export type ProductUnit = (typeof PRODUCT_UNITS)[keyof typeof PRODUCT_UNITS];

export const PAYMENT_MODES = {
  CASH:          "Cash",
  UPI:           "UPI",
  CARD:          "Card",
  BANK_TRANSFER: "Bank Transfer",
  NEFT:          "NEFT",
  CHEQUE:        "Cheque",
} as const;
export type PaymentMode = (typeof PAYMENT_MODES)[keyof typeof PAYMENT_MODES];

export const TRANSACTION_TYPES = {
  CREDIT: "Credit",
  DEBIT:  "Debit",
} as const;
export type TransactionType = (typeof TRANSACTION_TYPES)[keyof typeof TRANSACTION_TYPES];

export const STOCK_MOVEMENT_TYPES = {
  OPENING:           "Opening Stock",
  PURCHASE:          "Purchase",
  BILLING_DEDUCTION: "Billing Deduction",
  ADJUSTMENT_ADD:    "Adjustment Add",
  ADJUSTMENT_DEDUCT: "Adjustment Deduct",
  DAMAGE:            "Damage",
  RETURN:            "Return",
} as const;
export type StockMovementType = (typeof STOCK_MOVEMENT_TYPES)[keyof typeof STOCK_MOVEMENT_TYPES];