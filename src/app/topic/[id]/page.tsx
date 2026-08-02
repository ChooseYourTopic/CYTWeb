import { ResearchDashboard } from "@/components/research/ResearchDashboard";

// The living dashboard is a client surface (WS + polling). This thin server
// wrapper just forwards the route params.
export default function TopicPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { topic?: string };
}) {
  return (
    <ResearchDashboard
      topicId={params.id}
      fallbackTopic={searchParams.topic}
    />
  );
}
