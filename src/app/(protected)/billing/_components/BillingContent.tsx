"use client";

import { useCallback, useEffect, useState } from "react";
import { Button, PageHeader, SectionCard } from "@/components/ui";
import { getAuthorizationHeader } from "@/lib/auth-storage";
import { PAGINATION } from "@/lib/constants";
import type { PaginationMeta } from "@/types";

// ─── Types ────────────────────────────────────────────────────────────────────

interface LookupResult {
  member: { id: string; fullName: string; mobileNumber: string | null };
  wallet: { id: string; currentBalance: number; status: string };
  card:   { id: string; cardNumber: string; status: string; expiresAt: string };
  readiness: { isReady: boolean; checks: Record<string, boolean> };
}

interface ProductResult {
  id: string; productName: string; productCode: string;
  sellingPrice: number; unit: string; currentStock: number;
}

interface CartItem {
  productId: string; productName: string; productCode: string;
  unit: string; unitPrice: number; quantity: number; subtotal: number;
  availableStock: number; // stock level at the time this was added — used to warn on over-selling
}

interface BillListRecord {
  id: string; memberName: string; cardNumber: string;
  totalAmount: number; itemCount: number;
  walletBalanceBefore: number; walletBalanceAfter: number;
  createdAt: string;
}

interface BillDetailRecord {
  id: string; memberName: string; cardNumber: string;
  items: Array<{ productId: string; productName: string; quantity: number; unitPrice: number; subtotal: number }>;
  totalAmount: number; walletBalanceBefore: number; walletBalanceAfter: number; createdAt: string;
}

const INITIAL_META: PaginationMeta = { page: 1, limit: PAGINATION.DEFAULT_LIMIT, total: 0, totalPages: 0 };

function formatCurrency(n: number) { return `₹${Number.isFinite(n) ? n.toLocaleString("en-IN") : "0"}`; }
function formatDate(iso: string) {
  return new Date(iso).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

const READINESS_LABELS: Record<string, string> = {
  memberActive:   "Member is active",
  walletExists:   "Wallet exists",
  walletActive:   "Wallet is active",
  cardAssigned:   "Card assigned",
  cardActive:     "Card is active",
  cardNotExpired: "Card is not expired",
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function BillingContent() {
  const [activeTab, setActiveTab] = useState<"new" | "history">("new");

  // ── New Bill State ─────────────────────────────────────────────────────────
  const [cardInput,     setCardInput]     = useState("");
  const [lookupResult,  setLookupResult]  = useState<LookupResult | null>(null);
  const [isLookingUp,   setIsLookingUp]   = useState(false);
  const [lookupError,   setLookupError]   = useState("");
  const [productSearch, setProductSearch] = useState("");
  const [productResults, setProductResults] = useState<ProductResult[]>([]);
  const [isSearchingProduct, setIsSearchingProduct] = useState(false);
  const [cart,          setCart]          = useState<CartItem[]>([]);
  const [processError,  setProcessError]  = useState("");
  const [isProcessing,  setIsProcessing]  = useState(false);
  const [lastBill,      setLastBill]      = useState<BillDetailRecord | null>(null);

  // ── Bill History State ─────────────────────────────────────────────────────
  const [billList,      setBillList]      = useState<BillListRecord[]>([]);
  const [meta,          setMeta]          = useState<PaginationMeta>(INITIAL_META);
  const [currentPage,   setCurrentPage]   = useState(1);
  const [isLoadingList, setIsLoadingList] = useState(false);
  const [listError,     setListError]     = useState("");
  const [histSearch,    setHistSearch]    = useState("");
  const [debouncedHistSearch, setDebouncedHistSearch] = useState("");
  const [selectedBill,  setSelectedBill]  = useState<BillDetailRecord | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  // ── Resume an in-progress bill across navigation ──────────────────────────
  // Without this, switching to another module (e.g. to double-check a
  // member's card) and coming back to Billing wiped the cart and card
  // lookup — a real problem mid-transaction. We persist the card number and
  // cart to sessionStorage (cleared when the tab closes, unlike
  // localStorage, since a half-finished bill shouldn't outlive the
  // session) and restore them on mount. We deliberately do NOT persist
  // lookupResult itself — it's re-fetched fresh on restore instead, so the
  // wallet balance / readiness shown is never stale (e.g. if someone else
  // billed this same member from another till in the meantime).
  const DRAFT_KEY = "billing:draft";
  const [hasRestoredDraft, setHasRestoredDraft] = useState(false);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(DRAFT_KEY);
      if (raw) {
        const draft = JSON.parse(raw) as { cardInput: string; cart: CartItem[] };
        if (draft.cardInput) {
          setCardInput(draft.cardInput);
          if (draft.cart?.length) setCart(draft.cart);
          // Re-run the lookup with fresh data rather than trusting a
          // possibly-stale cached wallet balance/readiness.
          void handleLookup(draft.cardInput, true);
        }
      }
    } catch {
      // Corrupt/unavailable storage — just start with a blank form.
    } finally {
      setHasRestoredDraft(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist the draft on every change, once initial restoration has run
  // (so we don't immediately overwrite a saved draft with an empty one
  // during the first render).
  useEffect(() => {
    if (!hasRestoredDraft) return;
    try {
      if (cardInput.trim() || cart.length > 0) {
        sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ cardInput, cart }));
      } else {
        sessionStorage.removeItem(DRAFT_KEY);
      }
    } catch {
      // Storage unavailable (private browsing, quota, etc.) — resuming
      // just won't work this session, which is a soft degradation, not
      // a functional break.
    }
  }, [cardInput, cart, hasRestoredDraft]);

  // ── Product search debounce ───────────────────────────────────────────────
  useEffect(() => {
    if (!productSearch.trim() || productSearch.length < 2) { setProductResults([]); return; }
    const t = setTimeout(async () => {
      setIsSearchingProduct(true);
      try {
        const auth = getAuthorizationHeader();
        const p = new URLSearchParams({ search: productSearch, limit: "8", page: "1", status: "Active" });
        const res = await fetch(`/api/products?${p}`, { headers: auth ? { Authorization: auth } : {} });
        const r = await res.json();
        if (r.success) setProductResults(r.data as ProductResult[]);
      } catch {} finally { setIsSearchingProduct(false); }
    }, 300);
    return () => clearTimeout(t);
  }, [productSearch]);

  // ── History search debounce ───────────────────────────────────────────────
  useEffect(() => {
    const t = setTimeout(() => { setDebouncedHistSearch(histSearch); setCurrentPage(1); }, 400);
    return () => clearTimeout(t);
  }, [histSearch]);

  // ── Fetch Bill List ───────────────────────────────────────────────────────
  const fetchBills = useCallback(async (page: number, search: string) => {
    setIsLoadingList(true); setListError("");
    try {
      const p = new URLSearchParams({ page: String(page), limit: String(PAGINATION.DEFAULT_LIMIT) });
      if (search) p.set("search", search);
      const auth = getAuthorizationHeader();
      const res = await fetch(`/api/billing?${p}`, { headers: auth ? { Authorization: auth } : {} });
      const r = await res.json();
      if (!r.success) { setListError(r.message ?? "Failed to load bills."); return; }
      setBillList(r.data as BillListRecord[]);
      if (r.meta) setMeta(r.meta as PaginationMeta);
    } catch { setListError("Unable to reach the server."); }
    finally { setIsLoadingList(false); }
  }, []);

  useEffect(() => {
    if (activeTab === "history") void fetchBills(currentPage, debouncedHistSearch);
  }, [activeTab, currentPage, debouncedHistSearch, fetchBills]);

  // ── Card Lookup ───────────────────────────────────────────────────────────
  async function handleLookup(cardNumberOverride?: string, isRestoring = false) {
    const cardNumber = cardNumberOverride ?? cardInput;
    if (!cardNumber.trim()) { setLookupError("Please enter a card number."); return; }
    setIsLookingUp(true); setLookupError(""); setLookupResult(null);
    if (!isRestoring) { setCart([]); setLastBill(null); }
    setProcessError("");
    try {
      const auth = getAuthorizationHeader();
      const p = new URLSearchParams({ cardNumber: cardNumber.trim() });
      const res = await fetch(`/api/billing/lookup?${p}`, { headers: auth ? { Authorization: auth } : {} });
      const r = await res.json();
      if (!r.success) { setLookupError(r.message ?? "Card not found."); return; }
      setLookupResult(r.data as LookupResult);
    } catch { setLookupError("Unable to reach the server."); }
    finally { setIsLookingUp(false); }
  }

  // ── Cart Management ───────────────────────────────────────────────────────
  function addToCart(product: ProductResult, quantity: number) {
    if (!Number.isInteger(quantity) || quantity <= 0) return;
    setCart((prev) => {
      const existing = prev.find((i) => i.productId === product.id);
      if (existing) {
        return prev.map((i) => i.productId === product.id
          ? { ...i, quantity: i.quantity + quantity, subtotal: (i.quantity + quantity) * i.unitPrice }
          : i
        );
      }
      return [...prev, {
        productId: product.id, productName: product.productName,
        productCode: product.productCode, unit: product.unit,
        unitPrice: product.sellingPrice, quantity,
        subtotal: quantity * product.sellingPrice,
        availableStock: product.currentStock,
      }];
    });
    setProductSearch(""); setProductResults([]);
  }

  function removeFromCart(productId: string) {
    setCart((prev) => prev.filter((i) => i.productId !== productId));
  }

  function updateCartQty(productId: string, qty: number) {
    if (!Number.isInteger(qty) || qty <= 0) return;
    setCart((prev) => prev.map((i) => i.productId === productId
      ? { ...i, quantity: qty, subtotal: qty * i.unitPrice } : i
    ));
  }

  const cartTotal = cart.reduce((sum, i) => sum + i.subtotal, 0);
  const hasEnoughBalance = lookupResult ? lookupResult.wallet.currentBalance >= cartTotal : false;

  // ── Process Bill ──────────────────────────────────────────────────────────
  async function handleProcessBill() {
    if (!lookupResult || cart.length === 0) return;
    setIsProcessing(true); setProcessError("");
    try {
      const auth = getAuthorizationHeader();
      const res = await fetch("/api/billing", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(auth ? { Authorization: auth } : {}) },
        body: JSON.stringify({
          cardNumber: cardInput.trim(),
          items: cart.map((i) => ({ productId: i.productId, quantity: i.quantity })),
        }),
      });
      const r = await res.json();
      if (!r.success) { setProcessError(r.message ?? "Billing failed."); return; }
      // Success: show receipt, reset form
      setLastBill(r.data as BillDetailRecord);
      setCart([]); setLookupResult(null); setCardInput("");
    } catch { setProcessError("Unable to reach the server."); }
    finally { setIsProcessing(false); }
  }

  // ── Load Bill Detail ──────────────────────────────────────────────────────
  async function handleViewBill(billId: string) {
    setIsLoadingDetail(true); setSelectedBill(null);
    try {
      const auth = getAuthorizationHeader();
      const res = await fetch(`/api/billing/${billId}`, { headers: auth ? { Authorization: auth } : {} });
      const r = await res.json();
      if (r.success) setSelectedBill(r.data as BillDetailRecord);
    } catch {} finally { setIsLoadingDetail(false); }
  }

  const inputClass = "w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:border-[var(--color-accent)] focus:ring-[var(--color-accent-soft)] transition-all";

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="p-6 flex flex-col gap-6">
      <PageHeader title="Billing" subtitle="Process member transactions" />

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit">
        {(["new", "history"] as const).map((tab) => (
          <button key={tab} type="button" onClick={() => setActiveTab(tab)}
            className={["px-5 py-2 rounded-lg text-sm font-medium transition-all", activeTab === tab ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"].join(" ")}>
            {tab === "new" ? "New Bill" : "Bill History"}
          </button>
        ))}
      </div>

      {/* ── NEW BILL TAB ──────────────────────────────────────────────────── */}
      {activeTab === "new" && (
        <div className="flex flex-col gap-6">

          {/* Success Receipt */}
          {lastBill && (
            <div className="bg-green-50 border border-green-200 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm font-semibold text-green-800">✓ Bill Processed Successfully</p>
                  <p className="text-xs text-green-700 mt-0.5">{lastBill.memberName} · {lastBill.cardNumber}</p>
                </div>
                <button type="button" onClick={() => setLastBill(null)} className="text-green-600 hover:text-green-700 text-lg">×</button>
              </div>
              <div className="grid grid-cols-2 gap-4 mb-4">
                {lastBill.items.map((item) => (
                  <div key={item.productId} className="flex justify-between text-sm">
                    <span className="text-slate-700">{item.productName} × {item.quantity}</span>
                    <span className="font-medium text-slate-800">{formatCurrency(item.subtotal)}</span>
                  </div>
                ))}
              </div>
              <div className="border-t border-green-200 pt-3 flex justify-between">
                <div>
                  <p className="text-xs text-green-600">Balance before: {formatCurrency(lastBill.walletBalanceBefore)}</p>
                  <p className="text-xs text-green-700 font-medium">Balance after: {formatCurrency(lastBill.walletBalanceAfter)}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-green-600">Total charged</p>
                  <p className="text-lg font-bold text-green-800 font-price">{formatCurrency(lastBill.totalAmount)}</p>
                </div>
              </div>
            </div>
          )}

          {/* Card Lookup */}
          <SectionCard title="Card Lookup">
            <div className="flex gap-3">
              <input type="text" placeholder="Enter card number (e.g. 1234-5678-9012-3456)" value={cardInput}
                onChange={(e) => { setCardInput(e.target.value); setLookupError(""); }}
                onKeyDown={(e) => e.key === "Enter" && void handleLookup()}
                className={inputClass + " flex-1"} />
              <Button variant="primary" onClick={() => void handleLookup()} isLoading={isLookingUp} disabled={!cardInput.trim()}>
                {isLookingUp ? "Looking up..." : "Lookup"}
              </Button>
            </div>
            {lookupError && <p className="mt-2 text-sm text-red-500">{lookupError}</p>}
          </SectionCard>

          {/* Member Info + Readiness */}
          {lookupResult && (
            <div className="grid grid-cols-2 gap-4">
              {/* Member + Wallet */}
              <SectionCard title="Member">
                <div className="flex flex-col gap-3">
                  <div>
                    <p className="text-base font-semibold text-slate-800">{lookupResult.member.fullName}</p>
                    {lookupResult.member.mobileNumber && <p className="text-sm text-slate-500">{lookupResult.member.mobileNumber}</p>}
                  </div>
                  <div className="bg-slate-50 rounded-xl px-4 py-3">
                    <p className="text-xs text-slate-500 mb-0.5">Wallet Balance</p>
                    <p className="text-2xl font-bold text-[var(--color-text)] font-price">{formatCurrency(lookupResult.wallet.currentBalance)}</p>
                    {cart.length > 0 && (
                      <>
                        <p className="text-xs text-slate-400 mt-1">Bill total: {formatCurrency(cartTotal)}</p>
                        <p className={["text-xs font-medium mt-0.5", hasEnoughBalance ? "text-green-600" : "text-red-500"].join(" ")}>
                          {hasEnoughBalance ? `After bill: ${formatCurrency(lookupResult.wallet.currentBalance - cartTotal)}` : "Insufficient balance"}
                        </p>
                      </>
                    )}
                  </div>
                </div>
              </SectionCard>

              {/* Readiness */}
              <SectionCard title="Billing Readiness">
                <div className="flex flex-col gap-2 mb-3">
                  {Object.entries(lookupResult.readiness.checks).map(([key, passed]) => (
                    <div key={key} className="flex items-center gap-2">
                      <span className={["w-4 h-4 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0", passed ? "bg-green-100 text-green-600" : "bg-red-100 text-red-500"].join(" ")}>
                        {passed ? "✓" : "✗"}
                      </span>
                      <span className={["text-xs", passed ? "text-slate-600" : "text-slate-400"].join(" ")}>
                        {READINESS_LABELS[key] ?? key}
                      </span>
                    </div>
                  ))}
                </div>
                <span className={["inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold", lookupResult.readiness.isReady ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"].join(" ")}>
                  <span className={["w-1.5 h-1.5 rounded-full", lookupResult.readiness.isReady ? "bg-green-500" : "bg-amber-500"].join(" ")} />
                  {lookupResult.readiness.isReady ? "Ready for billing" : "Not ready"}
                </span>
              </SectionCard>
            </div>
          )}

          {/* Items / Cart - only shown when member is ready */}
          {lookupResult?.readiness.isReady && (
            <SectionCard title="Items">
              {/* Product Search */}
              <div className="mb-4">
                <label className="text-sm font-medium text-slate-700 mb-1.5 block">Search and add products</label>
                <div className="relative">
                  <input type="text" placeholder="Type product name or code..." value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    className={inputClass} />
                  {(productResults.length > 0 || isSearchingProduct) && (
                    <div className="absolute top-full left-0 right-0 z-10 mt-1 bg-white rounded-xl border border-slate-200 shadow-lg overflow-hidden">
                      {isSearchingProduct && <p className="px-4 py-3 text-xs text-slate-400">Searching...</p>}
                      {productResults.map((product) => {
                        const isOutOfStock = product.currentStock <= 0;
                        const isLowStock = product.currentStock > 0 && product.currentStock < 10;
                        return (
                        <div
                          key={product.id}
                          onClick={() => {
                            const qtyInput = document.getElementById(`qty-${product.id}`) as HTMLInputElement;
                            addToCart(product, Number(qtyInput?.value || 1));
                          }}
                          className="flex items-center justify-between px-4 py-3 hover:bg-[var(--color-accent-soft)]/30 border-b border-slate-50 last:border-0 cursor-pointer transition-colors"
                        >
                          <div>
                            <p className="text-sm font-medium text-slate-800">{product.productName}</p>
                            <p className="text-xs text-slate-400">
                              {product.productCode} · {formatCurrency(product.sellingPrice)} / {product.unit}
                              {" · "}
                              <span className={isOutOfStock ? "text-red-500 font-medium" : isLowStock ? "text-amber-600 font-medium" : "text-slate-400"}>
                                {isOutOfStock ? "Out of stock" : `${product.currentStock} ${product.unit} in stock`}
                              </span>
                            </p>
                          </div>
                          <div className="flex items-center gap-2 ml-4" onClick={(e) => e.stopPropagation()}>
                            <input type="number" min="1" defaultValue={1} id={`qty-${product.id}`}
                              className="w-16 rounded-lg border border-slate-200 px-2 py-1 text-sm text-center focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]" />
                            <Button variant="primary" size="sm" onClick={() => {
                              const qtyInput = document.getElementById(`qty-${product.id}`) as HTMLInputElement;
                              addToCart(product, Number(qtyInput?.value || 1));
                            }}>Add</Button>
                          </div>
                        </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Cart */}
              {cart.length > 0 ? (
                <>
                  <table className="w-full border-collapse mb-4">
                    <thead>
                      <tr>
                        {["Product", "Price", "Qty", "Subtotal", ""].map((h) => (
                          <th key={h} className="text-left px-3 py-2 text-xs font-semibold text-slate-500 uppercase border-b border-slate-100">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {cart.map((item) => {
                        const exceedsStock = item.quantity > item.availableStock;
                        return (
                        <tr key={item.productId}>
                          <td className="px-3 py-3">
                            <p className="text-sm font-medium text-slate-800">{item.productName}</p>
                            <p className="text-xs text-slate-400">{item.productCode}</p>
                          </td>
                          <td className="px-3 py-3 text-sm text-slate-600">{formatCurrency(item.unitPrice)}</td>
                          <td className="px-3 py-3">
                            <input type="number" min="1" value={Number.isFinite(item.quantity) ? item.quantity : ""}
                              onChange={(e) => updateCartQty(item.productId, Number(e.target.value))}
                              className={[
                                "w-16 rounded-lg border px-2 py-1 text-sm text-center focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]",
                                exceedsStock ? "border-amber-300 bg-amber-50" : "border-slate-200",
                              ].join(" ")} />
                            {exceedsStock && (
                              <p className="text-[11px] text-amber-600 font-medium mt-1 whitespace-nowrap">
                                Only {item.availableStock} in stock
                              </p>
                            )}
                          </td>
                          <td className="px-3 py-3 text-sm font-semibold text-slate-700">{formatCurrency(item.subtotal)}</td>
                          <td className="px-3 py-3">
                            <button type="button" onClick={() => removeFromCart(item.productId)} className="text-xs text-red-400 hover:text-red-600 transition-colors">Remove</button>
                          </td>
                        </tr>
                        );
                      })}
                    </tbody>
                  </table>

                  {/* Low stock summary warning */}
                  {cart.some((i) => i.quantity > i.availableStock) && (
                    <div className="mb-4 flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                      <span className="text-amber-500 text-sm leading-none mt-0.5">⚠</span>
                      <p className="text-xs text-amber-700">
                        One or more items in this cart exceed the currently available stock. You can still process this bill, but stock will go negative — double-check before continuing.
                      </p>
                    </div>
                  )}

                  {/* Total + Process */}
                  <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                    <div>
                      <p className="text-sm text-slate-500">Total Amount</p>
                      <p className="text-2xl font-bold text-[var(--color-text)] font-price">{formatCurrency(cartTotal)}</p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      {!hasEnoughBalance && (
                        <p className="text-xs text-red-500 font-medium">Insufficient wallet balance</p>
                      )}
                      {processError && (
                        <p className="text-xs text-red-500 max-w-[260px] text-right">{processError}</p>
                      )}
                      <Button variant="primary" onClick={() => void handleProcessBill()}
                        isLoading={isProcessing} disabled={!hasEnoughBalance || isProcessing}>
                        {isProcessing ? "Processing..." : `Process Bill · ${formatCurrency(cartTotal)}`}
                      </Button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-10 gap-2">
                  <p className="text-sm font-medium text-slate-400">Cart is empty</p>
                  <p className="text-xs text-slate-300">Search for products above to add them</p>
                </div>
              )}
            </SectionCard>
          )}
        </div>
      )}

      {/* ── HISTORY TAB ─────────────────────────────────────────────────────── */}
      {activeTab === "history" && (
        <div className="flex flex-col gap-4">
          <div className="flex-1 min-w-[200px] max-w-xs">
            <input type="search" placeholder="Search by member name..." value={histSearch}
              onChange={(e) => setHistSearch(e.target.value)} className={inputClass} />
          </div>

          <div className={selectedBill ? "grid gap-4 items-start" : ""} style={selectedBill ? { gridTemplateColumns: "1fr 340px" } : {}}>
            <SectionCard title="Bill History" noPadding
              actions={<Button variant="secondary" size="sm" onClick={() => void fetchBills(currentPage, debouncedHistSearch)} disabled={isLoadingList}>{isLoadingList ? "Loading..." : "Refresh"}</Button>}>
              {isLoadingList && <div className="flex items-center justify-center py-16 gap-2"><span className="flex gap-1"><span className="w-2 h-2 rounded-full bg-slate-300 animate-bounce [animation-delay:0ms]" /><span className="w-2 h-2 rounded-full bg-slate-300 animate-bounce [animation-delay:150ms]" /><span className="w-2 h-2 rounded-full bg-slate-300 animate-bounce [animation-delay:300ms]" /></span><span className="text-sm text-slate-400">Loading bills...</span></div>}
              {!isLoadingList && listError && <div className="flex flex-col items-center justify-center py-16 gap-3"><p className="text-sm text-red-500">{listError}</p><Button variant="secondary" size="sm" onClick={() => void fetchBills(currentPage, debouncedHistSearch)}>Try Again</Button></div>}
              {!isLoadingList && !listError && billList.length === 0 && <div className="flex items-center justify-center py-16"><p className="text-sm font-medium text-slate-500">No bills processed yet.</p></div>}
              {!isLoadingList && !listError && billList.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse min-w-[640px]">
                    <thead><tr>{["Member", "Card", "Items", "Total", "Balance After", "Date"].map((h) => <th key={h} className="text-left px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider bg-[var(--color-paper)] border-b border-slate-100 whitespace-nowrap">{h}</th>)}</tr></thead>
                    <tbody className="divide-y divide-slate-50">
                      {billList.map((bill) => (
                        <tr key={bill.id} onClick={() => void handleViewBill(bill.id)}
                          className={["cursor-pointer transition-colors", selectedBill?.id === bill.id ? "bg-[var(--color-accent-soft)]/40/60" : "hover:bg-slate-50/50"].join(" ")}>
                          <td className="px-6 py-4 text-sm font-medium text-slate-800">{bill.memberName}</td>
                          <td className="px-6 py-4 text-xs font-mono text-slate-600">{bill.cardNumber}</td>
                          <td className="px-6 py-4 text-sm text-slate-500">{bill.itemCount} item{bill.itemCount !== 1 ? "s" : ""}</td>
                          <td className="px-6 py-4 text-sm font-bold text-slate-700">{formatCurrency(bill.totalAmount)}</td>
                          <td className="px-6 py-4 text-sm text-slate-500">{formatCurrency(bill.walletBalanceAfter)}</td>
                          <td className="px-6 py-4 text-xs text-slate-500 whitespace-nowrap">{formatDate(bill.createdAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {!isLoadingList && !listError && meta.totalPages > 1 && (
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

            {/* Bill Detail Panel */}
            {selectedBill && (
              <aside className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-700">Bill Details</h3>
                  <button type="button" onClick={() => setSelectedBill(null)} className="text-slate-400 hover:text-slate-600 text-lg leading-none">×</button>
                </div>
                {isLoadingDetail ? (
                  <div className="flex items-center justify-center py-10">
                    <span className="flex gap-1"><span className="w-2 h-2 rounded-full bg-slate-300 animate-bounce [animation-delay:0ms]" /><span className="w-2 h-2 rounded-full bg-slate-300 animate-bounce [animation-delay:150ms]" /><span className="w-2 h-2 rounded-full bg-slate-300 animate-bounce [animation-delay:300ms]" /></span>
                  </div>
                ) : (
                  <div className="px-5 py-5 flex flex-col gap-4">
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{selectedBill.memberName}</p>
                      <p className="text-xs font-mono text-slate-400 mt-0.5">{selectedBill.cardNumber}</p>
                      <p className="text-xs text-slate-400 mt-1">{formatDate(selectedBill.createdAt)}</p>
                    </div>
                    <div className="border-t border-slate-100" />
                    <div className="flex flex-col gap-2">
                      {selectedBill.items.map((item) => (
                        <div key={item.productId} className="flex justify-between items-center">
                          <div>
                            <p className="text-xs font-medium text-slate-700">{item.productName}</p>
                            <p className="text-xs text-slate-400">× {item.quantity} @ {formatCurrency(item.unitPrice)}</p>
                          </div>
                          <p className="text-xs font-semibold text-slate-700">{formatCurrency(item.subtotal)}</p>
                        </div>
                      ))}
                    </div>
                    <div className="border-t border-slate-100 pt-3">
                      <div className="flex justify-between mb-1">
                        <span className="text-sm text-slate-500">Total</span>
                        <span className="text-base font-bold text-[var(--color-text)] font-price">{formatCurrency(selectedBill.totalAmount)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-xs text-slate-400">Balance before</span>
                        <span className="text-xs text-slate-500">{formatCurrency(selectedBill.walletBalanceBefore)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-xs text-slate-400">Balance after</span>
                        <span className="text-xs font-medium text-slate-600">{formatCurrency(selectedBill.walletBalanceAfter)}</span>
                      </div>
                    </div>
                  </div>
                )}
              </aside>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
