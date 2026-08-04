"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BRAND } from "@/lib/brand";
import { cytapi } from "@/lib/api";

/**
 * Shared top bar (logo + nav), auth-aware. Signed in: How it works · Advanced
 * tools · My profile, and the logo returns to the dashboard. Signed out: How it
 * works · Sign in · Join the waiting list, logo to the landing page.
 */
export function SiteHeader() {
  // null = unknown (don't flash the wrong nav — e.g. "Sign in" on the dashboard).
  const [authed, setAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    cytapi
      .me()
      .then(() => {
        if (!cancelled) setAuthed(true);
      })
      .catch(() => {
        if (!cancelled) setAuthed(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const linkCls = "transition-colors hover:text-ink";

  return (
    <header className="mb-2 mt-9 flex items-center justify-between">
      <Link
        href={authed ? "/dashboard" : "/"}
        className="flex items-center gap-3 text-[19px] font-bold tracking-tight"
      >
        <div className="cyt-gradient-bg grid h-[30px] w-[30px] place-items-center rounded-[9px] font-extrabold text-bg">
          {BRAND.MARK}
        </div>
        {BRAND.APP_NAME}
      </Link>

      <nav className="flex items-center gap-[18px] text-[13.5px] text-mut">
        {authed === null ? null : authed ? (
          <>
            <span className="cursor-default">How it works</span>
            <Link href="/settings" className={linkCls}>
              Advanced tools
            </Link>
            <Link href="/dashboard" className={linkCls}>
              My profile
            </Link>
          </>
        ) : (
          <>
            <span className="cursor-default">How it works</span>
            <Link href="/signin" className={linkCls}>
              Sign in
            </Link>
            <Link href="/" className={linkCls}>
              Join the waiting list
            </Link>
          </>
        )}
      </nav>
    </header>
  );
}
