import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

export async function POST(request: Request) {
  try {
    const { url, mode } = await request.json();
    // mode: "brand_voice" | "campaign" — determines what AI extracts

    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    // Fetch the page content
    const res = await fetch(url, {
      headers: {
        "User-Agent": "CampaignGenerator/1.0 (Content Import)",
      },
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `Failed to fetch URL: ${res.status}` },
        { status: 400 }
      );
    }

    const html = await res.text();

    let prompt: string;

    if (mode === "campaign") {
      // Extract campaign brief from URL content
      prompt = `Analyze the following webpage and extract information to create a marketing campaign. Return a JSON object with:
{
  "name": "suggested campaign name",
  "description": "what this campaign should be about based on the page content",
  "goal": "the most likely campaign goal (e.g. Lead Nurture, Product Launch, Event Promotion, etc.)",
  "audience": "the target audience based on the page content",
  "key_messages": ["3-5 key messages or selling points from the page"],
  "cta_suggestions": ["2-3 suggested calls to action"],
  "tone": "detected tone of the brand"
}

Webpage URL: ${url}

Content:
${html.slice(0, 12000)}

Return ONLY the JSON object, no other text.`;
    } else {
      // Extract brand voice (original behavior)
      prompt = `Analyze the following webpage content and extract the brand voice, tone, and style characteristics. Focus on:
1. Tone (e.g., professional, casual, bold, friendly)
2. Writing style patterns (sentence length, vocabulary level, use of jargon)
3. Key phrases or terminology they use repeatedly
4. How they address their audience
5. The overall vibe and energy of the brand

Webpage URL: ${url}

Content:
${html.slice(0, 10000)}

Provide a concise but thorough brand voice profile that could be used to write new content matching this style. Return just the analysis, no preamble.`;
    }

    const extraction = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2000,
      messages: [{ role: "user", content: prompt }],
    });

    const textBlock = extraction.content.find((b) => b.type === "text");
    const content = textBlock && textBlock.type === "text" ? textBlock.text : "";

    if (mode === "campaign") {
      // Parse the JSON response for campaign data
      let rawText = content.trim();
      if (rawText.startsWith("```")) {
        rawText = rawText.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
      }
      try {
        const campaignData = JSON.parse(rawText);
        return NextResponse.json({ campaign: campaignData, url, raw: content });
      } catch {
        // If JSON parse fails, return raw content
        return NextResponse.json({ content, url });
      }
    }

    return NextResponse.json({ content, url });
  } catch (err: unknown) {
    console.error("Import error:", err);
    const message = err instanceof Error ? err.message : "Failed to import URL";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
