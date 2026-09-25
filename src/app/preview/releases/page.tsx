import type { Metadata } from "next";
import Link from "next/link";
import { Rocket, BarChart3, ArrowLeft } from "lucide-react";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { loadReleases, sortReleases, type Release } from "@/lib/preview-releases";

// PUBLIC internal build log, presented as a Change-Approval Board. Read the
// releases JSON at REQUEST time so orchestrator edits to the box data file show
// with no redeploy.
export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "ChooseYourTopic — change-approval board",
  description: "What changed in ChooseYourTopic, when it went live, and where to learn more — newest first.",
  robots: { index: false, follow: false },
};

function formatUpdated(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });
}

function formatDate(date: string): string {
  // Parse as a local date (avoid the UTC-midnight off-by-one on YYYY-MM-DD).
  const [y, m, d] = date.split("-").map(Number);
  const dt = y && m && d ? new Date(y, m - 1, d) : new Date(date);
  if (Number.isNaN(dt.getTime())) return date;
  return dt.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

function ChangeRow({ change, isLatest }: { change: Release; isLatest: boolean }) {
  const kb = change.kbLink;
  return (
    <li className="relative pl-8">
      {/* timeline dot */}
      <span
        className={`absolute left-0 top-2 h-3 w-3 rounded-full ring-4 ${
          isLatest ? "bg-brand ring-brand/20" : "bg-dim ring-line/40"
        }`}
        aria-hidden="true"
      />
      <div className="rounded-card border border-line bg-panel p-5">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          {/* (1) date */}
          <span className="text-[13px] font-semibold text-brand">{formatDate(change.date)}</span>
          {isLatest && (
            <span className="rounded-full bg-brand/15 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-brand ring-1 ring-inset ring-brand/25">
              Latest
            </span>
          )}
        </div>

        {/* (2) short description of the change */}
        <p className="mt-2 text-[15px] leading-relaxed text-mut">{change.description}</p>

        {/* (3) link to any knowledge article(s) about the change */}
        <div className="mt-3 text-[13px]">
          {kb?.url ? (
            <a
              href={kb.url}
              target={kb.url.startsWith("http") ? "_blank" : undefined}
              rel={kb.url.startsWith("http") ? "noopener noreferrer" : undefined}
              className="inline-flex items-center gap-1 font-medium text-brand hover:text-ink"
            >
              {kb.label || "Learn more"} <span aria-hidden="true">→</span>
            </a>
          ) : (
            <span className="text-dim">Knowledge article coming soon</span>
          )}
        </div>
      </div>
    </li>
  );
}

export default async function PreviewReleasesPage() {
  const data = await loadReleases();
  const changes = sortReleases(data.releases ?? []);

  return (
    <main className="mx-auto max-w-[860px] px-6 pb-24">
      <SiteHeader />

      <header className="mt-8 flex flex-col gap-4 border-b border-line pb-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-line bg-panel2 px-3 py-1 text-[12px] text-mut">
            <Rocket size={13} className="text-brand" /> Winslow orchestration · change-approval board
          </div>
          <h1 className="mt-3 text-[28px] font-extrabold tracking-[-0.6px] text-ink sm:text-[32px]">
            Change-approval <span className="cyt-gradient-text">board</span>
          </h1>
          <p className="mt-1 text-[14px] text-mut">
            What changed in ChooseYourTopic, when it went live, and where to learn more — newest first.
          </p>
        </div>
        <div className="shrink-0 rounded-xl border border-line bg-panel px-4 py-3 text-[13px]">
          <div className="text-[11px] font-medium uppercase tracking-wide text-dim">Last updated</div>
          <div className="mt-0.5 font-semibold text-ink">{formatUpdated(data.updatedAt)}</div>
          <div className="mt-1.5 flex flex-wrap gap-3 text-[12px]">
            <Link href="/preview/status" className="inline-flex items-center gap-1 font-medium text-brand hover:text-ink">
              <BarChart3 size={12} /> Status board
            </Link>
            <Link href="/preview" className="inline-flex items-center gap-1 font-medium text-mut hover:text-ink">
              <ArrowLeft size={12} /> The build
            </Link>
          </div>
        </div>
      </header>

      <p className="mt-4 rounded-xl border border-line bg-panel2 px-4 py-2.5 text-[12.5px] leading-relaxed text-mut">
        This is the internal orchestration change-approval board. The customer-facing product release notes live at{" "}
        <Link href="/releases" className="font-medium text-brand hover:text-ink">
          /releases
        </Link>
        .
      </p>

      <section className="mt-8">
        {changes.length ? (
          <ol className="space-y-6 border-l border-line pl-1">
            {changes.map((c, i) => (
              <ChangeRow key={`${c.date}-${i}`} change={c} isLatest={i === 0} />
            ))}
          </ol>
        ) : (
          <p className="rounded-xl border border-dashed border-line p-8 text-center text-dim">No changes recorded yet.</p>
        )}
      </section>

      <footer className="mt-14 border-t border-line pt-5 text-center text-[12px] text-dim">
        ChooseYourTopic — a Kuykendall Empire product · change-approval board reads live data
        {data.source === "bundled-fallback" && " · showing bundled fallback (box file not yet present)"}
      </footer>
    </main>
  );
}
