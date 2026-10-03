// Test what the actual ML endpoint returns for each NE state
const REGIONS = [
  { id: "arunachal", name: "Arunachal Pradesh", lat: 28.2, lng: 94.7 },
  { id: "assam", lat: 26.2, lng: 92.9 },
  { id: "manipur", lat: 24.8, lng: 93.9 },
  { id: "meghalaya", lat: 25.5, lng: 91.3 },
  { id: "mizoram", lat: 23.2, lng: 92.9 },
  { id: "nagaland", lat: 26.2, lng: 94.2 },
  { id: "tripura", lat: 23.8, lng: 91.3 },
];

const URL = "https://explemental-subtransversal-devon.ngrok-free.dev/predict";

async function testRegion(r) {
  const payload = {
    location: { latitude: r.lat, longitude: r.lng },
    weather: { rain_today_mm: 50.0, rain_72h_incl_today_mm: 120.0 },
    soil: { sm_0_7cm_ante: 0.38, sm_0_7cm_change_3d: 0.06 },
    regionId: r.id,
  };
  try {
    const res = await fetch(URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "ngrok-skip-browser-warning": "true" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    console.log(`\n=== ${r.id} (${res.status}) ===`);
    console.log(JSON.stringify(data, null, 2));
  } catch (e) {
    console.log(`\n=== ${r.id} ERROR ===`, e.message);
  }
}

(async () => {
  for (const r of REGIONS) await testRegion(r);
})();
