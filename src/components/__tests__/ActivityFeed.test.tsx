import { render, screen } from "@testing-library/react";
import { ActivityFeedView } from "@/components/research/ActivityFeed";
import type { ActivityEvent } from "@/lib/api";

const events: ActivityEvent[] = [
  {
    id: 2,
    agent_type: "competitor_research",
    action: "mapped rivals",
    summary: "Mapped the top 3 rivals in the niche",
    level: "success",
    created_at: new Date().toISOString(),
  },
  {
    id: 1,
    agent_type: "orchestrator",
    action: "planned day",
    summary: "Wrote today's plan",
    level: "info",
    created_at: new Date().toISOString(),
  },
];

describe("ActivityFeedView", () => {
  it("renders each event's summary", () => {
    render(<ActivityFeedView events={events} connected={true} />);
    expect(
      screen.getByText("Mapped the top 3 rivals in the niche"),
    ).toBeInTheDocument();
    expect(screen.getByText("Wrote today's plan")).toBeInTheDocument();
  });

  it("shows the live connection state", () => {
    render(<ActivityFeedView events={events} connected={true} />);
    expect(screen.getByText("Live")).toBeInTheDocument();
  });

  it("shows a reconnecting state when disconnected", () => {
    render(<ActivityFeedView events={[]} connected={false} />);
    expect(screen.getByText("Reconnecting…")).toBeInTheDocument();
  });

  it("shows a purposeful empty state with no events", () => {
    render(<ActivityFeedView events={[]} connected={true} />);
    expect(
      screen.getByText(/The investigation log starts here/i),
    ).toBeInTheDocument();
  });

  it("labels the agent type in a human-readable way", () => {
    render(<ActivityFeedView events={events} connected={true} />);
    expect(screen.getByText("Competitor Research")).toBeInTheDocument();
  });
});
