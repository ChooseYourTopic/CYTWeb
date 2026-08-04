"use client";

import { Card, CardHeader } from "@/components/ui/Card";
import { ActivityFeed } from "@/components/research/ActivityFeed";
import { AgentStatusGrid } from "@/components/research/AgentStatusGrid";

/**
 * Always-on investigation rail: the transparent live process view (activity
 * feed, elevated to co-star) plus the compact agent status grid.
 */
export function InvestigationRail({
  companyId,
}: {
  companyId?: string | number;
}) {
  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>Agent team</CardHeader>
        <AgentStatusGrid companyId={companyId} />
      </Card>
      <Card>
        <CardHeader>Live investigation</CardHeader>
        <div className="p-2">
          <ActivityFeed
            companyId={companyId}
            limit={6}
            viewAllHref={companyId ? `/topic/${companyId}/activity` : undefined}
          />
        </div>
      </Card>
    </div>
  );
}
