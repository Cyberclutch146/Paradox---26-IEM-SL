import type { Metadata } from "next";
import { RegionProvider } from "@/state/region-context";
import WorkflowView from "./view";

export const metadata: Metadata = {
  title: "Architecture — DistraAI",
  description: "Visualizing the intelligence workflows and multi-agent orchestration.",
};

export default async function WorkflowPage({
  searchParams,
}: {
  searchParams: Promise<{ region?: string }>;
}) {
  const params = await searchParams;
  return (
    <RegionProvider defaultRegionId={params.region}>
      <WorkflowView />
    </RegionProvider>
  );
}
