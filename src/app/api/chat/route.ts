import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { sanitiseTurns } from "@/lib/agents/chat-service";
import { answerWithOrchestrator } from "@/lib/agents/orchestrator-bridge";
import type { ChatReply } from "@/lib/agents/types";

/**
 * POST /api/chat — the assistant's backend.
 *
 * The primary ML authority is the remote Orchestrator model accessed via ORCHESTRATOR_AGENT_URL.
 * Gemini API acts as a secondary assistant to explain and contextualize the Orchestrator's
 * findings without suppressing or overriding its risk ratings.
 */
const apiKey = process.env.GEMINI_API_KEY;
const gemini = apiKey
  ? { client: new GoogleGenAI({ apiKey }).models, model: process.env.GEMINI_MODEL || "gemini-3.8-flash" }
  : null;

export async function POST(request: NextRequest) {
  let body: { messages?: unknown; regionId?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body must be JSON" }, { status: 400 });
  }

  const turns = sanitiseTurns(body.messages);
  const regionId = typeof body.regionId === "string" ? body.regionId : undefined;

  try {
    const reply: ChatReply = await answerWithOrchestrator(turns, regionId, gemini);
    return NextResponse.json(reply);
  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json(
      {
        reply: "Something went wrong connecting to the Orchestrator service. Please try again.",
        steps: [],
        focusRegionId: null,
        suggestions: [],
        mode: "local",
      } satisfies ChatReply,
      { status: 500 }
    );
  }
}

