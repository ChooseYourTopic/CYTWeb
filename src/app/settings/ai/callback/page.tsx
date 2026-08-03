"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, AlertTriangle } from "lucide-react";
import { cytapi } from "@/lib/api";

function Callback() {
  const router = useRouter();
  const params = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return; // exchange the one-time code exactly once
    ran.current = true;

    const code = params.get("code");
    const state = params.get("state");
    const denied = params.get("error");

    if (denied || !code || !state) {
      setError("The connection was cancelled or is missing details.");
      return;
    }

    cytapi.aiCredential
      .oauthCallback(code, state)
      .then(() => router.replace("/settings"))
      .catch(() =>
        setError("Couldn't finish connecting. Please try again from settings."),
      );
  }, [params, router]);

  return (
    <main className="flex min-h-[60vh] items-center justify-center px-6">
      {error ? (
        <div className="max-w-[420px] text-center">
          <AlertTriangle size={28} className="mx-auto text-warn" />
          <p className="mt-3 text-[15px] text-ink">{error}</p>
          <button
            onClick={() => router.replace("/settings")}
            className="mt-4 rounded-xl border border-line bg-panel2 px-4 py-2 text-[13px] text-mut transition-colors hover:text-ink"
          >
            Back to settings
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2 text-mut">
          <Loader2 size={18} className="animate-spin" /> Connecting your
          account…
        </div>
      )}
    </main>
  );
}

export default function OauthCallbackPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-[60vh] items-center justify-center text-mut">
          <Loader2 size={18} className="animate-spin" />
        </main>
      }
    >
      <Callback />
    </Suspense>
  );
}
