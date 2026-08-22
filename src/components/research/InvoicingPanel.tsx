"use client";

import { useCallback, useEffect, useState } from "react";
import {
  FileText,
  Plus,
  CircleDollarSign,
  Clock,
  CheckCircle2,
  Loader2,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ContextDropInput } from "@/components/research/ContextDropInput";
import {
  cytapi,
  type InvoicingLedger,
  type Invoice,
  type InvoiceStatus,
  type IntegrationHealth,
} from "@/lib/api";

/**
 * Invoicing — the topic's billing LEDGER: outstanding vs paid at a glance and a
 * running list of invoices, live from the topic's invoicing engine. CYT records
 * payment status; it is not a merchant (no in-app checkout). "New invoice" raises a
 * row; each invoice can be marked paid. The processor mode pill reflects the
 * connected payment processor (Simulated until a key is connected).
 */

const STATUS_STYLE: Record<InvoiceStatus, string> = {
  draft: "border-line bg-panel2 text-mut",
  sent: "border-brand/40 bg-brand/10 text-brand",
  paid: "border-good/40 bg-good/10 text-good",
  overdue: "border-bad/50 bg-bad/10 text-bad",
};

/** Live / Simulated pill from the processor's health. */
function ModeBadge({ health }: { health: IntegrationHealth }) {
  const live = health.mode === "live" && health.ok;
  return (
    <span
      title={health.detail}
      className={`rounded-full border px-2 py-0.5 text-[10.5px] font-medium uppercase tracking-wide ${
        live
          ? "border-[#1f3d2e] bg-[#0e1c16] text-good"
          : "border-line bg-panel2 text-mut"
      }`}
    >
      {live ? "Live" : "Simulated"}
    </span>
  );
}

/** Cents → "$1,234" (whole-dollar display; cents kept exact under the hood). */
function money(cents: number) {
  return "$" + Math.round(cents / 100).toLocaleString("en-US");
}

/** A derived-status label for a row (overdue is derived server-side). */
function rowStatus(inv: Invoice): InvoiceStatus {
  return inv.overdue && inv.status !== "paid" ? "overdue" : inv.status;
}

export function InvoicingPanel({ topicId }: { topicId: string }) {
  const [ledger, setLedger] = useState<InvoicingLedger | null>(null);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);

  // New-invoice form fields.
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [amount, setAmount] = useState("");

  const load = useCallback(async () => {
    try {
      setLedger(await cytapi.invoicing(topicId));
    } catch {
      /* fail-soft — keep the last good ledger */
    } finally {
      setLoading(false);
    }
  }, [topicId]);

  useEffect(() => {
    load();
  }, [load]);

  async function createInvoice() {
    const name = clientName.trim();
    const dollars = parseFloat(amount);
    if (!name || !Number.isFinite(dollars) || dollars < 0 || saving) return;
    setSaving(true);
    try {
      await cytapi.createInvoice(topicId, {
        client_name: name,
        client_email: clientEmail.trim() || undefined,
        amount_cents: Math.round(dollars * 100),
        status: "sent",
      });
      setClientName("");
      setClientEmail("");
      setAmount("");
      setFormOpen(false);
      await load();
    } catch {
      /* fail-soft */
    } finally {
      setSaving(false);
    }
  }

  async function markPaid(inv: Invoice) {
    if (busyId) return;
    setBusyId(inv.id);
    try {
      await cytapi.updateInvoice(topicId, inv.id, { status: "paid" });
      await load();
    } catch {
      /* fail-soft */
    } finally {
      setBusyId(null);
    }
  }

  const invoices = ledger?.invoices ?? [];

  return (
    <div className="space-y-5 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 text-[15px] font-semibold">
            Invoicing
            {ledger?.processor && <ModeBadge health={ledger.processor} />}
          </h3>
          <p className="text-[13px] text-mut">
            Bill clients and track what&apos;s outstanding. Payment status flows in
            from your connected processor — connect one to go live; until then this
            records payments you mark paid.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setFormOpen((v) => !v)}
          title="Raise a new invoice"
          className="inline-flex flex-none items-center gap-1.5 rounded-xl border border-line bg-panel2 px-3 py-2 text-[13px] text-mut transition-colors hover:text-ink"
        >
          <Plus size={14} /> New invoice
        </button>
      </div>

      {/* New-invoice inline form */}
      {formOpen && (
        <div className="rounded-2xl border border-line bg-panel p-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-[12.5px] font-semibold text-ink">
              New invoice
            </span>
            <button
              type="button"
              onClick={() => setFormOpen(false)}
              className="text-dim transition-colors hover:text-ink"
              aria-label="Close"
            >
              <X size={15} />
            </button>
          </div>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            <input
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="Client name"
              className="rounded-xl border border-line bg-panel2 px-3 py-2 text-[13px] text-ink placeholder:text-dim focus:outline-none"
            />
            <input
              value={clientEmail}
              onChange={(e) => setClientEmail(e.target.value)}
              placeholder="Client email (optional)"
              className="rounded-xl border border-line bg-panel2 px-3 py-2 text-[13px] text-ink placeholder:text-dim focus:outline-none"
            />
            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              inputMode="decimal"
              placeholder="Amount (USD)"
              className="rounded-xl border border-line bg-panel2 px-3 py-2 text-[13px] text-ink placeholder:text-dim focus:outline-none"
            />
            <button
              type="button"
              onClick={createInvoice}
              disabled={saving || !clientName.trim() || !amount.trim()}
              className="cyt-gradient-bg inline-flex items-center justify-center gap-1.5 rounded-xl px-3.5 py-2 text-[13px] font-bold text-bg transition-opacity disabled:opacity-50"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
              {saving ? "Raising…" : "Raise invoice"}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-[13px] text-mut">Loading your invoices…</p>
      ) : (
        <>
          {/* Summary tiles */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-line bg-panel p-4">
              <div className="flex items-center gap-1.5 text-[12px] uppercase tracking-wide text-mut">
                <Clock size={13} /> Outstanding
              </div>
              <div className="mt-1 text-[22px] font-bold text-ink">
                {money(ledger?.outstanding_cents ?? 0)}
              </div>
            </div>
            <div className="rounded-2xl border border-line bg-panel p-4">
              <div className="flex items-center gap-1.5 text-[12px] uppercase tracking-wide text-mut">
                <CheckCircle2 size={13} /> Paid
              </div>
              <div className="mt-1 text-[22px] font-bold text-good">
                {money(ledger?.paid_cents ?? 0)}
              </div>
            </div>
            <div className="rounded-2xl border border-line bg-panel p-4">
              <div className="flex items-center gap-1.5 text-[12px] uppercase tracking-wide text-mut">
                <CircleDollarSign size={13} /> Invoices
              </div>
              <div className="mt-1 text-[22px] font-bold text-ink">
                {ledger?.count ?? 0}
              </div>
            </div>
          </div>

          {/* Invoice list */}
          <div className="overflow-hidden rounded-2xl border border-line">
            <div className="flex items-center gap-2 border-b border-line bg-panel2 px-4 py-2.5 text-[12px] uppercase tracking-wider text-dim">
              <FileText size={13} /> Recent invoices
            </div>
            {invoices.length === 0 ? (
              <p className="px-4 py-6 text-[13px] text-mut">
                No invoices yet — raise your first one above.
              </p>
            ) : (
              <div className="divide-y divide-line">
                {invoices.map((inv) => {
                  const status = rowStatus(inv);
                  return (
                    <div
                      key={inv.id}
                      className="flex items-center justify-between gap-3 px-4 py-3"
                    >
                      <div className="min-w-0">
                        <div className="truncate text-[13px] font-semibold text-ink">
                          {inv.client_name}
                        </div>
                        <div className="font-mono text-[11.5px] text-dim">
                          INV-{inv.id}
                          {inv.due_at
                            ? ` · due ${new Date(inv.due_at).toLocaleDateString()}`
                            : ""}
                        </div>
                      </div>
                      <div className="flex flex-none items-center gap-3">
                        <span className="text-[14px] font-semibold text-ink">
                          {money(inv.amount_cents)}
                        </span>
                        <span
                          className={cn(
                            "rounded-full border px-2 py-0.5 text-[11px] font-semibold capitalize",
                            STATUS_STYLE[status],
                          )}
                        >
                          {status}
                        </span>
                        {status !== "paid" && (
                          <button
                            type="button"
                            onClick={() => markPaid(inv)}
                            disabled={busyId === inv.id}
                            title="Mark this invoice paid"
                            className="inline-flex items-center gap-1 rounded-lg border border-line px-2 py-1 text-[11.5px] font-semibold text-mut transition-colors hover:text-ink disabled:opacity-50"
                          >
                            {busyId === inv.id ? (
                              <Loader2 size={12} className="animate-spin" />
                            ) : (
                              <CheckCircle2 size={12} />
                            )}
                            Mark paid
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {/* Type or SPEAK billing context — drops onto the roadmap for Winslow. */}
      <ContextDropInput topicId={topicId} area="Invoicing" />
    </div>
  );
}
