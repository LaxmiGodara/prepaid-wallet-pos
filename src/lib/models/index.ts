import type { Model, Schema } from "mongoose";

import { getDemoConnection } from "@/lib/db";
import { isDemoRequest } from "@/lib/demo-context";

import { Staff as StaffModel, staffSchema } from "./staff.model";
import type { IStaff } from "./staff.model";

import { Member as MemberModel, memberSchema } from "./member.model";
import type { IMember } from "./member.model";

import { Card as CardModel, cardSchema } from "./card.model";
import type { ICard } from "./card.model";

import { Wallet as WalletModel, walletSchema } from "./wallet.model";
import type { IWallet } from "./wallet.model";

import { Recharge as RechargeModel, rechargeSchema } from "./recharge.model";
import type { IRecharge } from "./recharge.model";

import { Debit as DebitModel, debitSchema } from "./debit.model";
import type { IDebit } from "./debit.model";

import { Product as ProductModel, productSchema } from "./product.model";
import type { IProduct } from "./product.model";

import { Bill as BillModel, billSchema } from "./bill.model";
import type { IBill } from "./bill.model";

import {
  Transaction as TransactionModel,
  transactionSchema,
} from "./transaction.model";
import type { ITransaction } from "./transaction.model";

import { Stock as StockModel, stockSchema } from "./stock.model";
import type { IStock } from "./stock.model";

import {
  StockMovement as StockMovementModel,
  stockMovementSchema,
} from "./stock-movement.model";
import type { IStockMovement } from "./stock-movement.model";

// ─── Demo-aware model proxies ───────────────────────────────────────────────
// Every service/route in the app imports models from this barrel file
// (`import { Staff, Member, ... } from "@/lib/models"`) and calls them
// directly: `Staff.findOne(...)`, `Member.create(...)`, etc.
//
// To keep Demo Mode's writes fully isolated from production WITHOUT editing
// every one of those call sites, each export here is a Proxy that decides,
// on every single property access, whether the current request is a Demo
// Mode request (via the AsyncLocalStorage-backed isDemoRequest()) and
// forwards the call to either the production model (compiled on the default
// Mongoose connection, exactly as before this feature existed) or a demo
// model (compiled lazily on the separate demo connection from
// src/lib/db.ts). Everything else about how these are used is unchanged.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const demoModelCache = new Map<string, Model<any>>();

function getDemoModel<T>(name: string, schema: Schema<T>): Model<T> {
  const cached = demoModelCache.get(name);
  if (cached) return cached as Model<T>;

  const connection = getDemoConnection();
  // The demo connection may already have this model registered (e.g. hot
  // reload in dev, or a second call before our cache warms) — reuse it
  // rather than letting Mongoose throw "Cannot overwrite model".
  const model =
    (connection.models[name] as Model<T> | undefined) ??
    connection.model<T>(name, schema);

  demoModelCache.set(name, model);
  return model;
}

function createDemoAwareModel<T>(
  name: string,
  prodModel: Model<T>,
  schema: Schema<T>,
): Model<T> {
  return new Proxy(prodModel, {
    get(target, prop, receiver) {
      const activeModel = isDemoRequest()
        ? getDemoModel<T>(name, schema)
        : target;

      const value = Reflect.get(
        activeModel,
        prop,
        receiver === target ? activeModel : receiver,
      );

      // Bind functions to the resolved model explicitly. Without this,
      // `demoAwareStaff.findOne()` would invoke the underlying method with
      // `this` set to the Proxy itself (since that's the call-site
      // receiver), which re-triggers this same `get` trap recursively for
      // every internal property Mongoose reads off `this` — fragile, and
      // it could re-evaluate isDemoRequest() mid-call. Binding to the
      // already-resolved activeModel makes each call self-consistent.
      return typeof value === "function" ? value.bind(activeModel) : value;
    },
  }) as Model<T>;
}

export const Staff = createDemoAwareModel<IStaff>(
  "Staff",
  StaffModel,
  staffSchema,
);
export type { IStaff };

export const Member = createDemoAwareModel<IMember>(
  "Member",
  MemberModel,
  memberSchema,
);
export type { IMember };

export const Card = createDemoAwareModel<ICard>("Card", CardModel, cardSchema);
export type { ICard };

export const Wallet = createDemoAwareModel<IWallet>(
  "Wallet",
  WalletModel,
  walletSchema,
);
export type { IWallet };

export const Recharge = createDemoAwareModel<IRecharge>(
  "Recharge",
  RechargeModel,
  rechargeSchema,
);
export type { IRecharge };

export const Debit = createDemoAwareModel<IDebit>(
  "Debit",
  DebitModel,
  debitSchema,
);
export type { IDebit };

export const Product = createDemoAwareModel<IProduct>(
  "Product",
  ProductModel,
  productSchema,
);
export type { IProduct };

export const Bill = createDemoAwareModel<IBill>("Bill", BillModel, billSchema);
export type { IBill };

export const Transaction = createDemoAwareModel<ITransaction>(
  "Transaction",
  TransactionModel,
  transactionSchema,
);
export type { ITransaction };

export const Stock = createDemoAwareModel<IStock>(
  "Stock",
  StockModel,
  stockSchema,
);
export type { IStock };

export const StockMovement = createDemoAwareModel<IStockMovement>(
  "StockMovement",
  StockMovementModel,
  stockMovementSchema,
);
export type { IStockMovement };
