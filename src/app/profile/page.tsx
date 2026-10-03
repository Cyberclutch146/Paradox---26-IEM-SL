import type { Metadata } from "next";
import { RegionProvider } from "@/state/region-context";
import ProfileView from "./view";

export const metadata: Metadata = {
  title: "Profile — DistraAI",
};

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ region?: string }>;
}) {
  const params = await searchParams;
  return (
    <RegionProvider defaultRegionId={params.region}>
      <ProfileView />
    </RegionProvider>
  );
}
