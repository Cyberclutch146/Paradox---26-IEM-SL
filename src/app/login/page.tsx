import type { Metadata } from "next";
import LoginView from "./view";

export const metadata: Metadata = {
  title: "Sign In — DistraAI",
  description: "Sign in to DistraAI to access the field log and intelligence dashboard.",
};

export default function LoginPage() {
  return <LoginView />;
}
