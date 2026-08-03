"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

// The AI account controls now live in the unified /settings hub. Keep this path
// as a redirect so existing links/bookmarks still land in the right place.
export default function AiSettingsRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/settings");
  }, [router]);
  return (
    <main className="flex min-h-[60vh] items-center justify-center text-mut">
      <Loader2 size={18} className="animate-spin" />
    </main>
  );
}
