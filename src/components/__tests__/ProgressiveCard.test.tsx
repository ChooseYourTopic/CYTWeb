import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ProgressiveCard } from "@/components/research/ProgressiveCard";
import type { SectionItem } from "@/lib/api";

const item: SectionItem = {
  id: 1,
  title: "3 direct rivals mapped",
  summary: "Pulled pricing + positioning for the top 3 players.",
  detail: "Rival A charges $29/mo. Rival B is $18/mo. Gap: none serve beginners.",
  agent_type: "competitor_research",
  status: "complete",
  is_new: true,
};

describe("ProgressiveCard", () => {
  it("shows the summary but hides the detail by default (progressive disclosure)", () => {
    render(<ProgressiveCard item={item} />);
    expect(screen.getByText(item.title)).toBeInTheDocument();
    expect(screen.getByText(item.summary)).toBeInTheDocument();
    expect(screen.queryByText(/Rival A charges/)).not.toBeInTheDocument();
  });

  it("renders a 'new' badge when the finding is fresh", () => {
    render(<ProgressiveCard item={item} />);
    expect(screen.getByText("new")).toBeInTheDocument();
  });

  it("expands into a dialog showing the full detail on click", async () => {
    const user = userEvent.setup();
    render(<ProgressiveCard item={item} />);
    await user.click(screen.getByTestId("progressive-card"));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText(/Rival A charges/)).toBeInTheDocument();
  });

  it("labels the agent type", () => {
    render(<ProgressiveCard item={item} />);
    expect(screen.getAllByText("Competitor Research").length).toBeGreaterThan(0);
  });
});
