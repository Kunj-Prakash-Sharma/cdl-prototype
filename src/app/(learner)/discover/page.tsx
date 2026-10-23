import type { Metadata } from "next";
import { DiscoveryFlow } from "@/components/discover/discovery-flow";

export const metadata: Metadata = {
  title: "AI Career Discovery",
  description: "Chat with Sage, take three short assessments and get your personalised career report.",
};

export default function DiscoverPage() {
  return <DiscoveryFlow />;
}
