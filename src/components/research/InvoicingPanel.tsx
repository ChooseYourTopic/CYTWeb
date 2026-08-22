"use client";

import { useMemo, useState } from "react";
import { FileText, Plus, CircleDollarSign, Clock, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Invoicing — the topic's billing surface: outstanding vs paid at a glance and a
 * running list of invoices. Scaffold / interface pass (mock rows, config-gated) —
 * the create + send + payment-tracking backend wires to the topic's finance engine
 * next; live for feedback now.
 */

type InvoiceStatus = "draft" | "sent" | "paid" | "overdue";

type Invoice = {
  id: string;
  client: string;
  amount: number;
  status: InvoiceStatus;
  due: string;
};

const MOCK_INVOICES: Invoice[] = [
  { id: "INV-1042", client: "Northman Exteriors", amount: 2450, status: "sent", due: "in 12 days" },
  { id: "INV-1041", client: "Cedar & Co.", amount: 890, status: "paid", due: "paid" },
  { id: "INV-1039", client: "Harbor Media", amount: 1600, status: "overdue", due: "9 days ago" },
  { id: "INV-1038", client: "Bluebird Roofing", amount: 3200, status: "paid", due: "paid" },
];

const STATUS_STYLE: Record<InvoiceStatus, string> = {
  draft: "border-line bg-panel2 text-mut",
  sent: "border-brand/40 bg-brand/10 text-brand",
  paid: "border-good/40 bg-good/10 text-good",
  overdue: "border-bad/50 bg-bad/10 text-bad",
};

function money(n: number) {
  return "$" + n.toLocaleString("en-US");
}

export function InvoicingPanel() {
  const [invoices] = useState<Invoice[]>(MOCK_INVOICES);

  const { outstanding, paid } = useMemo(() => {
    let o = 0;
    let p = 0;
    for (const inv of invoices) {
      if (inv.status === "paid") p += inv.amount;
      else o += inv.amount;
    }
    return { outstanding: o, paid: p };
  }, [invoices]);

  return (
    <div className="space-y-5 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-[15px] font-semibold">Invoicing</h3>
          <p className="text-[13px] text-mut">
            Bill clients and track what&apos;s outstanding. This is the interface pass —
            creating and sending live invoices wires to your finance engine next.
          </p>
        </div>
        <button
          type="button"
          title="New invoice — the create flow is being wired up"
          className="inline-flex flex-none items-center gap-1.5 rounded-xl border border-line bg-panel2 px-3 py-2 text-[13px] text-mut transition-colors hover:text-ink"
        >
          <Plus size={14} /> New invoice
        </button>
      </div>

      {/* Summary tiles */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-line bg-panel p-4">
          <div className="flex items-center gap-1.5 text-[12px] uppercase tracking-wide text-mut">
            <Clock size={13} /> Outstanding
          </div>
          <div className="mt-1 text-[22px] font-bold text-ink">{money(outstanding)}</div>
        </div>
        <div className="rounded-2xl border border-line bg-panel p-4">
          <div className="flex items-center gap-1.5 text-[12px] uppercase tracking-wide text-mut">
            <CheckCircle2 size={13} /> Paid
          </div>
          <div className="mt-1 text-[22px] font-bold text-good">{money(paid)}</div>
        </div>
        <div className="rounded-2xl border border-line bg-panel p-4">
          <div className="flex items-center gap-1.5 text-[12px] uppercase tracking-wide text-mut">
            <CircleDollarSign size={13} /> Invoices
          </div>
          <div className="mt-1 text-[22px] font-bold text-ink">{invoices.length}</div>
        </div>
      </div>

      {/* Invoice list */}
      <div className="overflow-hidden rounded-2xl border border-line">
        <div className="flex items-center gap-2 border-b border-line bg-panel2 px-4 py-2.5 text-[12px] uppercase tracking-wider text-dim">
          <FileText size={13} /> Recent invoices
        </div>
        <div className="divide-y divide-line">
          {invoices.map((inv) => (
            <div key={inv.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <div className="truncate text-[13px] font-semibold text-ink">{inv.client}</div>
                <div className="font-mono text-[11.5px] text-dim">{inv.id} · {inv.due}</div>
              </div>
              <div className="flex flex-none items-center gap-3">
                <span className="text-[14px] font-semibold text-ink">{money(inv.amount)}</span>
                <span
                  className={cn(
                    "rounded-full border px-2 py-0.5 text-[11px] font-semibold capitalize",
                    STATUS_STYLE[inv.status],
                  )}
                >
                  {inv.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
