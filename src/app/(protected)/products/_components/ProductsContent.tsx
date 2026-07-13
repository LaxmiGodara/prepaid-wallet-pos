"use client";

import { useCallback, useEffect, useState } from "react";
import { Badge, Button, Input, PageHeader, SectionCard, getStatusVariant } from "@/components/ui";
import { getAuthorizationHeader } from "@/lib/auth-storage";
import { PAGINATION, PRODUCT_UNITS, RECORD_STATUS } from "@/lib/constants";
import type { PaginationMeta } from "@/types";

interface ProductRecord {
  id: string; productName: string; productCode: string;
  sellingPrice: number; unit: string; status: string;
  createdAt: string; updatedAt: string;
}

interface FormData { productName: string; productCode: string; sellingPrice: string; unit: string; }
       
type FormErrors = Partial<Record<keyof FormData, string>>;

function validateForm(d: FormData, isEdit = false): FormErrors {
  const e: FormErrors = {};
  if (!isEdit || d.productName !== undefined) {
    if (!d.productName.trim()) e.productName = "Product name is required.";
  }
  if (!isEdit || d.productCode !== undefined) {
    if (!d.productCode.trim()) e.productCode = "Product code is required.";
  }
  if (!d.sellingPrice || Number(d.sellingPrice) <= 0) e.sellingPrice = "Price must be greater than zero.";
  if (!d.unit.trim()) e.unit = "Unit is required.";
  return e;
}

function buildProductCodePreview(productName: string, products: ProductRecord[]): string {
  const letters = productName.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (!letters) return "";

  const prefix = letters.slice(0, 3).padEnd(3, "X");
  const maxNumber = products.reduce((max, product) => {
    if (!product.productCode.startsWith(`PRD-${prefix}-`)) return max;
    const suffix = Number(product.productCode.split("-").at(-1));
    return Number.isFinite(suffix) ? Math.max(max, suffix) : max;
  }, 0);

  return `PRD-${prefix}-${String(maxNumber + 1).padStart(2, "0")}`;
}

const EMPTY_FORM: FormData = { productName: "", productCode: "", sellingPrice: "", unit: "" };
const INITIAL_META: PaginationMeta = { page: 1, limit: PAGINATION.DEFAULT_LIMIT, total: 0, totalPages: 0 };
const PRODUCT_UNIT_OPTIONS = Object.values(PRODUCT_UNITS);

export default function ProductsContent() {
  const [list, setList]               = useState<ProductRecord[]>([]);
  const [meta, setMeta]               = useState<PaginationMeta>(INITIAL_META);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading]     = useState(true);
  const [listError, setListError]     = useState("");
  const [search, setSearch]           = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [showCreate, setShowCreate]   = useState(false);
  const [createData, setCreateData]   = useState<FormData>(EMPTY_FORM);
  const [createErrors, setCreateErrors] = useState<FormErrors>({});
  const [createErr, setCreateErr]     = useState("");
  const [isCreating, setIsCreating]   = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductRecord | null>(null);
  const [editData, setEditData]       = useState<FormData>(EMPTY_FORM);
  const [editErrors, setEditErrors]   = useState<FormErrors>({});
  const [editErr, setEditErr]         = useState("");
  const [isEditing, setIsEditing]     = useState(false);
  const [togglingId, setTogglingId]   = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(search); setCurrentPage(1); }, 400);
    return () => clearTimeout(t);
  }, [search]);

  const fetchList = useCallback(async (page: number, s: string, status: string) => {
    setIsLoading(true); setListError("");
    try {
      const p = new URLSearchParams({ page: String(page), limit: String(PAGINATION.DEFAULT_LIMIT) });
      if (s) p.set("search", s);
      if (status) p.set("status", status);
      const auth = getAuthorizationHeader();
      const res = await fetch(`/api/products?${p}`, { headers: auth ? { Authorization: auth } : {} });
      const r = await res.json();
      if (!r.success) { setListError(r.message ?? "Failed to load products."); return; }
      setList(r.data as ProductRecord[]);
      if (r.meta) setMeta(r.meta as PaginationMeta);
    } catch { setListError("Unable to reach the server."); }
    finally { setIsLoading(false); }
  }, []);

  useEffect(() => { void fetchList(currentPage, debouncedSearch, statusFilter); },
    [currentPage, debouncedSearch, statusFilter, fetchList]);

  function closeAll() {
    setShowCreate(false); setCreateData(EMPTY_FORM); setCreateErrors({}); setCreateErr("");
    setEditingProduct(null); setEditData(EMPTY_FORM); setEditErrors({}); setEditErr("");
  }

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const errs = validateForm(createData);
    if (Object.keys(errs).length > 0) { setCreateErrors(errs); return; }
    setIsCreating(true); setCreateErr("");
    try {
      const auth = getAuthorizationHeader();
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(auth ? { Authorization: auth } : {}) },
        body: JSON.stringify({ ...createData, sellingPrice: Number(createData.sellingPrice) }),
      });
      const r = await res.json();
      if (!r.success) {
        if (r.errors?.length > 0) { const be: FormErrors = {}; (r.errors as Array<{ field: string; message: string }>).forEach((err) => { be[err.field as keyof FormData] = err.message; }); setCreateErrors(be); }
        else { setCreateErr(r.message ?? "Failed to create product."); }
        return;
      }
      closeAll(); void fetchList(1, "", ""); setCurrentPage(1);
    } catch { setCreateErr("Unable to reach the server."); }
    finally { setIsCreating(false); }
  }

  async function handleEdit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editingProduct) return;
    const errs = validateForm(editData, true);
    if (Object.keys(errs).length > 0) { setEditErrors(errs); return; }
    setIsEditing(true); setEditErr("");
    try {
      const auth = getAuthorizationHeader();
      const res = await fetch(`/api/products/${editingProduct.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...(auth ? { Authorization: auth } : {}) },
        body: JSON.stringify({ ...editData, sellingPrice: Number(editData.sellingPrice) }),
      });
      const r = await res.json();
      if (!r.success) {
        if (r.errors?.length > 0) { const be: FormErrors = {}; (r.errors as Array<{ field: string; message: string }>).forEach((err) => { be[err.field as keyof FormData] = err.message; }); setEditErrors(be); }
        else { setEditErr(r.message ?? "Failed to update."); }
        return;
      }
      setList((prev) => prev.map((p) => p.id === editingProduct.id ? r.data as ProductRecord : p));
      closeAll();
    } catch { setEditErr("Unable to reach the server."); }
    finally { setIsEditing(false); }
  }

  async function handleToggle(product: ProductRecord) {
    setTogglingId(product.id);
    try {
      const auth = getAuthorizationHeader();
      const res = await fetch(`/api/products/${product.id}/status`, { method: "PATCH", headers: auth ? { Authorization: auth } : {} });
      const r = await res.json();
      if (!r.success) { setListError(r.message ?? "Failed to update status."); return; }
      setList((prev) => prev.map((p) => p.id === product.id ? r.data as ProductRecord : p));
    } catch { setListError("Unable to reach the server."); }
    finally { setTogglingId(null); }
  }

  const hasActiveFilters = Boolean(search || statusFilter);

  const inputClass = "w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:border-[var(--color-accent)] focus:ring-[var(--color-accent-soft)] bg-white transition-all";

  return (
    <div className="p-6 flex flex-col gap-6">
      <PageHeader title="Products" subtitle={meta.total > 0 ? `${meta.total} product${meta.total !== 1 ? "s" : ""}` : "Manage your product catalogue"}
        actions={!showCreate && !editingProduct ? <Button variant="primary" size="sm" onClick={() => { closeAll(); setShowCreate(true); }}>New Product</Button> : undefined} />

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex-1 min-w-[200px] max-w-xs">
          <input type="search" placeholder="Search by name or code..." value={search} onChange={(e) => setSearch(e.target.value)} className={inputClass} />
        </div>
        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }} className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:border-[var(--color-accent)] focus:ring-[var(--color-accent-soft)] transition-all cursor-pointer">
          <option value="">All Status</option>
          <option value={RECORD_STATUS.ACTIVE}>Active</option>
          <option value={RECORD_STATUS.INACTIVE}>Inactive</option>
        </select>
        {hasActiveFilters && <Button variant="secondary" size="sm" onClick={() => { setSearch(""); setStatusFilter(""); setCurrentPage(1); }}>Clear Filters</Button>}
      </div>

      {/* Create Form */}
      {showCreate && (
        <SectionCard title="New Product">
          <form onSubmit={handleCreate} className="grid grid-cols-2 gap-4" noValidate>
            <Input label="Product Name" name="productName" type="text" placeholder="e.g. Filter Coffee" value={createData.productName} onChange={(e) => { const productName = e.target.value; setCreateData((p) => ({ ...p, productName, productCode: buildProductCodePreview(productName, list) })); setCreateErrors((p) => ({ ...p, productName: "", productCode: "" })); }} error={createErrors.productName} required autoComplete="off" />
            <Input label="Product Code" name="productCode" type="text" placeholder="Auto-generated" value={createData.productCode} onChange={() => {}} error={createErrors.productCode} hint="Generated from the first three product letters." required autoComplete="off" readOnly />
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-700">Selling Price (₹) <span className="text-red-500">*</span></label>
              <input type="number" min="0.01" step="0.01" placeholder="0.00" value={createData.sellingPrice} onChange={(e) => { setCreateData((p) => ({ ...p, sellingPrice: e.target.value })); setCreateErrors((p) => ({ ...p, sellingPrice: "" })); }} className={inputClass} />
              {createErrors.sellingPrice && <p className="text-xs font-medium text-red-600">{createErrors.sellingPrice}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-700">Unit <span className="text-red-500">*</span></label>
              <select value={createData.unit} onChange={(e) => { setCreateData((p) => ({ ...p, unit: e.target.value })); setCreateErrors((p) => ({ ...p, unit: "" })); }} className={inputClass}>
                <option value="">Select unit</option>
                {PRODUCT_UNIT_OPTIONS.map((unit) => <option key={unit} value={unit}>{unit}</option>)}
              </select>
              {createErrors.unit ? <p className="text-xs font-medium text-red-600">{createErrors.unit}</p> : <p className="text-xs text-slate-400">How is this product measured?</p>}
            </div>
            <div className="col-span-2 flex flex-col gap-3">
              {createErr && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{createErr}</div>}
              <div className="flex gap-3">
                <Button type="submit" variant="primary" isLoading={isCreating}>{isCreating ? "Creating..." : "Create Product"}</Button>
                <Button type="button" variant="secondary" onClick={closeAll} disabled={isCreating}>Cancel</Button>
              </div>
            </div>
          </form>
        </SectionCard>
      )}

      {/* Edit Form */}
      {editingProduct && (
        <SectionCard title={`Edit: ${editingProduct.productName}`}>
          <form onSubmit={handleEdit} className="grid grid-cols-2 gap-4" noValidate>
            <Input label="Product Name" name="productName" type="text" value={editData.productName} onChange={(e) => { setEditData((p) => ({ ...p, productName: e.target.value })); setEditErrors((p) => ({ ...p, productName: "" })); }} error={editErrors.productName} required autoComplete="off" />
            <Input label="Product Code" name="productCode" type="text" value={editData.productCode} onChange={() => {}} error={editErrors.productCode} required autoComplete="off" readOnly />
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-700">Selling Price (₹) <span className="text-red-500">*</span></label>
              <input type="number" min="0.01" step="0.01" value={editData.sellingPrice} onChange={(e) => { setEditData((p) => ({ ...p, sellingPrice: e.target.value })); setEditErrors((p) => ({ ...p, sellingPrice: "" })); }} className={inputClass} />
              {editErrors.sellingPrice && <p className="text-xs font-medium text-red-600">{editErrors.sellingPrice}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-700">Unit <span className="text-red-500">*</span></label>
              <select value={editData.unit} onChange={(e) => { setEditData((p) => ({ ...p, unit: e.target.value })); setEditErrors((p) => ({ ...p, unit: "" })); }} className={inputClass}>
                <option value="">Select unit</option>
                {PRODUCT_UNIT_OPTIONS.map((unit) => <option key={unit} value={unit}>{unit}</option>)}
              </select>
              {editErrors.unit && <p className="text-xs font-medium text-red-600">{editErrors.unit}</p>}
            </div>
            <div className="col-span-2 flex flex-col gap-3">
              {editErr && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{editErr}</div>}
              <div className="flex gap-3">
                <Button type="submit" variant="primary" isLoading={isEditing}>{isEditing ? "Saving..." : "Save Changes"}</Button>
                <Button type="button" variant="secondary" onClick={closeAll} disabled={isEditing}>Cancel</Button>
              </div>
            </div>
          </form>
        </SectionCard>
      )}

      {/* Table */}
      <SectionCard title="All Products" noPadding actions={<Button variant="secondary" size="sm" onClick={() => void fetchList(currentPage, debouncedSearch, statusFilter)} disabled={isLoading}>{isLoading ? "Loading..." : "Refresh"}</Button>}>
        {isLoading && <div className="flex items-center justify-center py-16 gap-2"><span className="flex gap-1"><span className="w-2 h-2 rounded-full bg-slate-300 animate-bounce [animation-delay:0ms]" /><span className="w-2 h-2 rounded-full bg-slate-300 animate-bounce [animation-delay:150ms]" /><span className="w-2 h-2 rounded-full bg-slate-300 animate-bounce [animation-delay:300ms]" /></span><span className="text-sm text-slate-400">Loading products...</span></div>}
        {!isLoading && listError && <div className="flex flex-col items-center justify-center py-16 gap-3"><p className="text-sm text-red-500">{listError}</p><Button variant="secondary" size="sm" onClick={() => { setListError(""); void fetchList(currentPage, debouncedSearch, statusFilter); }}>Try Again</Button></div>}
        {!isLoading && !listError && list.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 gap-2">
            {hasActiveFilters ? <><p className="text-sm font-medium text-slate-500">No products match your filters.</p><div className="mt-2"><Button variant="secondary" size="sm" onClick={() => { setSearch(""); setStatusFilter(""); setCurrentPage(1); }}>Clear Filters</Button></div></> : <><p className="text-sm font-medium text-slate-500">No products yet.</p><p className="text-xs text-slate-400">Add your first product above.</p></>}
          </div>
        )}
        {!isLoading && !listError && list.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse min-w-[680px]">
              <thead><tr>{["Product", "Code", "Price", "Unit", "Status", "Actions"].map((h) => <th key={h} className="text-left px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider bg-[var(--color-paper)] border-b border-slate-100 whitespace-nowrap">{h}</th>)}</tr></thead>
              <tbody className="divide-y divide-slate-50">
                {list.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 text-sm font-medium text-slate-800">{p.productName}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">{p.productCode}</td>
                    <td className="px-6 py-4 text-sm font-semibold text-slate-700">₹{p.sellingPrice.toLocaleString("en-IN")}</td>
                    <td className="px-6 py-4 text-sm text-slate-500">{p.unit}</td>
                    <td className="px-6 py-4"><Badge label={p.status} variant={getStatusVariant(p.status)} /></td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button type="button" onClick={() => { closeAll(); setEditingProduct(p); setEditData({ productName: p.productName, productCode: p.productCode, sellingPrice: String(p.sellingPrice), unit: p.unit }); }} disabled={!!togglingId} className="text-xs font-medium text-[var(--color-accent-strong)] hover:text-[var(--color-accent-strong)] disabled:opacity-40 transition-colors">Edit</button>
                        <span className="text-slate-200">|</span>
                        <button type="button" onClick={() => void handleToggle(p)} disabled={togglingId === p.id} className={["text-xs font-medium transition-colors disabled:opacity-40", p.status === RECORD_STATUS.ACTIVE ? "text-red-500 hover:text-red-600" : "text-green-600 hover:text-green-700"].join(" ")}>
                          {togglingId === p.id ? "Updating..." : p.status === RECORD_STATUS.ACTIVE ? "Deactivate" : "Activate"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!isLoading && !listError && meta.totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100">
            <p className="text-xs text-slate-500">Showing <span className="font-medium text-slate-700">{(currentPage - 1) * meta.limit + 1}</span>{" – "}<span className="font-medium text-slate-700">{Math.min(currentPage * meta.limit, meta.total)}</span>{" of "}<span className="font-medium text-slate-700">{meta.total}</span></p>
            <div className="flex items-center gap-2">
              <Button variant="secondary" size="sm" disabled={currentPage === 1} onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}>Previous</Button>
              <span className="text-xs text-slate-500 min-w-[80px] text-center">Page {currentPage} of {meta.totalPages}</span>
              <Button variant="secondary" size="sm" disabled={currentPage === meta.totalPages} onClick={() => setCurrentPage((p) => Math.min(meta.totalPages, p + 1))}>Next</Button>
            </div>
          </div>
        )}
      </SectionCard>
    </div>
  );
}
