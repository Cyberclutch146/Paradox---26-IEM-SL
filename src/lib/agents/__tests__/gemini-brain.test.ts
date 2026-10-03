import { describe, expect, it } from "vitest";
import type { Content, GenerateContentResponse } from "@google/genai";
import { answer } from "../chat-service";
import { runGeminiBrain, type GenerateContentClient } from "../gemini-brain";
import type { ChatTurn } from "../types";

type Scripted = { functionCalls?: { id: string; name: string; args: Record<string, unknown> }[]; text?: string };

/** A fake Gemini that replays scripted turns and records what it was sent. */
function fakeClient(script: Scripted[]) {
  const calls: Content[][] = [];
  const client: GenerateContentClient = {
    async generateContent({ contents }) {
      calls.push(structuredClone(contents));
      const next = script.shift();
      if (!next) throw new Error("script exhausted");
      return {
        functionCalls: next.functionCalls,
        text: next.text,
        candidates: next.functionCalls
          ? [{ content: { role: "model", parts: next.functionCalls.map((functionCall) => ({ functionCall })) } }]
          : undefined,
      } as unknown as GenerateContentResponse;
    },
  };
  return { client, calls };
}

const question: ChatTurn[] = [{ role: "user", text: "what are the chances of landslide in mizoram?" }];

describe("runGeminiBrain", () => {
  it("lets Gemini call the orchestrator and feeds the agents' output back", async () => {
    const { client, calls } = fakeClient([
      { functionCalls: [{ id: "c1", name: "ask_orchestrator", args: { intent: "risk", regions: ["mizoram"], hazard: "landslide" } }] },
      { text: "Mizoram is at **Watch** tier (0.006, range 0.003–0.010)." },
    ]);

    const result = await runGeminiBrain(client, question, "arunachal");

    expect(result.reply).toContain("Watch");
    expect(result.steps.map((s) => s.label)).toEqual([
      "Gemini planner", "Orchestrator", "Risk-Scoring Agent", "Satellite/GIS Agent", "Community Agent", "Fusion",
    ]);
    // Second model call must contain the function response with real agent data.
    const toolTurn = calls[1][calls[1].length - 1];
    const payload = toolTurn.parts?.[0]?.functionResponse?.response as { risk: { zoneId: string }[] };
    expect(toolTurn.parts?.[0]?.functionResponse?.id).toBe("c1");
    expect(payload.risk[0].zoneId).toBe("MZ_01");
  });

  it("supports several tool calls across rounds (risk, then alert)", async () => {
    const { client } = fakeClient([
      { functionCalls: [{ id: "a", name: "ask_orchestrator", args: { intent: "risk", regions: ["nagaland"] } }] },
      { functionCalls: [{ id: "b", name: "ask_orchestrator", args: { intent: "alert", regions: ["nagaland"], audience: "district" } }] },
      { text: "Done." },
    ]);
    const result = await runGeminiBrain(client, question, undefined);
    expect(result.results).toHaveLength(2);
    expect(result.results[1].alerts[0].audience).toBe("district");
  });

  it("sanitises bad tool arguments instead of crashing", async () => {
    const { client } = fakeClient([
      { functionCalls: [{ id: "x", name: "ask_orchestrator", args: { intent: "nonsense", regions: ["sikkim"] } }] },
      { text: "Sikkim isn't covered." },
    ]);
    const result = await runGeminiBrain(client, question, undefined);
    expect(result.results[0].request).toMatchObject({ intent: "risk", regionIds: [] });
  });
});

describe("answer()", () => {
  it("uses the local planner when no Gemini client is configured", async () => {
    const reply = await answer(question, "arunachal", null);
    expect(reply.mode).toBe("local");
    expect(reply.focusRegionId).toBe("mizoram");
    expect(reply.steps.map((s) => s.agent)).toEqual(["orchestrator", "orchestrator", "risk", "gis", "community", "orchestrator"]);
  });

  it("falls back to the local planner when Gemini fails", async () => {
    const failing: GenerateContentClient = {
      async generateContent() {
        throw new Error("API key not valid");
      },
    };
    const reply = await answer(question, "arunachal", { client: failing });
    expect(reply.mode).toBe("local");
    expect(reply.steps[0].label).toBe("Gemini unavailable");
    expect(reply.reply).toContain("Tlawng River Basin");
  });

  it("reports gemini mode and the focus region on success", async () => {
    const { client } = fakeClient([
      { functionCalls: [{ id: "c1", name: "ask_orchestrator", args: { intent: "risk", regions: ["mizoram"] } }] },
      { text: "ok" },
    ]);
    const reply = await answer(question, "arunachal", { client });
    expect(reply).toMatchObject({ mode: "gemini", focusRegionId: "mizoram", reply: "ok" });
  });
});
