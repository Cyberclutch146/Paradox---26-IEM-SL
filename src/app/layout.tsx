import type { Metadata } from "next";
import { Cormorant_Garamond, Karla, JetBrains_Mono } from "next/font/google";
import { AuthProvider } from "@/state/auth-context";
import "./globals.css";

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  display: "swap",
  weight: ["300", "400", "500", "600", "700"],
});

const karla = Karla({
  variable: "--font-karla",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "DistraAI — Disaster Intelligence Dashboard",
  description:
    "Real-time flood and landslide risk assessment powered by satellite imagery, environmental data, and machine learning. Monitor risk scores, active alerts, and community reports.",
  keywords: [
    "disaster intelligence",
    "flood risk",
    "landslide detection",
    "satellite imagery",
    "risk assessment",
    "early warning system",
  ],
};


export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${cormorant.variable} ${karla.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-bg-primary text-text-primary">
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
