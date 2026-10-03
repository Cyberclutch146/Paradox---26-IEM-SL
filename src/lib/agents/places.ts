/**
 * Place resolution: turns free text ("tawang", "near Aizawl", "the Garo hills")
 * into the platform's region ids. Coverage is the seven North East states only
 * (the Risk model has never seen Sikkim), so other places are reported as out
 * of scope instead of being silently mapped to something else.
 */
import { REGIONS } from "@/data/regions";

/** Towns, districts and landmarks that unambiguously belong to one state. */
const ALIASES: Record<string, string[]> = {
  arunachal: [
    "arunachal", "itanagar", "tawang", "bomdila", "ziro", "pasighat", "naharlagun",
    "west kameng", "east kameng", "sela", "dirang", "tezu", "roing", "aalo",
  ],
  assam: [
    "assam", "guwahati", "majuli", "dibrugarh", "jorhat", "silchar", "tezpur",
    "dima hasao", "haflong", "brahmaputra", "kaziranga", "nagaon", "barak",
  ],
  meghalaya: [
    "meghalaya", "shillong", "cherrapunji", "cherrapunjee", "sohra", "nongpoh",
    "tura", "jowai", "mawsynram", "khasi", "jaintia", "garo",
  ],
  nagaland: ["nagaland", "kohima", "dimapur", "mokokchung", "wokha", "zunheboto", "phek"],
  manipur: [
    "manipur", "imphal", "churachandpur", "ukhrul", "senapati", "tamenglong",
    "noney", "bishnupur", "loktak", "tupul", "moreh",
  ],
  mizoram: [
    "mizoram", "aizawl", "lunglei", "champhai", "kolasib", "serchhip", "saiha",
    "siaha", "lawngtlai", "mamit", "tlawng",
  ],
  tripura: ["tripura", "agartala", "udaipur", "dharmanagar", "kailashahar", "ambassa", "belonia"],
};

/** Places people will ask about that the platform deliberately does not cover. */
const OUT_OF_SCOPE: string[] = [
  "sikkim", "gangtok", "darjeeling", "kerala", "wayanad", "uttarakhand",
  "himachal", "mumbai", "kochi", "nepal", "bhutan",
];

/** Phrases meaning "every state", used for comparison questions. */
const ALL_STATES = [
  "all states", "every state", "each state", "north east", "northeast", "north-east",
  "seven sisters", "the region", "whole region", "across the states", "which state",
];

export interface PlaceMatch {
  regionIds: string[];
  outOfScope: string[];
  allStates: boolean;
}

function normalise(text: string): string {
  return ` ${text.toLowerCase().replace(/[^a-z0-9\s-]/g, " ").replace(/\s+/g, " ")} `;
}

function containsTerm(haystack: string, term: string): boolean {
  return haystack.includes(` ${term} `) || haystack.includes(` ${term}s `);
}

/** Finds every covered state, out-of-scope place and "all states" phrase in the text, in the order mentioned. */
export function resolvePlaces(text: string): PlaceMatch {
  const haystack = normalise(text);
  const hits: { id: string; at: number }[] = [];

  for (const [regionId, terms] of Object.entries(ALIASES)) {
    let first = -1;
    for (const term of terms) {
      if (!containsTerm(haystack, term)) continue;
      const at = haystack.indexOf(` ${term}`);
      if (first === -1 || at < first) first = at;
    }
    if (first !== -1) hits.push({ id: regionId, at: first });
  }

  const outOfScope = OUT_OF_SCOPE.filter((term) => containsTerm(haystack, term)).map(
    (term) => term.charAt(0).toUpperCase() + term.slice(1)
  );

  return {
    regionIds: hits.sort((a, b) => a.at - b.at).map((hit) => hit.id),
    outOfScope,
    allStates: ALL_STATES.some((phrase) => haystack.includes(` ${phrase}`)),
  };
}

export function allRegionIds(): string[] {
  return REGIONS.map((region) => region.id);
}

export function regionName(regionId: string): string {
  return REGIONS.find((region) => region.id === regionId)?.name ?? regionId;
}

export function isCoveredRegion(regionId: string): boolean {
  return REGIONS.some((region) => region.id === regionId);
}
