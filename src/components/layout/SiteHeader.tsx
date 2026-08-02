import Link from "next/link";
import { BRAND } from "@/lib/brand";

/**
 * Shared top bar (logo + nav). Extracted so the landing and auth pages share
 * one header and the nav links are wired in a single place.
 */
export function SiteHeader() {
  return (
    <header className="mb-2 mt-9 flex items-center justify-between">
      <Link
        href="/"
        className="flex items-center gap-3 text-[19px] font-bold tracking-tight"
      >
        <div className="cyt-gradient-bg grid h-[30px] w-[30px] place-items-center rounded-[9px] font-extrabold text-bg">
          {BRAND.MARK}
        </div>
        {BRAND.APP_NAME}
      </Link>
      <nav className="flex items-center gap-[18px] text-[13.5px] text-mut">
        <span className="cursor-default">How it works</span>
        <span className="cursor-default">Pricing</span>
        <Link href="/signin" className="transition-colors hover:text-ink">
          Sign in
        </Link>
      </nav>
    </header>
  );
}
