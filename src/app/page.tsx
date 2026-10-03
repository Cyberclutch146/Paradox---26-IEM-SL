import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "DistraAI — Landing",
};

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-near-black text-almost-white px-6" style={{ backgroundColor: '#090909' }}>
      <div className="text-center animate-fade-in max-w-2xl">
        <h1 className="text-display mb-6" style={{ fontFamily: 'var(--font-grandslang)' }}>
          Distra<span className="text-signal-violet italic" style={{ color: '#af50ff' }}>AI</span>
        </h1>
        <p className="text-body text-steel mb-12 max-w-md mx-auto leading-relaxed" style={{ color: '#828384' }}>
          Operational disaster intelligence platform. Real-time monitoring for flood and landslide risk zones.
        </p>
        
        <Link href="/dashboard" className="btn-primary" style={{ backgroundColor: '#090909', color: '#f7f9fa', border: '1px solid #f7f9fa', padding: '16px 24px', borderRadius: '8px' }}>
          Access Dashboard
        </Link>
      </div>
    </div>
  );
}