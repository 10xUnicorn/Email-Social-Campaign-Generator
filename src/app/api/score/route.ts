import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

export async function POST(request: Request) {
  try {
    const { channel, subject, body, cta_text, campaign_goal, audience } =
      await request.json();

    const prompt = `You are a marketing analytics expert. Score the following ${channel} message on how likely it is to achieve its campaign goal.

CAMPAIGN GOAL: ${campaign_goal || "Not specified"}
TARGET AUDIENCE: ${audience || "Not specified"}
CHANNEL: ${channel}

MESSAGE:
${subject ? `Subject: ${subject}\n` : ""}
Body: ${body}
${cta_text ? `CTA: ${cta_text}` : ""}

Score this message from 0-100 based on:
- Relevance to the campaign goal (25 points)
- Engagement potential — hook, readability, emotional resonance (25 points)
- Call-to-action clarity and strength (20 points)
- Audience alignment — tone, language, value proposition (15 points)
- Channel best practices — length, formatting, deliverability (15 points)

Return a JSON object with:
{
  "score": <number 0-100>,
  "breakdown": { "goal_relevance": <0-25>, "engagement": <0-25>, "cta_strength": <0-20>, "audience_fit": <0-15>, "channel_fit": <0-15> },
  "tips": ["<specific actionable improvement 1>", "<specific actionable improvement 2>", "<specific actionable improvement 3>"]
}

Return ONLY the JSON, no other text.`;

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1000,
      messages: [{ role: "user", content: prompt }],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      throw new Error("No response from AI");
    }

    let rawText = textBlock.text.trim();
    if (rawText.startsWith("```")) {
      rawText = rawText.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    }

    const result = JSON.parse(rawText);
    return NextResponse.json(result);
  } catch (err: unknown) {
    console.error("Score error:", err);
    const message = err instanceof Error ? err.message : "Failed to score";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
