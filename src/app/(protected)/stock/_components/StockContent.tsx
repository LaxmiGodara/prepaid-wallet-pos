"use client";

import { useCallback, useEffect, useState } from "react";
import { Button, PageHeader, SectionCard } from "@/components/ui";
import { getAuthorizationHeader } from "@/lib/auth-storage";
import {
  PAGINATION,
  RECORD_STATUS,
  STOCK_MOVEMENT_TYPES,
} from "@/lib/constants";
import type { PaginationMeta } from "@/types";

interface StockRecord {
  id: string;
  productId: string;
  productName: string;
  category: string;
  unit: string;
  productStatus: string;
  currentQuantity: number;
  updatedAt: string;
}

const INITIAL_META: PaginationMeta = {
  page: 1,
  limit: PAGINATION.DEFAULT_LIMIT,
  total: 0,
  totalPages: 0,
};

const ADJUSTMENT_TYPES = [
  STOCK_MOVEMENT_TYPES.OPENING,
  STOCK_MOVEMENT_TYPES.PURCHASE,
  STOCK_MOVEMENT_TYPES.ADJUSTMENT_ADD,
  STOCK_MOVEMENT_TYPES.ADJUSTMENT_DEDUCT,
  STOCK_MOVEMENT_TYPES.DAMAGE,
  STOCK_MOVEMENT_TYPES.RETURN,
];

function getQtyColor(qty: number) {
  if (qty === 0) return "text-red-600 font-bold";
  if (qty < 10) return "text-amber-600 font-semibold";
  return "text-slate-700 font-semibold";
}

export default function StockContent() {
  const [list, setList] = useState<StockRecord[]>([]);
  const [meta, setMeta] = useState<PaginationMeta>(INITIAL_META);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [listError, setListError] = useState("");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Adjust panel state

  const [adjustingStock, setAdjustingStock] = useState<StockRecord | null>(
    null,
  );
  const [adjType, setAdjType] = useState<string>(STOCK_MOVEMENT_TYPES.PURCHASE);
  const [adjQty, setAdjQty] = useState("");
  const [adjNotes, setAdjNotes] = useState("");
  const [adjErrors, setAdjErrors] = useState<Record<string, string>>({});
  const [adjErr, setAdjErr] = useState("");
  const [isAdjusting, setIsAdjusting] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search);
      setCurrentPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [search]);

  const fetchList = useCallback(async (page: number, s: string) => {
    setIsLoading(true);
    setListError("");
    try {
      const p = new URLSearchParams({
        page: String(page),
        limit: String(PAGINATION.DEFAULT_LIMIT),
      });
      if (s) p.set("search", s);
      const auth = getAuthorizationHeader();
      const res = await fetch(`/api/stock?${p}`, {
        headers: auth ? { Authorization: auth } : {},
      });
      const r = await res.json();
      if (!r.success) {
        setListError(r.message ?? "Failed to load stock.");
        return;
      }
      setList(r.data as StockRecord[]);
      if (r.meta) setMeta(r.meta as PaginationMeta);
    } catch {
      setListError("Unable to reach the server.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchList(currentPage, debouncedSearch);
  }, [currentPage, debouncedSearch, fetchList]);

  function openAdjust(stock: StockRecord) {
    setAdjustingStock(stock);
    setAdjType(STOCK_MOVEMENT_TYPES.PURCHASE);
    setAdjQty("");
    setAdjNotes("");
    setAdjErrors({});
    setAdjErr("");
  }

  async function handleAdjust(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!adjustingStock) return;
    const errs: Record<string, string> = {};
    if (!adjQty || Number(adjQty) <= 0 || !Number.isInteger(Number(adjQty))) {
      errs.quantity = "Quantity must be a positive whole number.";
    }
    if (Object.keys(errs).length > 0) {
      setAdjErrors(errs);
      return;
    }

    setIsAdjusting(true);
    setAdjErr("");
    try {
      const auth = getAuthorizationHeader();
      const res = await fetch(`/api/stock/${adjustingStock.id}/adjust`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(auth ? { Authorization: auth } : {}),
        },
        body: JSON.stringify({
          type: adjType,
          quantity: Number(adjQty),
          notes: adjNotes,
        }),
      });
      const r = await res.json();
      if (!r.success) {
        if (r.errors?.length > 0) {
          const be: Record<string, string> = {};
          (r.errors as Array<{ field: string; message: string }>).forEach(
            (err) => {
              be[err.field] = err.message;
            },
          );
          setAdjErrors(be);
        } else {
          setAdjErr(r.message ?? "Stock adjustment failed.");
        }
        return;
      }
      setList((prev) =>
        prev.map((s) =>
          s.id === adjustingStock.id ? (r.data as StockRecord) : s,
        ),
      );
      setAdjustingStock(null);
    } catch {
      setAdjErr("Unable to reach the server.");
    } finally {
      setIsAdjusting(false);
    }
  }

  const inputClass =
    "w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:border-blue-400 focus:ring-blue-100 transition-all";

  return (
    <div className="p-6 flex flex-col gap-6">
      <PageHeader
        title="Stock Management"
        subtitle={
          meta.total > 0
            ? `${meta.total} product${meta.total !== 1 ? "s" : ""} tracked`
            : "Track inventory levels"
        }
      />

      <div className="flex-1 min-w-[200px] max-w-xs">
        <input
          type="search"
          placeholder="Search by product or category..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={inputClass}
        />
      </div>

      {/* Adjust Panel */}
      {adjustingStock && (
        <SectionCard title={`Adjust Stock: ${adjustingStock.productName}`}>
          <p className="text-sm text-slate-500 mb-4">
            Current stock:{" "}
            <strong className={getQtyColor(adjustingStock.currentQuantity)}>
              {adjustingStock.currentQuantity} {adjustingStock.unit}
            </strong>
          </p>
          <form
            onSubmit={handleAdjust}
            className="grid grid-cols-2 gap-4"
            noValidate
          >
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-700">
                Movement Type <span className="text-red-500">*</span>
              </label>
              <select
                value={adjType}
                onChange={(e) => setAdjType(e.target.value)}
                className={inputClass + " cursor-pointer"}
              >
                {ADJUSTMENT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-700">
                Quantity <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="1"
                step="1"
                placeholder="Whole number"
                value={adjQty}
                onChange={(e) => {
                  setAdjQty(e.target.value);
                  setAdjErrors((p) => ({ ...p, quantity: "" }));
                }}
                className={inputClass}
              />
              {adjErrors.quantity && (
                <p className="text-xs font-medium text-red-600">
                  {adjErrors.quantity}
                </p>
              )}
            </div>
            <div className="col-span-2 flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-700">
                Notes
              </label>
              <input
                type="text"
                placeholder="Supplier name, invoice number, reason..."
                value={adjNotes}
                onChange={(e) => setAdjNotes(e.target.value)}
                className={inputClass}
              />
            </div>
            <div className="col-span-2 flex flex-col gap-3">
              {adjErr && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {adjErr}
                </div>
              )}
              <div className="flex gap-3">
                <Button type="submit" variant="primary" isLoading={isAdjusting}>
                  {isAdjusting ? "Saving..." : "Save Movement"}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setAdjustingStock(null)}
                  disabled={isAdjusting}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </form>
        </SectionCard>
      )}

      {/* Stock Table */}
      <SectionCard
        title="Current Stock Levels"
        noPadding
        actions={
          <Button
            variant="secondary"
            size="sm"
            onClick={() => void fetchList(currentPage, debouncedSearch)}
            disabled={isLoading}
          >
            {isLoading ? "Loading..." : "Refresh"}
          </Button>
        }
      >
        {isLoading && (
          <div className="flex items-center justify-center py-16 gap-2">
            <span className="flex gap-1">
              <span className="w-2 h-2 rounded-full bg-slate-300 animate-bounce [animation-delay:0ms]" />
              <span className="w-2 h-2 rounded-full bg-slate-300 animate-bounce [animation-delay:150ms]" />
              <span className="w-2 h-2 rounded-full bg-slate-300 animate-bounce [animation-delay:300ms]" />
            </span>
            <span className="text-sm text-slate-400">Loading stock...</span>
          </div>
        )}
        {!isLoading && listError && (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <p className="text-sm text-red-500">{listError}</p>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setListError("");
                void fetchList(currentPage, debouncedSearch);
              }}
            >
              Try Again
            </Button>
          </div>
        )}
        {!isLoading && !listError && list.length === 0 && (
          <div className="flex items-center justify-center py-16">
            <p className="text-sm font-medium text-slate-500">
              No stock records found. Create products first.
            </p>
          </div>
        )}
        {!isLoading && !listError && list.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse min-w-[620px]">
              <thead>
                <tr>
                  {[
                    "Product",
                    "Category",
                    "Current Stock",
                    "Last Updated",
                    "Actions",
                  ].map((h) => (
                    <th
                      key={h}
                      className="text-left px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider bg-slate-50/80 border-b border-slate-100 whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {list.map((s) => (
                  <tr
                    key={s.id}
                    className={[
                      "hover:bg-slate-50/50 transition-colors",
                      s.productStatus === RECORD_STATUS.INACTIVE
                        ? "opacity-60"
                        : "",
                    ].join(" ")}
                  >
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium text-slate-800">
                        {s.productName}
                      </p>
                      {s.productStatus === RECORD_STATUS.INACTIVE && (
                        <p className="text-xs text-slate-400">
                          Product inactive
                        </p>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {s.category}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={[
                          "text-sm",
                          getQtyColor(s.currentQuantity),
                        ].join(" ")}
                      >
                        {s.currentQuantity}{" "}
                        <span className="text-xs font-normal text-slate-500">
                          {s.unit}
                        </span>
                      </span>
                      {s.currentQuantity === 0 && (
                        <span className="ml-2 text-xs text-red-500 font-medium">
                          Out of stock
                        </span>
                      )}
                      {s.currentQuantity > 0 && s.currentQuantity < 10 && (
                        <span className="ml-2 text-xs text-amber-600 font-medium">
                          Low
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-500 whitespace-nowrap">
                      {new Date(s.updatedAt).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        type="button"
                        onClick={() => openAdjust(s)}
                        className="text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors"
                      >
                        Adjust Stock
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!isLoading && !listError && meta.totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100">
            <p className="text-xs text-slate-500">
              Showing{" "}
              <span className="font-medium text-slate-700">
                {(currentPage - 1) * meta.limit + 1}
              </span>
              {" – "}
              <span className="font-medium text-slate-700">
                {Math.min(currentPage * meta.limit, meta.total)}
              </span>
              {" of "}
              <span className="font-medium text-slate-700">{meta.total}</span>
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <span className="text-xs text-slate-500 min-w-[80px] text-center">
                Page {currentPage} of {meta.totalPages}
              </span>
              <Button
                variant="secondary"
                size="sm"
                disabled={currentPage === meta.totalPages}
                onClick={() =>
                  setCurrentPage((p) => Math.min(meta.totalPages, p + 1))
                }
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </SectionCard>
    </div>
  );
}
