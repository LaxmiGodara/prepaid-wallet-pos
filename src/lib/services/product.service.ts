import mongoose from "mongoose";

import { PAGINATION, PRODUCT_UNITS, RECORD_STATUS } from "@/lib/constants";
import { Product, Stock } from "@/lib/models";
import { AppError, type FieldError } from "@/types";


export interface ProductRecord {
  id:           string;
  productName:  string;
  productCode:  string;   
  sellingPrice: number;
  unit:         string;
  status:       string;
  createdAt:    string;
  updatedAt:    string;
  // Only populated by listProducts (which joins Stock) — other call sites
  // (createProduct, updateProduct, updateProductStatus) leave this at 0
  // since they don't need it and a fresh product always starts at 0 stock
  // anyway.
  currentStock: number;
}

interface ListProductsInput {
  page: number; limit: number; search: string | null; status: string | null;
}

interface CreateProductInput {
  productName?:  string;
  productCode?:  string;
  sellingPrice?: number | string;
  unit?:         string;
}

interface UpdateProductInput {
  productName?:  string;
  productCode?:  string;
  sellingPrice?: number | string;
  unit?:         string;
}

function validateProductInput(
  input: CreateProductInput,
  isUpdate = false
): FieldError[] {
  const errors: FieldError[] = [];

  if (!isUpdate || input.productName !== undefined) {
    const name = input.productName?.trim() ?? "";
    if (!name)          errors.push({ field: "productName", message: "Product name is required." });
    else if (name.length > 120) errors.push({ field: "productName", message: "Max 120 characters." });
  }

  if (isUpdate && input.productCode !== undefined) {
    const code = input.productCode?.trim() ?? "";
    if (!code) errors.push({ field: "productCode", message: "Product code is required." });
  }

  if (!isUpdate || input.sellingPrice !== undefined) {
    const price = Number(input.sellingPrice);
    if (isNaN(price) || price <= 0) {
      errors.push({ field: "sellingPrice", message: "Selling price must be greater than zero." });
    }
  }

  if (!isUpdate || input.unit !== undefined) {
    const validUnits = Object.values(PRODUCT_UNITS);
    const unit = input.unit ?? "";
    if (!unit) {
      errors.push({ field: "unit", message: "Unit is required." });
    } else if (!validUnits.includes(unit as (typeof validUnits)[number])) {
      errors.push({ field: "unit", message: "Please select a valid unit." });
    }
  }

  return errors;
}

function getProductCodePrefix(productName: string): string {
  const letters = productName.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  return (letters || "PRD").slice(0, 3).padEnd(3, "X");
}

async function generateProductCode(productName: string): Promise<string> {
  const prefix = getProductCodePrefix(productName);
  const pattern = new RegExp(`^PRD-${prefix}-\\d+$`);
  const products = await Product.find({ productCode: pattern }).select("productCode");
  const maxNumber = products.reduce((max, product) => {
    const suffix = Number(product.productCode.split("-").at(-1));
    return Number.isFinite(suffix) ? Math.max(max, suffix) : max;
  }, 0);

  return `PRD-${prefix}-${String(maxNumber + 1).padStart(2, "0")}`;
}

function toProductRecord(
  doc: InstanceType<typeof Product>,
  currentStock = 0,
): ProductRecord {
  return {
    id:           doc._id.toString(),
    productName:  doc.productName,
    productCode:  doc.productCode,   // ← model field
    sellingPrice: doc.sellingPrice,
    unit:         doc.unit,
    status:       doc.status,
    createdAt:    doc.createdAt.toISOString(),
    updatedAt:    doc.updatedAt.toISOString(),
    currentStock,
  };
}

export async function listProducts(
  input: ListProductsInput
): Promise<{ productList: ProductRecord[]; total: number }> {
  const page  = Math.max(1, input.page);
  const limit = Math.min(Math.max(1, input.limit), PAGINATION.MAX_LIMIT);
  const skip  = (page - 1) * limit;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const filter: Record<string, any> = { isDeleted: false };
  if (input.status) filter.status = input.status;
  if (input.search) {
    const safe = input.search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    filter.$or = [
      { productName: { $regex: safe, $options: "i" } },
      { productCode: { $regex: safe, $options: "i" } },
    ];
  }

  const [products, total] = await Promise.all([
    Product.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Product.countDocuments(filter),
  ]);

  const productIds = products.map((p) => p._id);
  const stockRecords = await Stock.find({ productId: { $in: productIds } });
  const stockMap = new Map(
    stockRecords.map((s) => [s.productId.toString(), s.currentQty]),
  );

  return {
    productList: products.map((p) =>
      toProductRecord(p, stockMap.get(p._id.toString()) ?? 0),
    ),
    total,
  };
}

// ATOMIC: Product + Stock(qty=0) created together
export async function createProduct(
  input: CreateProductInput,
  actorId: string
): Promise<ProductRecord> {
  const errors = validateProductInput(input);
  if (errors.length > 0) throw new AppError("Validation failed.", 400, errors);

  const productName  = input.productName!.trim();
  const productCode  = await generateProductCode(productName);
  const sellingPrice = Number(input.sellingPrice);
  const unit         = input.unit!.trim();
  const actorOid     = new mongoose.Types.ObjectId(actorId);

  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    const [product] = await Product.create(
      [{ productName, productCode, sellingPrice, unit, status: RECORD_STATUS.ACTIVE, createdBy: actorOid, isDeleted: false }],
      { session, ordered: true }
    );

    // Stock field is currentQty (not currentQuantity) - matches Stock model
    await Stock.create(
      [{ productId: product._id, currentQty: 0, createdBy: actorOid }],
      { session, ordered: true }
    );

    await session.commitTransaction();
    return toProductRecord(product);
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
}

export async function updateProduct(
  productId: string,
  input: UpdateProductInput,
  actorId: string
): Promise<ProductRecord> {
  if (!mongoose.Types.ObjectId.isValid(productId)) throw new AppError("Invalid product ID.", 400);

  const errors = validateProductInput(input, true);
  if (errors.length > 0) throw new AppError("Validation failed.", 400, errors);

  const hasAny =
    input.productName  !== undefined ||
    input.productCode  !== undefined ||
    input.sellingPrice !== undefined ||
    input.unit         !== undefined;
  if (!hasAny) throw new AppError("Nothing to update.", 400);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fields: Record<string, any> = { updatedBy: new mongoose.Types.ObjectId(actorId) };
  if (input.productName  !== undefined) fields.productName  = input.productName.trim();
  if (input.productCode  !== undefined) fields.productCode  = input.productCode.trim();
  if (input.sellingPrice !== undefined) fields.sellingPrice = Number(input.sellingPrice);
  if (input.unit         !== undefined) fields.unit         = input.unit.trim();

  const updated = await Product.findOneAndUpdate(
    { _id: productId, isDeleted: false },
    fields,
    { new: true }
  );
  if (!updated) throw new AppError("Product not found.", 404);
  return toProductRecord(updated);
}

export async function updateProductStatus(
  productId: string,
  actorId: string
): Promise<ProductRecord> {
  if (!mongoose.Types.ObjectId.isValid(productId)) throw new AppError("Invalid product ID.", 400);

  const product = await Product.findOne({ _id: productId, isDeleted: false });
  if (!product) throw new AppError("Product not found.", 404);

  const newStatus =
    product.status === RECORD_STATUS.ACTIVE ? RECORD_STATUS.INACTIVE : RECORD_STATUS.ACTIVE;

  const updated = await Product.findOneAndUpdate(
    { _id: productId },
    { status: newStatus, updatedBy: new mongoose.Types.ObjectId(actorId) },
    { new: true }
  );
  if (!updated) throw new AppError("Product not found.", 404);
  return toProductRecord(updated);
}
