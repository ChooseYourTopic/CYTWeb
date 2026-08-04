"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import { ActivityFeed } from "@/components/research/ActivityFeed";
import { SiteHeader } from "@/components/layout/SiteHeader";

/** Full investigation log for a topic — the complete feed the rail links to. */
export default function TopicActivityPage({
  params,
}: {
  params: { id: string };
}) {
  return (
    <main className="mx-auto max-w-[860px] px-6 pb-16">
      <SiteHeader />

      <header className="mb-5 mt-8">
        <Link
          href={`/topic/${params.id}`}
          className="inline-flex items-center gap-1.5 text-[13px] text-mut transition-colors hover:text-ink"
        >
          <ArrowLeft size={14} /> Back to topic
        </Link>
        <h1 className="mt-3 text-[24px] font-bold tracking-[-0.4px]">
          Full investigation log
        </h1>
        <p className="mt-1 text-[14px] text-mut">
          Every action your agent team has taken on this topic.
        </p>
      </header>

      <Card>
        <CardHeader>Live investigation</CardHeader>
        <div className="p-3">
          <ActivityFeed companyId={params.id} fullHeight />
        </div>
      </Card>
    </main>
  );
}
