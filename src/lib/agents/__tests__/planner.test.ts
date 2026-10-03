import { describe, expect, it } from "vitest";
import { planFromConversation } from "../planner";
import { resolvePlaces } from "../places";
import type { ChatTurn } from "../types";

const user = (text: string): ChatTurn => ({ role: "user", text });
const bot = (text: string): ChatTurn => ({ role: "bot", text });

describe("resolvePlaces", () => {
  it("maps towns and landmarks to their state", () => {
    expect(resolvePlaces("near Aizawl").regionIds).toEqual(["mizoram"]);
    expect(resolvePlaces("the road to Tawang").regionIds).toEqual(["arunachal"]);
    expect(resolvePlaces("Cherrapunji rain").regionIds).toEqual(["meghalaya"]);
  });

  it("keeps the order places were mentioned in", () => {
    expect(resolvePlaces("compare Tripura and Assam").regionIds).toEqual(["tripura", "assam"]);
  });

  it("flags places the platform does not cover", () => {
    const match = resolvePlaces("what about Sikkim?");
    expect(match.regionIds).toEqual([]);
    expect(match.outOfScope).toEqual(["Sikkim"]);
  });

  it("does not treat ordinary English words as places", () => {
    expect(resolvePlaces("walk along the river on Mon").regionIds).toEqual([]);
  });
});

describe("planFromConversation", () => {
  it("understands the PRD example: landslide chances in Mizoram", () => {
    const plan = planFromConversation([user("what are the chances of landslide in mizoram?")], "arunachal");
    expect(plan.request).toMatchObject({ intent: "risk", regionIds: ["mizoram"], hazard: "landslide" });
    // The dashboard region must NOT override a place the user actually named.
    expect(plan.regionInferred).toBe(false);
  });

  it("carries the place over for follow-ups", () => {
    const plan = planFromConversation(
      [user("landslide risk in Nagaland?"), bot("..."), user("which villages are exposed there?")],
      "arunachal"
    );
    expect(plan.request).toMatchObject({ intent: "exposure", regionIds: ["nagaland"], hazard: "landslide" });
    expect(plan.regionInferred).toBe(true);
  });

  it("carries the intent over when only the place changes", () => {
    const plan = planFromConversation([user("any ground reports from Kohima?"), bot("..."), user("what about Assam?")]);
    expect(plan.request).toMatchObject({ intent: "reports", regionIds: ["assam"] });
  });

  it("treats a bare place name as a risk question", () => {
    expect(planFromConversation([user("Tripura?")]).request).toMatchObject({ intent: "risk", regionIds: ["tripura"] });
  });

  it("turns 'which state' questions into a comparison over all seven states", () => {
    const plan = planFromConversation([user("Which state is riskiest right now?")]);
    expect(plan.request.intent).toBe("compare");
    expect(plan.request.regionIds).toHaveLength(7);
  });

  it("recognises alert requests and their audience", () => {
    const plan = planFromConversation([user("Draft an alert for Kohima for the district office")]);
    expect(plan.request).toMatchObject({ intent: "alert", regionIds: ["nagaland"], audience: "district" });
  });

  it("answers system questions without needing a place", () => {
    expect(planFromConversation([user("How does the risk score work?")], "assam").request.intent).toBe("explain");
  });

  it("falls back to the dashboard region for place-less status questions", () => {
    const plan = planFromConversation([user("what's happening right now?")], "manipur");
    expect(plan.request).toMatchObject({ intent: "risk", regionIds: ["manipur"] });
    expect(plan.regionInferred).toBe(true);
  });

  it("does not guess a covered state for an out-of-scope place", () => {
    const plan = planFromConversation([user("landslide chances in Sikkim")], "assam");
    expect(plan.request.regionIds).toEqual([]);
    expect(plan.outOfScope).toEqual(["Sikkim"]);
  });
});
