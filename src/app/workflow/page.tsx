import type { Metadata } from "next";
import WorkflowView from "./view";

export const metadata: Metadata = {
  title: "Architecture — DistraAI",
  description: "Visualizing the intelligence workflows and multi-agent orchestration.",
};

export default function WorkflowPage() {
  return <WorkflowView />;
}
