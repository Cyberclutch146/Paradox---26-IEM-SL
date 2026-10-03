import type { Metadata } from "next";
import { RegionProvider } from "@/state/region-context";
import DashboardView from "../dashboard-view";

export const metadata: Metadata = {
  title: "Dashboard — DistraAI",
  description:
    "Live flood and landslide risk assessment dashboard for monitored regions.",
};

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ region?: string; name?: string; lat?: string; lng?: string }>;
}) {
  const params = await searchParams;
  
  let customRegion = undefined;
  if (params.name && params.lat && params.lng) {
    customRegion = {
      id: params.region || "custom",
      name: params.name,
      subLabel: "Global Location",
      type: "state",
      center: { lat: parseFloat(params.lat), lng: parseFloat(params.lng) },
      zoom: 11
    };
  }

  return (
    <RegionProvider defaultRegionId={params.region} customRegion={customRegion as any}>
      <DashboardView />
    </RegionProvider>
  );
}