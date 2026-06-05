export const APP_NAME = "Prepaid Wallet POS";
export const APP_VERSION = "1.0.0";

export const STAFF_ROLES = {
  SUPER_ADMIN: "Super Admin",
  ADMIN: "Admin",
  CASHIER: "Cashier",
} as const;

export type StaffRole = (typeof STAFF_ROLES)[keyof typeof STAFF_ROLES];

export const RECORD_STATUS = {
  ACTIVE: "Active",
  INACTIVE: "Inactive",
} as const;

export type RecordStatus = (typeof RECORD_STATUS)[keyof typeof RECORD_STATUS];

export const CARD_STATUS = {
  ACTIVE: "Active",
  INACTIVE: "Inactive",
  REPLACED: "Replaced",
  EXPIRED: "Expired",
} as const;

export type CardStatus = (typeof CARD_STATUS)[keyof typeof CARD_STATUS];

export const PAYMENT_MODES = {
  CASH: "Cash",
  UPI: "UPI",
  CARD: "Card",
  BANK_TRANSFER: "Bank Transfer",
  OTHER: "Other",
} as const;

export type PaymentMode =
  (typeof PAYMENT_MODES)[keyof typeof PAYMENT_MODES];

export const TRANSACTION_TYPES = {
  CREDIT: "Credit",
  DEBIT: "Debit",
} as const;

export type TransactionType =
  (typeof TRANSACTION_TYPES)[keyof typeof TRANSACTION_TYPES];

export const STOCK_MOVEMENT_TYPES = {
  OPENING: "Opening",
  MANUAL_INCREASE: "Manual Increase",
  MANUAL_DECREASE: "Manual Decrease",
  BILLING_DEDUCTION: "Billing Deduction",
} as const;

export type StockMovementType =
  (typeof STOCK_MOVEMENT_TYPES)[keyof typeof STOCK_MOVEMENT_TYPES];

export const PRODUCT_UNITS = {
  PIECE: "Piece",
  KG: "Kg",
  GRAM: "Gram",
  LITRE: "Litre",
  ML: "ML",
  BOTTLE: "Bottle",
  PACK: "Pack",
  BOX: "Box",
  DOZEN: "Dozen",
} as const;

export type ProductUnit =
  (typeof PRODUCT_UNITS)[keyof typeof PRODUCT_UNITS];

export const BILL_STATUS = {
  CONFIRMED: "Confirmed",
  VOIDED: "Voided",
} as const;

export type BillStatus = (typeof BILL_STATUS)[keyof typeof BILL_STATUS];

export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
} as const;