"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/layout/Sidebar";
import Footer from "@/components/layout/Footer";
import { useRegion } from "@/state/region-context";
import { REGIONS } from "@/data/regions";
import { cn } from "@/lib/utils";
import { useAuth } from "@/state/auth-context";

// Haversine formula to calculate distance between two coordinates
function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

export default function ProfileView() {
  const { region, setRegion } = useRegion();
  const { user, loading, configured, signIn, signOut } = useAuth();
  const [detecting, setDetecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser");
      return;
    }

    setDetecting(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        let closestRegion = REGIONS[0];
        let minDistance = Infinity;

        for (const r of REGIONS) {
          const dist = getDistance(latitude, longitude, r.center.lat, r.center.lng);
          if (dist < minDistance) {
            minDistance = dist;
            closestRegion = r;
          }
        }

        setRegion(closestRegion);
        setDetecting(false);
        // Redirect to dashboard with the newly detected region
        router.replace(`/?region=${closestRegion.id}`);
      },
      (err) => {
        setError("Failed to detect location. Please ensure location permissions are granted.");
        setDetecting(false);
      },
      { timeout: 10000 }
    );
  };

  return (
    <div className="flex flex-col md:flex-row min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 pb-[72px] md:pb-0">
      <main className="flex-1">
        <section className="px-4 sm:px-6 lg:px-8 pt-10 pb-10 mx-auto max-w-2xl">
          <div className="card-static p-8 animate-fade-in">
            <h1 className="serif-display text-3xl font-medium tracking-tight mb-6">User Profile</h1>
            
            <div className="space-y-6">
              {/* Account Section */}
              <div>
                <p className="eyebrow mb-2">Account</p>
                <div className="p-4 rounded-xl border border-border-subtle bg-bg-wash flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  {loading ? (
                    <div className="text-sm text-text-secondary animate-pulse">Loading...</div>
                  ) : !configured ? (
                    <div className="text-sm text-text-secondary">Auth not configured</div>
                  ) : user ? (
                    <>
                      <div className="flex items-center gap-3">
                        {user.photoURL ? (
                          <div
                            className="h-10 w-10 rounded-full border border-border-subtle shrink-0 bg-cover bg-center shadow-sm"
                            style={{ backgroundImage: `url(${user.photoURL})` }}
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-accent flex items-center justify-center text-sm font-semibold text-text-on-accent ring-1 ring-accent/20">
                            {user.displayName?.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <div className="font-semibold text-text-primary">{user.displayName}</div>
                          <div className="text-sm text-text-secondary">{user.email ?? "Signed in via Google"}</div>
                        </div>
                      </div>
                      <button onClick={signOut} className="btn-ghost px-4 py-2 text-sm">
                        Sign out
                      </button>
                    </>
                  ) : (
                    <>
                      <div>
                        <div className="font-semibold text-text-primary">Not signed in</div>
                        <div className="text-sm text-text-secondary">Sign in to access platform-wide features</div>
                      </div>
                      <button onClick={signIn} className="btn-primary px-5 py-2 text-sm">
                        Sign in with Google
                      </button>
                    </>
                  )}
                </div>
              </div>

              <div>
                <p className="eyebrow mb-2">Current Active Region</p>
                <div className="flex items-center justify-between p-4 rounded-xl border border-border-subtle bg-bg-wash">
                  <div>
                    <div className="font-semibold text-text-primary">{region.name}</div>
                    <div className="text-sm text-text-secondary">{region.subLabel}</div>
                  </div>
                  <div className="font-data text-xs text-accent uppercase tracking-widest px-2 py-1 rounded bg-accent-subtle">
                    Active
                  </div>
                </div>
              </div>

              <div className="border-t border-border-subtle pt-6">
                <p className="eyebrow mb-2">Location Detection</p>
                <p className="text-sm text-text-secondary mb-4 leading-relaxed">
                  Detect your current location to automatically switch to the nearest monitored region. This will filter all dashboard intelligence, alerts, and community data to focus on your area.
                </p>
                <button
                  onClick={handleDetectLocation}
                  disabled={detecting}
                  className={cn(
                    "btn-primary px-6 py-2.5 text-sm inline-flex items-center gap-2",
                    detecting && "opacity-70 cursor-not-allowed"
                  )}
                >
                  {detecting ? (
                    <>
                      <span className="h-4 w-4 rounded-full border-2 border-bg-primary border-r-transparent animate-spin" />
                      Detecting...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      Detect Location
                    </>
                  )}
                </button>
                {error && (
                  <div className="mt-4 p-3 rounded bg-risk-danger/10 border border-risk-danger/20">
                    <p className="text-sm text-risk-danger">{error}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
      </div>
    </div>
  );
}
