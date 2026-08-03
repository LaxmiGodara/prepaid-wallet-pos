import bcrypt from "bcryptjs";
import mongoose from "mongoose";

import {
  BILL_STATUS,
  CARD_STATUS,
  PAYMENT_MODES,
  PRODUCT_UNITS,
  RECORD_STATUS,
  STAFF_ROLES,
  TRANSACTION_TYPES,
} from "@/lib/constants";
import {
  DEMO_USER_FULL_NAME,
  DEMO_USER_PASSWORD,
  DEMO_USER_USERNAME,
} from "@/lib/demo-account";
import {
  Bill,
  Card,
  Debit,
  Member,
  Product,
  Recharge,
  Staff,
  Stock,
  Transaction,
  Wallet,
} from "@/lib/models";

// ─── IMPORTANT ───────────────────────────────────────────────────────────────
// Every model call in this file goes through the demo-aware proxies in
// src/lib/models/index.ts. That means this function MUST be called from
// inside a request that has already entered demo context (see
// src/lib/demo-context.ts) — otherwise it would silently seed *production*.
// Both call sites (the demo-login route's auto-seed fallback, and the
// standalone POST /api/dev/seed-demo route) do this before calling in.

const FIRST_NAMES = [
  "Aarav", "Vivaan", "Aditya", "Vihaan", "Arjun", "Sai", "Reyansh", "Ayaan",
  "Krishna", "Ishaan", "Kabir", "Rohan", "Aryan", "Dhruv", "Karthik",
  "Ananya", "Diya", "Saanvi", "Aadhya", "Kiara", "Myra", "Pari", "Anika",
  "Ira", "Navya", "Riya", "Sneha", "Meera", "Lakshmi", "Priya", "Divya",
  "Kavya", "Pooja", "Nithya", "Deepika", "Rahul", "Vikram", "Suresh",
  "Ramesh", "Manoj", "Sanjay", "Ajay", "Vijay", "Anand", "Prakash",
  "Gopal", "Murugan", "Karthikeyan", "Selvam", "Balaji", "Senthil",
  "Muthu", "Ranjith", "Bharath", "Dinesh", "Ganesh", "Harish", "Jagan",
  "Kumar", "Lokesh", "Naveen", "Pandi",
];

const LAST_NAMES = [
  "Sharma", "Verma", "Iyer", "Nair", "Reddy", "Rao", "Gupta", "Menon",
  "Pillai", "Krishnan", "Subramaniam", "Chandran", "Raman", "Natarajan",
  "Venkatesh", "Kannan", "Murugesan", "Shanmugam", "Elangovan", "Vasan",
  "Patel", "Shah", "Mehta", "Joshi", "Desai", "Agarwal", "Bansal",
  "Chopra", "Kapoor", "Malhotra", "Singh", "Kumar", "Das", "Bose",
  "Chatterjee", "Banerjee", "Mukherjee", "Ghosh", "Nayak", "Panda",
];

const PRODUCTS: Array<{
  name: string;
  code: string;
  price: number;
  unit: string;
  openingQty: number;
}> = [
  { name: "Amul Toned Milk 500ml", code: "MILK500", price: 28, unit: PRODUCT_UNITS.PACKET, openingQty: 240 },
  { name: "Britannia Brown Bread", code: "BRDBRN", price: 45, unit: PRODUCT_UNITS.PIECE, openingQty: 60 },
  { name: "Tata Salt 1kg", code: "SALT1KG", price: 25, unit: PRODUCT_UNITS.KG, openingQty: 150 },
  { name: "Aashirvaad Atta 5kg", code: "ATTA5KG", price: 245, unit: PRODUCT_UNITS.KG, openingQty: 80 },
  { name: "Sona Masoori Rice 5kg", code: "RICE5KG", price: 320, unit: PRODUCT_UNITS.KG, openingQty: 90 },
  { name: "Fortune Sunflower Oil 1L", code: "OIL1L", price: 165, unit: PRODUCT_UNITS.LITRE, openingQty: 100 },
  { name: "Filter Coffee Powder 200g", code: "COFFEE200", price: 95, unit: PRODUCT_UNITS.PACKET, openingQty: 70 },
  { name: "Red Label Tea 250g", code: "TEA250", price: 78, unit: PRODUCT_UNITS.PACKET, openingQty: 85 },
  { name: "Parle-G Biscuit Pack", code: "BISCPG", price: 10, unit: PRODUCT_UNITS.PACKET, openingQty: 400 },
  { name: "Maggi Noodles 70g", code: "MAGGI70", price: 14, unit: PRODUCT_UNITS.PACKET, openingQty: 300 },
  { name: "Idli/Dosa Batter 1kg", code: "BATTER1KG", price: 60, unit: PRODUCT_UNITS.KG, openingQty: 45 },
  { name: "Curd Cup 200g", code: "CURD200", price: 22, unit: PRODUCT_UNITS.CUP, openingQty: 120 },
  { name: "Bananas (Nendran)", code: "BANANA1KG", price: 55, unit: PRODUCT_UNITS.DOZEN, openingQty: 8 },
  { name: "Filter Water Bottle 1L", code: "WATER1L", price: 20, unit: PRODUCT_UNITS.BOTTLE, openingQty: 200 },
  { name: "Onions 1kg", code: "ONION1KG", price: 38, unit: PRODUCT_UNITS.KG, openingQty: 110 },
  { name: "Vegetable Combo Box", code: "VEGBOX", price: 149, unit: PRODUCT_UNITS.BOX, openingQty: 25 },
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomIndianMobile(): string {
  // Indian mobile numbers: 10 digits, first digit 6-9.
  const firstDigit = pick(["6", "7", "8", "9"]);
  let rest = "";
  for (let i = 0; i < 9; i++) rest += randomInt(0, 9).toString();
  return firstDigit + rest;
}

function daysAgo(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() - days);
  date.setHours(randomInt(9, 20), randomInt(0, 59), 0, 0);
  return date;
}

const usedSeedBillNumbers = new Set<string>();

/**
 * Mirrors the BILL-YYYYMMDD-XXXX format generateBillNumber() in
 * billing.service.ts produces, but dated to the bill's own seeded
 * historical `createdAt` rather than the real current time, and set
 * explicitly here rather than left to bill.model.ts's pre-validate hook —
 * same reasoning as billing.service.ts: generate it up front rather than
 * rely on a hook for a field with `required: true`.
 */
function generateSeedBillNumber(date: Date): string {
  const datePart =
    `${date.getFullYear()}` +
    `${String(date.getMonth() + 1).padStart(2, "0")}` +
    `${String(date.getDate()).padStart(2, "0")}`;

  for (let attempt = 0; attempt < 20; attempt++) {
    const random = Math.floor(Math.random() * 9000 + 1000).toString();
    const candidate = `BILL-${datePart}-${random}`;
    if (!usedSeedBillNumbers.has(candidate)) {
      usedSeedBillNumbers.add(candidate);
      return candidate;
    }
  }

  // Practically unreachable at seed data volumes, but keep it total.
  const fallback = `BILL-${datePart}-${Date.now().toString().slice(-6)}`;
  usedSeedBillNumbers.add(fallback);
  return fallback;
}

interface SeedResult {
  seeded: boolean;
  reason: string;
}

/**
 * Idempotent: if the reserved demo Staff account already exists, assumes the
 * demo database was already seeded (by a previous call, or a previous demo
 * login) and does nothing. Safe to call on every demo login.
 *
 * If seeding fails partway through (network hiccup, a bad doc, etc.), the
 * partial data is wiped before rethrowing — otherwise the idempotency check
 * above would see the demo Staff account (if it made it in before the
 * failure) and skip seeding forever after, leaving the demo database stuck
 * half-populated. This assumes seeding only ever runs against an empty demo
 * database (guaranteed by the check above), so it's always safe to clear
 * these collections on failure.
 *
 * Note: this does not guard against two demo logins triggering a first-ever
 * seed at the exact same moment — an acceptable gap for a low-traffic demo
 * environment, not worth a distributed lock here.
 */
export async function seedDemoDatabaseIfNeeded(): Promise<SeedResult> {
  const existingDemoStaff = await Staff.findOne({
    username: DEMO_USER_USERNAME,
    isDeleted: false,
  });

  if (existingDemoStaff) {
    return { seeded: false, reason: "Demo database already seeded." };
  }

  try {
    return await runSeed();
  } catch (error) {
    const modelsToClear: Array<{ deleteMany: (filter: object) => Promise<unknown> }> =
      [Staff, Member, Wallet, Card, Product, Stock, Recharge, Debit, Bill, Transaction];

    await Promise.all(
      modelsToClear.map((model) => model.deleteMany({}).catch(() => undefined)),
    );
    throw error;
  }
}

async function runSeed(): Promise<SeedResult> {
  // ── Staff ──────────────────────────────────────────────────────────────
  const passwordHash = await bcrypt.hash(DEMO_USER_PASSWORD, 10);

  const demoAdmin = await Staff.create({
    fullName: DEMO_USER_FULL_NAME,
    username: DEMO_USER_USERNAME,
    passwordHash,
    role: STAFF_ROLES.SUPER_ADMIN,
    status: RECORD_STATUS.ACTIVE,
    tokenVersion: 0,
    createdBy: null,
    updatedBy: null,
    isDeleted: false,
    deletedAt: null,
  });

  const cashierPasswordHash = await bcrypt.hash("demoCashier123", 10);
  const demoCashier = await Staff.create({
    fullName: "Lakshmi Narayanan",
    username: "demo_cashier",
    passwordHash: cashierPasswordHash,
    role: STAFF_ROLES.CASHIER,
    status: RECORD_STATUS.ACTIVE,
    tokenVersion: 0,
    createdBy: demoAdmin._id,
    updatedBy: null,
    isDeleted: false,
    deletedAt: null,
  });

  const actorId = demoAdmin._id as mongoose.Types.ObjectId;

  // ── Products + Stock ──────────────────────────────────────────────────
  const productDocs = [];
  for (const p of PRODUCTS) {
    const product = await Product.create({
      productName: p.name,
      productCode: p.code,
      sellingPrice: p.price,
      unit: p.unit,
      status: RECORD_STATUS.ACTIVE,
      createdBy: actorId,
      updatedBy: null,
      isDeleted: false,
      deletedAt: null,
    });

    await Stock.create({
      productId: product._id,
      currentQty: p.openingQty,
      createdBy: actorId,
      updatedBy: null,
    });

    productDocs.push(product);
  }

  // ── Members + Wallets + Cards + history ──────────────────────────────
  const MEMBER_COUNT = 120;
  const usedMobiles = new Set<string>();

  for (let i = 0; i < MEMBER_COUNT; i++) {
    const fullName = `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`;

    let mobileNumber = randomIndianMobile();
    while (usedMobiles.has(mobileNumber)) mobileNumber = randomIndianMobile();
    usedMobiles.add(mobileNumber);

    const member = await Member.create({
      fullName,
      mobileNumber,
      referenceDetails: Math.random() < 0.3 ? "Walk-in referral" : null,
      status: Math.random() < 0.92 ? RECORD_STATUS.ACTIVE : RECORD_STATUS.INACTIVE,
      createdBy: actorId,
      updatedBy: null,
      isDeleted: false,
      deletedAt: null,
    });

    const wallet = await Wallet.create({
      memberId: member._id,
      currentBalance: 0,
      status: member.status,
      createdBy: actorId,
      updatedBy: null,
      isDeleted: false,
      deletedAt: null,
    });

    const activatedAt = daysAgo(randomInt(30, 365));
    const expiresAt = new Date(activatedAt);
    expiresAt.setFullYear(expiresAt.getFullYear() + 2);

    const card = await Card.create({
      cardNumber: `PWC${(i + 1).toString().padStart(6, "0")}`,
      memberId: member._id,
      status: CARD_STATUS.ACTIVE,
      activatedAt,
      expiresAt,
      replacedAt: null,
      replacedByCardId: null,
      createdBy: actorId,
      updatedBy: null,
      isDeleted: false,
      deletedAt: null,
    });

    // A short, believable transaction history per member: a couple of
    // recharges, then the occasional bill against the resulting balance.
    let balance = 0;
    const rechargeCount = randomInt(1, 3);

    for (let r = 0; r < rechargeCount; r++) {
      const amount = pick([200, 500, 1000, 1500, 2000]);
      const createdAt = daysAgo(randomInt(1, 60));
      const balanceBefore = balance;
      balance += amount;

      const recharge = await Recharge.create({
        memberId: member._id,
        walletId: wallet._id,
        cardId: card._id,
        amount,
        paymentMode: pick(Object.values(PAYMENT_MODES)),
        referenceNumber: null,
        notes: "",
        createdBy: (r % 2 === 0 ? demoAdmin : demoCashier)._id,
        createdAt,
        updatedAt: createdAt,
      });

      await Transaction.create({
        walletId: wallet._id,
        memberId: member._id,
        type: TRANSACTION_TYPES.CREDIT,
        amount,
        balanceBefore,
        balanceAfter: balance,
        rechargeId: recharge._id,
        billId: null,
        debitId: null,
        description: "Wallet recharge",
        createdBy: recharge.createdBy,
        createdAt,
        updatedAt: createdAt,
      });
    }

    const billCount = randomInt(0, 2);
    for (let b = 0; b < billCount && balance > 20; b++) {
      const itemCount = randomInt(1, 3);
      const items = [];
      let totalAmount = 0;

      for (let k = 0; k < itemCount; k++) {
        const product = pick(productDocs);
        const quantity = randomInt(1, 3);
        const subtotal = Math.round(product.sellingPrice * quantity);
        if (totalAmount + subtotal > balance) continue;

        totalAmount += subtotal;
        items.push({
          productId: product._id,
          productName: product.productName,
          productCode: product.productCode,
          unitPrice: product.sellingPrice,
          quantity,
          subtotal,
        });
      }

      if (items.length === 0) continue;

      const createdAt = daysAgo(randomInt(0, 45));
      const balanceBefore = balance;
      balance -= totalAmount;

      const bill = await Bill.create({
        billNumber: generateSeedBillNumber(createdAt),
        memberId: member._id,
        walletId: wallet._id,
        cardId: card._id,
        cashierId: demoCashier._id,
        items,
        totalAmount,
        walletBalanceBefore: balanceBefore,
        walletBalanceAfter: balance,
        status: BILL_STATUS.CONFIRMED,
        notes: "",
        createdBy: demoCashier._id,
        createdAt,
        updatedAt: createdAt,
      });

      await Transaction.create({
        walletId: wallet._id,
        memberId: member._id,
        type: TRANSACTION_TYPES.DEBIT,
        amount: totalAmount,
        balanceBefore,
        balanceAfter: balance,
        rechargeId: null,
        billId: bill._id,
        debitId: null,
        description: `Bill ${bill.billNumber}`,
        createdBy: demoCashier._id,
        createdAt,
        updatedAt: createdAt,
      });
    }

    // The occasional manual debit (e.g. a correction), independent of billing.
    if (Math.random() < 0.1 && balance > 50) {
      const amount = Math.min(balance, pick([50, 100, 150]));
      const createdAt = daysAgo(randomInt(0, 20));
      const balanceBefore = balance;
      balance -= amount;

      const debit = await Debit.create({
        memberId: member._id,
        walletId: wallet._id,
        cardId: card._id,
        amount,
        reason: "Manual balance correction",
        paymentMode: PAYMENT_MODES.CASH,
        notes: "",
        createdBy: demoAdmin._id,
        createdAt,
        updatedAt: createdAt,
      });

      await Transaction.create({
        walletId: wallet._id,
        memberId: member._id,
        type: TRANSACTION_TYPES.DEBIT,
        amount,
        balanceBefore,
        balanceAfter: balance,
        rechargeId: null,
        billId: null,
        debitId: debit._id,
        description: "Manual debit",
        createdBy: demoAdmin._id,
        createdAt,
        updatedAt: createdAt,
      });
    }

    await Wallet.updateOne({ _id: wallet._id }, { currentBalance: balance });
  }

  return { seeded: true, reason: "Demo database seeded successfully." };
}
