import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import db from "@/lib/db";

const ai = process.env.GEMINI_API_KEY ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }) : null;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { messages, regionId } = body;

    if (!ai) {
      return NextResponse.json({
        reply: "To make me 'work proper', please add your `GEMINI_API_KEY` to the `.env.local` file and restart the server! I'm currently running in disconnected mode.",
      });
    }

    // Fetch context from the database for the LLM (if available)
    let regionName = "Unknown";
    let peakZoneStr = "No active monitored zones in this region.";

    if (db) {
      const regionRow = db.prepare("SELECT name FROM regions WHERE id = ?").get(regionId) as any;
      regionName = regionRow?.name || "Unknown";

      let query = "SELECT * FROM risk_zones";
      let params: any[] = [];
      if (regionId && regionId !== "kerala") {
        query += " WHERE regionId = ?";
        params.push(regionId);
      }
      const zones = db.prepare(query).all(...params) as any[];
      
      if (zones.length > 0) {
        const peakZone = zones.reduce((prev, curr) => curr.riskScore > prev.riskScore ? curr : prev);
        peakZoneStr = `Highest Risk Zone: ${peakZone.name}. Tier: ${peakZone.riskLevel.toUpperCase()}. ML Score: ${peakZone.riskScore}. Driver: ${peakZone.driver}. Villages Exposed: ${peakZone.exposureVillages}. Road Km Exposed: ${peakZone.exposureRoadKm}. Confidence Range: ${peakZone.riskRangeMin} to ${peakZone.riskRangeMax}.`;
      }
    }

    const systemPrompt = `You are the DistraAI Assistant, a disaster-intelligence ML advisor. 
You are currently helping a user who is looking at the dashboard for the region: ${regionName}.
Current ML Data for this region: ${peakZoneStr}
Keep your responses concise, helpful, and professional. Use markdown. You do not need to repeat the region name unless relevant. Answer the user's questions based on the ML data provided.`;

    // Filter out options and parse messages for Gemini
    const chatMessages = messages.map((m: any) => ({
      role: m.role === "bot" ? "model" : "user",
      parts: [{ text: m.text }]
    }));

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: chatMessages,
      config: {
        systemInstruction: systemPrompt,
      }
    });

    return NextResponse.json({
      reply: response.text,
    });
  } catch (error: any) {
    console.error("Chat API Error:", error);
    return NextResponse.json(
      { reply: "I'm sorry, I encountered an error connecting to the AI brain. Please try again." },
      { status: 500 }
    );
  }
}
