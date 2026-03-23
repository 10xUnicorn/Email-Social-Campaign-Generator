import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

export async function POST(request: Request) {
  try {
    const { channel, subject, body, cta_text, revision_prompt, campaign_goal } =
      await request.json();

    const prompt = `You are an expert marketing copywriter. Revise the following ${channel} message based on the instructions below.

CAMPAIGN GOAL: ${campaign_goal || "Not specified"}

REVISION INSTRUCTIONS: ${revision_prompt}

CURRENT MESSAGE:
${subject ? `Subject: ${subject}\n` : ""}
Body: ${body}
${cta_text ? `CTA: ${cta_text}` : ""}

IMPORTANT:
- Keep the same general message and intent
- Apply the revision instructions precisely
- For emails, use **bold** and *italic* markdown formatting, ## headings, - bullet lists, and 1. numbered lists where appropriate
- Stay focused on the campaign goal: ${campaign_goal || "engagement"}
- Return a JSON object with: { "subject": "..." (or null), "body": "...", "cta_text": "..." (or null), "preview_text": "..." (or null) }
- Return ONLY the JSON, no other text.`;

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2000,
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

    const revised = JSON.parse(rawText);
    return NextResponse.json(revised);
  } catch (err: unknown) {
    console.error("Revise error:", err);
    const message = err instanceof Error ? err.message : "Failed to revise";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
