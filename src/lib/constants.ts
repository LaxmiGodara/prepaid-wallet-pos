
export const APP_NAME = "Prepaid Wallet POS";
export const APP_VERSION = "1.0.0";

// ─── Staff Roles ─────────────────────────────────────────────────────────────
// These are the three roles that exist in the system.
// "as const" locks the values so TypeScript treats them as exact strings,
// not just any string. This prevents accidental role name mismatches.

export const STAFF_ROLES = {
  SUPER_ADMIN: "Super Admin",
  ADMIN: "Admin",
  CASHIER: "Cashier",
} as const;

// StaffRole is a type derived from the STAFF_ROLES object.
// It can only be one of the three exact strings defined above.
// Usage: let userRole: StaffRole = "Admin";
export type StaffRole = (typeof STAFF_ROLES)[keyof typeof STAFF_ROLES];

// ─── Record Status ───────────────────────────────────────────────────────────
// Every record in the system (staff, member, card, wallet, product) uses
// Active or Inactive status. Defined here so the values are consistent.

export const RECORD_STATUS = {
  ACTIVE: "Active",
  INACTIVE: "Inactive",
} as const;

export type RecordStatus = (typeof RECORD_STATUS)[keyof typeof RECORD_STATUS];

// ─── Payment Modes ───────────────────────────────────────────────────────────
// Used in recharge and debit records to track how money was collected or paid.

export const PAYMENT_MODES = {
  CASH: "Cash",
  UPI: "UPI",
  CARD: "Card",
  BANK_TRANSFER: "Bank Transfer",
  OTHER: "Other",
} as const;

export type PaymentMode = (typeof PAYMENT_MODES)[keyof typeof PAYMENT_MODES];

// ─── Transaction Types ───────────────────────────────────────────────────────
// Wallet transactions are either Credit (money added) or Debit (money removed).

export const TRANSACTION_TYPES = {
  CREDIT: "Credit",
  DEBIT: "Debit",
} as const;

export type TransactionType =
  (typeof TRANSACTION_TYPES)[keyof typeof TRANSACTION_TYPES];

// ─── Stock Movement Types ────────────────────────────────────────────────────
// Every stock change has a reason. This tracks why stock changed.

export const STOCK_MOVEMENT_TYPES = {
  OPENING: "Opening",
  MANUAL_INCREASE: "Manual Increase",
  MANUAL_DECREASE: "Manual Decrease",
  BILLING_DEDUCTION: "Billing Deduction",
} as const;

export type StockMovementType =
  (typeof STOCK_MOVEMENT_TYPES)[keyof typeof STOCK_MOVEMENT_TYPES];

// ─── Product Units ───────────────────────────────────────────────────────────
// How a product is measured and sold.

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

export type ProductUnit = (typeof PRODUCT_UNITS)[keyof typeof PRODUCT_UNITS];

// ─── Bill Status ─────────────────────────────────────────────────────────────
// A bill is either confirmed (completed) or voided (cancelled after creation).

export const BILL_STATUS = {
  CONFIRMED: "Confirmed",
  VOIDED: "Voided",
} as const;

export type BillStatus = (typeof BILL_STATUS)[keyof typeof BILL_STATUS];

// ─── Pagination Defaults ─────────────────────────────────────────────────────

export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
} as const;