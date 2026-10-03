import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { answer, sanitiseTurns } from "@/lib/agents/chat-service";
import type { ChatReply } from "@/lib/agents/types";

/**
 * POST /api/chat — the assistant's backend.
 *
 * Body: { messages: { role: "user" | "bot", text: string }[], regionId?: string }
 * Reply: ChatReply (answer text, the agent steps that produced it, a region to
 * focus on the map, and follow-up suggestions).
 *
 * With GEMINI_API_KEY set, Gemini plans and calls the Orchestrator through
 * function calling. Without it, the local planner drives the same Orchestrator,
 * so the assistant always works. GEMINI_MODEL overrides the model name.
 */
const apiKey = process.env.GEMINI_API_KEY;
const gemini = apiKey
  ? { client: new GoogleGenAI({ apiKey }).models, model: process.env.GEMINI_MODEL || "gemini-2.5-flash" }
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
    const reply: ChatReply = await answer(turns, regionId, gemini);
    return NextResponse.json(reply);
  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json(
      { reply: "Something went wrong on my side. Please try again.", steps: [], focusRegionId: null, suggestions: [], mode: "local" } satisfies ChatReply,
      { status: 500 }
    );
  }
}
