import mongoose from "mongoose";

import { PAGINATION, RECORD_STATUS, STOCK_MOVEMENT_TYPES } from "@/lib/constants";
import { Product, Stock, StockMovement } from "@/lib/models";
import { AppError, type FieldError } from "@/types";

export interface StockRecord {
  id:              string;
  productId:       string;
  productName:     string;
  productCode:     string;   // ← was category
  unit:            string;
  productStatus:   string;
  currentQty:      number;   // ← was currentQuantity
  updatedAt:       string;
}

export async function listStock(input: {
  page: number; limit: number; search: string | null;
}): Promise<{ stockList: StockRecord[]; total: number }> {
  const page  = Math.max(1, input.page);
  const limit = Math.min(Math.max(1, input.limit), PAGINATION.MAX_LIMIT);
  const skip  = (page - 1) * limit;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const productFilter: Record<string, any> = { isDeleted: false };
  if (input.search) {
    const safe = input.search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    productFilter.$or = [
      { productName: { $regex: safe, $options: "i" } },
      { productCode: { $regex: safe, $options: "i" } },
    ];
  }

  const matchingProducts = await Product.find(productFilter).select("_id");
  const productIds = matchingProducts.map((p) => p._id);

  const stockFilter = input.search ? { productId: { $in: productIds } } : {};

  const [stocks, total] = await Promise.all([
    Stock.find(stockFilter).sort({ updatedAt: -1 }).skip(skip).limit(limit),
    Stock.countDocuments(stockFilter),
  ]);

  const allProductIds = stocks.map((s) => s.productId);
  const products      = await Product.find({ _id: { $in: allProductIds } });
  const productMap    = new Map(products.map((p) => [p._id.toString(), p]));

  const stockList: StockRecord[] = stocks.map((s) => {
    const product = productMap.get(s.productId.toString());
    return {
      id:            s._id.toString(),
      productId:     s.productId.toString(),
      productName:   product?.productName ?? "Unknown",
      productCode:   product?.productCode ?? "Unknown",  // ← fixed
      unit:          product?.unit        ?? "",
      productStatus: product?.status      ?? "Unknown",
      currentQty:    s.currentQty,                       // ← fixed
      updatedAt:     s.updatedAt.toISOString(),
    };
  });

  return { stockList, total };
}

// Only allow manual adjustment types (billing handles its own deductions)
const DEDUCTION_TYPES = [
  STOCK_MOVEMENT_TYPES.ADJUSTMENT_DEDUCT,
  STOCK_MOVEMENT_TYPES.DAMAGE,
];

export async function addStockMovement(
  input: { stockId?: string; type?: string; quantity?: number | string; notes?: string },
  actorId: string
): Promise<StockRecord> {
  const errors: FieldError[] = [];

  if (!input.stockId?.trim()) errors.push({ field: "stockId", message: "Stock record is required." });
  const qty = Number(input.quantity);
  if (!input.quantity || isNaN(qty) || qty <= 0 || !Number.isInteger(qty)) {
    errors.push({ field: "quantity", message: "Quantity must be a positive whole number." });
  }

  const validTypes = Object.values(STOCK_MOVEMENT_TYPES).filter(
    (t) => t !== STOCK_MOVEMENT_TYPES.BILLING_DEDUCTION
  );
  if (!input.type || !validTypes.includes(input.type as (typeof validTypes)[number])) {
    errors.push({ field: "type", message: "Please select a valid movement type." });
  }

  if (errors.length > 0) throw new AppError("Validation failed.", 400, errors);
  if (!mongoose.Types.ObjectId.isValid(input.stockId!)) throw new AppError("Invalid stock ID.", 400);

  const stockDoc = await Stock.findById(input.stockId);
  if (!stockDoc) throw new AppError("Stock record not found.", 404);

  // Cast to string[] to avoid literal type issue with .includes()
  const isDeduction = (DEDUCTION_TYPES as string[]).includes(input.type!);

  if (isDeduction && stockDoc.currentQty < qty) {       // ← currentQty
    throw new AppError(
      `Insufficient stock. Current quantity: ${stockDoc.currentQty}.`,
      400,
      [{ field: "quantity", message: `Cannot deduct more than current stock (${stockDoc.currentQty}).` }]
    );
  }

  const balanceBefore = stockDoc.currentQty;            // ← currentQty
  const balanceAfter  = isDeduction ? balanceBefore - qty : balanceBefore + qty;
  const actorOid      = new mongoose.Types.ObjectId(actorId);

  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    await Stock.findByIdAndUpdate(
      input.stockId,
      { $inc: { currentQty: isDeduction ? -qty : qty } },  // ← currentQty
      { session }
    );

    // StockMovement field names match the actual model:
    //   movementType (not type)
    //   quantityChanged (not quantity)
    //   quantityBefore (not balanceBefore)
    //   notes must be string (not null)
    await StockMovement.create(
      [{
        productId:       stockDoc.productId,
        movementType:    input.type,               // ← was type
        quantityChanged: qty,                       // ← was quantity
        quantityBefore:  balanceBefore,             // ← was balanceBefore
        notes:           input.notes?.trim() ?? "", // ← null → ""
        createdBy:       actorOid,
      }],
      { session }
    );

    await session.commitTransaction();

    const updatedStock = await Stock.findById(input.stockId);
    const product      = await Product.findById(stockDoc.productId);

    return {
      id:            updatedStock!._id.toString(),
      productId:     updatedStock!.productId.toString(),
      productName:   product?.productName ?? "Unknown",
      productCode:   product?.productCode ?? "Unknown",   // ← fixed
      unit:          product?.unit        ?? "",
      productStatus: product?.status      ?? "Unknown",
      currentQty:    updatedStock!.currentQty,            // ← fixed
      updatedAt:     updatedStock!.updatedAt.toISOString(),
    };
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
}