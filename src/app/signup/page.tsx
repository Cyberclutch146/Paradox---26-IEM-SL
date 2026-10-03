import type { Metadata } from "next";
import SignupView from "./view";

export const metadata: Metadata = {
  title: "Request Access — DistraAI",
  description: "Join the DistraAI network to deploy intelligence before disaster strikes.",
};

export default function SignupPage() {
  return <SignupView />;
}
