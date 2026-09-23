import type { Metadata } from "next";
import Link from "next/link";
import { Rocket, BarChart3, ArrowLeft } from "lucide-react";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { loadReleases, sortReleases, type Release } from "@/lib/preview-releases";

// PUBLIC internal build log. Read the releases JSON at REQUEST time so
// orchestrator edits to the box data file show with no redeploy.
export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "ChooseYourTopic — build log",
  description: "Winslow orchestration build milestones for ChooseYourTopic, newest first.",
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
  const [y, m, d] = date.split("-").map(Number);
  const dt = y && m && d ? new Date(y, m - 1, d) : new Date(date);
  if (Number.isNaN(dt.getTime())) return date;
  return dt.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

function ReleaseCard({ release, isLatest }: { release: Release; isLatest: boolean }) {
  return (
    <li className="relative pl-8">
      <span
        className={`absolute left-0 top-1.5 h-3 w-3 rounded-full ring-4 ${
          isLatest ? "bg-brand ring-brand/20" : "bg-dim ring-line/40"
        }`}
        aria-hidden="true"
      />
      <div className="rounded-card border border-line bg-panel p-5">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="rounded-md bg-bg px-2 py-0.5 text-[12px] font-semibold text-brand">v{release.version}</span>
          <h2 className="text-[18px] font-bold tracking-[-0.3px] text-ink">{release.title}</h2>
          {isLatest && (
            <span className="rounded-full bg-brand/15 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-brand ring-1 ring-inset ring-brand/25">
              Latest
            </span>
          )}
          <span className="ml-auto text-[13px] text-dim">{formatDate(release.date)}</span>
        </div>

        {release.highlights?.length > 0 && (
          <ul className="mt-4 space-y-2">
            {release.highlights.map((h, i) => (
              <li key={i} className="flex gap-2.5 text-[14px] leading-relaxed text-mut">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" aria-hidden="true" />
                <span>{h}</span>
              </li>
            ))}
          </ul>
        )}

        {release.notes && (
          <p className="mt-4 rounded-xl border border-line bg-panel2 px-4 py-3 text-[13px] leading-relaxed text-mut">
            {release.notes}
          </p>
        )}
      </div>
    </li>
  );
}

export default async function PreviewReleasesPage() {
  const data = await loadReleases();
  const releases = sortReleases(data.releases ?? []);

  return (
    <main className="mx-auto max-w-[860px] px-6 pb-24">
      <SiteHeader />

      <header className="mt-8 flex flex-col gap-4 border-b border-line pb-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-line bg-panel2 px-3 py-1 text-[12px] text-mut">
            <Rocket size={13} className="text-brand" /> Winslow orchestration · build log
          </div>
          <h1 className="mt-3 text-[28px] font-extrabold tracking-[-0.6px] text-ink sm:text-[32px]">
            Build <span className="cyt-gradient-text">log</span>
          </h1>
          <p className="mt-1 text-[14px] text-mut">Shipped orchestration milestones for ChooseYourTopic — newest first.</p>
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
        This is the internal orchestration build log. The customer-facing product release notes live at{" "}
        <Link href="/releases" className="font-medium text-brand hover:text-ink">
          /releases
        </Link>
        .
      </p>

      <section className="mt-8">
        {releases.length ? (
          <ol className="space-y-6 border-l border-line pl-1">
            {releases.map((r, i) => (
              <ReleaseCard key={`${r.version}-${r.date}`} release={r} isLatest={i === 0} />
            ))}
          </ol>
        ) : (
          <p className="rounded-xl border border-dashed border-line p-8 text-center text-dim">No milestones published yet.</p>
        )}
      </section>

      <footer className="mt-14 border-t border-line pt-5 text-center text-[12px] text-dim">
        ChooseYourTopic — a Kuykendall Empire product · build log reads live data
        {data.source === "bundled-fallback" && " · showing bundled fallback (box file not yet present)"}
      </footer>
    </main>
  );
}
