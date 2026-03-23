import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: Request) {
  try {
    const {
      campaign_id,
      channel,
      num_messages,
      custom_prompt,
      schedule_dates,
    } = await request.json();

    // Load campaign + existing messages for context
    const [campRes, msgsRes] = await Promise.all([
      supabase.from("campaigns").select("*, brand_voice:brand_voices(*)").eq("id", campaign_id).single(),
      supabase.from("campaign_messages").select("*").eq("campaign_id", campaign_id).order("sequence_order"),
    ]);

    const campaign = campRes.data;
    if (!campaign) throw new Error("Campaign not found");

    const existingMessages = msgsRes.data || [];
    const maxOrder = Math.max(...existingMessages.map((m: { sequence_order: number }) => m.sequence_order), 0);

    // Build context from existing messages
    const existingContext = existingMessages
      .filter((m: { channel: string }) => m.channel === channel)
      .slice(-3)
      .map((m: { sequence_order: number; subject: string | null; body: string }) =>
        `[#${m.sequence_order}] ${m.subject ? `Subject: ${m.subject}\n` : ""}${m.body.slice(0, 200)}...`
      )
      .join("\n---\n");

    // Brand voice context
    let brandVoiceContext = "";
    if (campaign.brand_voice) {
      const bv = campaign.brand_voice;
      brandVoiceContext = [
        bv.tone && `Tone: ${bv.tone}`,
        bv.style_notes && `Style: ${bv.style_notes}`,
      ].filter(Boolean).join("\n");
    }

    // Load variables
    let variableTags = "";
    if (campaign.variable_set_id) {
      const { data: vars } = await supabase
        .from("variables")
        .select("tag, label, category")
        .eq("variable_set_id", campaign.variable_set_id)
        .order("sort_order");
      if (vars?.length) {
        variableTags = vars.map((v) => `${v.tag} = ${v.label}`).join(", ");
      }
    }

    const channelInstructions: Record<string, string> = {
      email: "Include subject, body (with **bold**, *italic*, ## headings), preview_text, and cta_text for each.",
      sms: "Keep under 160 chars. Punchy and direct. No subject needed.",
      social: "Hook in first line. Include hashtags. No subject needed.",
    };

    const prompt = `You are an expert marketing copywriter. Generate ${num_messages} additional ${channel} message(s) for an existing campaign.

CAMPAIGN: ${campaign.name}
GOAL: ${campaign.goal || "Engagement"}
AUDIENCE: ${campaign.audience || "General"}
${brandVoiceContext ? `BRAND VOICE:\n${brandVoiceContext}` : ""}
${variableTags ? `VARIABLES: ${variableTags}` : ""}

EXISTING RECENT ${channel.toUpperCase()} MESSAGES (for context & continuity):
${existingContext || "No existing messages for this channel yet."}

${custom_prompt ? `SPECIFIC INSTRUCTIONS: ${custom_prompt}` : ""}

CHANNEL GUIDELINES:
${channelInstructions[channel] || ""}

Generate ${num_messages} NEW messages that:
- Continue the sequence naturally (don't repeat what's been said)
- Start sequence_order at ${maxOrder + 1}
- Maintain consistent voice and messaging
- Advance the campaign goal

Return a JSON array:
[{ "sequence_order": number, "channel": "${channel}", "subject": string|null, "body": string, "preview_text": string|null, "cta_text": string|null }]

Return ONLY the JSON array.`;

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 8000,
      messages: [{ role: "user", content: prompt }],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") throw new Error("No AI response");

    let rawText = textBlock.text.trim();
    if (rawText.startsWith("```")) {
      rawText = rawText.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    }

    const newMessages = JSON.parse(rawText);

    // Save to DB with optional scheduled dates
    const dbMessages = newMessages.map((msg: Record<string, unknown>, idx: number) => ({
      campaign_id,
      sequence_order: msg.sequence_order || maxOrder + idx + 1,
      channel: msg.channel || channel,
      subject: msg.subject || null,
      body: msg.body,
      preview_text: msg.preview_text || null,
      cta_text: msg.cta_text || null,
      status: schedule_dates?.[idx] ? "scheduled" : "draft",
      send_at: schedule_dates?.[idx] || null,
    }));

    const { data: saved, error: msgError } = await supabase
      .from("campaign_messages")
      .insert(dbMessages)
      .select();

    if (msgError) throw msgError;

    return NextResponse.json({ messages: saved });
  } catch (err: unknown) {
    console.error("Add content error:", err);
    const message = err instanceof Error ? err.message : "Failed to add content";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
