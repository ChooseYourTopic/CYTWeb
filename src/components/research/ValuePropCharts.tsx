"use client";

import { useMemo, useState } from "react";
import { TrendingUp } from "lucide-react";

/**
 * Earning-potential projection for the topic, broken out by marketing channel.
 * Two views of ONE measure (projected monthly $): a magnitude bar rank by channel
 * and a 12-month cumulative growth curve. Single-hue (magnitude, not category), so
 * no categorical palette. Numbers are a deterministic, illustrative model seeded
 * from the topic — clearly labelled a projection, meant to be refined with live data.
 */

const CHANNELS: { key: string; label: string; weight: number }[] = [
  { key: "paid_ads", label: "Paid ads", weight: 0.24 },
  { key: "seo", label: "SEO / organic", weight: 0.2 },
  { key: "content", label: "Content", weight: 0.16 },
  { key: "email", label: "Email", weight: 0.14 },
  { key: "social", label: "Social", weight: 0.12 },
  { key: "influencer", label: "Influencer", weight: 0.08 },
  { key: "referral", label: "Referral", weight: 0.06 },
];

/** Stable hash → a per-topic base so the projection is consistent, not random. */
function seedFrom(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

function usd(n: number): string {
  if (n >= 1000) return `$${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k`;
  return `$${Math.round(n)}`;
}

export function ValuePropCharts({ seedKey }: { seedKey: string }) {
  const model = useMemo(() => {
    const seed = seedFrom(seedKey || "topic");
    const baseMonthly = 4000 + (seed % 12000); // $4k–$16k/mo projected at maturity
    const channels = CHANNELS.map((c) => ({
      ...c,
      monthly: Math.round((baseMonthly * c.weight) / 50) * 50,
    })).sort((a, b) => b.monthly - a.monthly);
    const max = Math.max(...channels.map((c) => c.monthly));

    // 12-month cumulative: a 6-month ramp to full run-rate, then steady.
    let cum = 0;
    const curve = Array.from({ length: 12 }, (_, i) => {
      const ramp = Math.min(1, (i + 1) / 6);
      cum += baseMonthly * ramp;
      return cum;
    });
    return { baseMonthly, channels, max, curve, total12: cum };
  }, [seedKey]);

  return (
    <div className="mt-3 space-y-4">
      {/* Headline stat */}
      <div className="flex flex-wrap items-end justify-between gap-3 rounded-xl border border-line bg-panel px-4 py-3">
        <div>
          <div className="text-[11px] uppercase tracking-wide text-dim">
            Projected run-rate
          </div>
          <div className="mt-0.5 flex items-baseline gap-1.5">
            <span className="text-[24px] font-bold tabular-nums text-ink">
              {usd(model.baseMonthly)}
            </span>
            <span className="text-[12px] text-mut">/ month at maturity</span>
          </div>
        </div>
        <div className="inline-flex items-center gap-1.5 rounded-full border border-[#1f3d2e] bg-[#0e1c16] px-3 py-1 text-[12px] font-semibold text-good">
          <TrendingUp size={13} /> {usd(model.total12)} projected in year one
        </div>
      </div>

      {/* Magnitude by channel — single-hue horizontal bars */}
      <div>
        <div className="mb-2 text-[11px] uppercase tracking-wide text-dim">
          Earning potential by marketing channel
        </div>
        <div className="space-y-1.5">
          {model.channels.map((c) => {
            const pct = model.max > 0 ? (c.monthly / model.max) * 100 : 0;
            return (
              <div
                key={c.key}
                className="group grid grid-cols-[92px_1fr_auto] items-center gap-2.5"
                title={`${c.label}: ${usd(c.monthly)}/mo projected`}
              >
                <span className="truncate text-[12.5px] text-mut">{c.label}</span>
                <div className="h-3 w-full overflow-hidden rounded-full bg-panel">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-brand/70 to-brand transition-[width] duration-500 group-hover:from-brand group-hover:to-good"
                    style={{ width: `${Math.max(4, pct)}%` }}
                  />
                </div>
                <span className="w-[46px] text-right text-[12px] font-semibold tabular-nums text-ink">
                  {usd(c.monthly)}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* 12-month cumulative growth curve */}
      <div>
        <div className="mb-2 text-[11px] uppercase tracking-wide text-dim">
          Cumulative earning projection · 12 months
        </div>
        <GrowthCurve values={model.curve} />
      </div>

      <p className="text-[11px] leading-relaxed text-dim">
        Projection — an illustrative model of channel mix and ramp for this project.
        It sharpens into real figures as your agents capture live revenue and spend.
      </p>
    </div>
  );
}

/** A compact area+line growth curve with hover dots. Pure SVG, single hue. */
function GrowthCurve({ values }: { values: number[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const W = 520;
  const H = 120;
  const pad = { l: 6, r: 6, t: 8, b: 18 };
  const max = Math.max(...values, 1);
  const iw = W - pad.l - pad.r;
  const ih = H - pad.t - pad.b;
  const x = (i: number) => pad.l + (i / (values.length - 1)) * iw;
  const y = (v: number) => pad.t + ih - (v / max) * ih;
  const line = values.map((v, i) => `${i === 0 ? "M" : "L"}${x(i)},${y(v)}`).join(" ");
  const area = `${line} L${x(values.length - 1)},${pad.t + ih} L${x(0)},${pad.t + ih} Z`;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full"
      role="img"
      aria-label="Cumulative earning projection over 12 months"
      onMouseLeave={() => setHover(null)}
    >
      <defs>
        <linearGradient id="vp-area" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--brand)" stopOpacity="0.28" />
          <stop offset="100%" stopColor="var(--brand)" stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* recessive baseline */}
      <line x1={pad.l} y1={pad.t + ih} x2={W - pad.r} y2={pad.t + ih} stroke="var(--line)" strokeWidth="1" />
      <path d={area} fill="url(#vp-area)" />
      <path d={line} fill="none" stroke="var(--brand)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      {/* month ticks + hover targets */}
      {values.map((v, i) => (
        <g key={i}>
          <rect
            x={x(i) - iw / values.length / 2}
            y={pad.t}
            width={iw / values.length}
            height={ih}
            fill="transparent"
            onMouseEnter={() => setHover(i)}
          />
          {hover === i && (
            <>
              <circle cx={x(i)} cy={y(v)} r="4" fill="var(--brand)" stroke="var(--panel)" strokeWidth="2" />
              <text x={x(i)} y={y(v) - 8} textAnchor="middle" className="fill-ink" fontSize="11" fontWeight="700">
                {usd(v)}
              </text>
            </>
          )}
          {(i === 0 || i === values.length - 1 || i === 5) && (
            <text x={x(i)} y={H - 4} textAnchor={i === 0 ? "start" : i === values.length - 1 ? "end" : "middle"} className="fill-dim" fontSize="10">
              M{i + 1}
            </text>
          )}
        </g>
      ))}
    </svg>
  );
}
