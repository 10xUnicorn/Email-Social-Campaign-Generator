import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";
import type { GenerationRequest } from "@/lib/types";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

function buildChannelPrompt(req: GenerationRequest, channel: string, brandVoiceContext: string, variableTags?: string): string {
  const channelInstructions: Record<string, string> = {
    email: `For EMAIL messages:
- Include a compelling subject line
- Write a full email body with greeting, value content, and sign-off
- Include a preview text (40-90 chars)
- Include a CTA (call-to-action) text suggestion
- Each email should build on the previous one in the sequence
- Vary the approach: story, value-add, social proof, urgency, direct ask
- Use **bold** and *italic* markdown for emphasis
- Use ## headings and - bullet points where appropriate`,
    sms: `For SMS messages:
- Keep under 160 characters when possible (max 320 for MMS)
- Be punchy and direct
- Include a clear CTA or link placeholder [LINK]
- Conversational tone — feel like it's from a real person
- No subject lines needed`,
    social: `For SOCIAL MEDIA posts:
- Write for a general social platform (adaptable to LinkedIn, Twitter/X, Instagram)
- Include relevant hashtag suggestions
- Hook in the first line
- Engaging, shareable, value-driven
- Mix formats: questions, tips, stories, bold claims, testimonials
- No subject lines needed`,
  };

  return `You are an expert campaign copywriter and marketing strategist. Generate a ${channel} message sequence.

CAMPAIGN BRIEF:
- Name: ${req.campaign_name}
- Description: ${req.description || "Not provided"}
- Goal: ${req.goal}
- Target Audience: ${req.audience}
- Number of messages: ${req.num_messages}
- Channel: ${channel}
${req.additional_instructions ? `- Additional Instructions: ${req.additional_instructions}` : ""}
${variableTags ? `\nPERSONALIZATION VARIABLES:\nUse these exact merge tags throughout the messages for personalization:\n${variableTags}\nIMPORTANT: Weave these variables naturally into the content.` : ""}

BRAND VOICE:
${brandVoiceContext || "No specific brand voice provided. Use a professional, engaging, conversational tone."}

CHANNEL INSTRUCTIONS:
${channelInstructions[channel] || ""}

SEQUENCE STRATEGY:
- Message 1: Hook / introduce the value proposition
- Messages 2-${Math.floor(req.num_messages * 0.6)}: Deliver value, build trust, share proof
- Messages ${Math.floor(req.num_messages * 0.6) + 1}-${req.num_messages - 1}: Create urgency, overcome objections
- Message ${req.num_messages}: Final push / deadline / recap

OUTPUT FORMAT:
Return a JSON array of message objects. Each object must have:
{
  "sequence_order": number (1-based),
  "channel": "${channel}",
  "subject": string or null (only for email),
  "body": string,
  "preview_text": string or null (only for email),
  "cta_text": string or null
}

Generate exactly ${req.num_messages} messages for the ${channel} channel.
Return ONLY the JSON array, no other text.`;
}

export async function POST(request: Request) {
  try {
    const rawBody = await request.json();
    const existingCampaignId = rawBody.existing_campaign_id;
    const body: GenerationRequest = rawBody;

    // Build brand voice context
    let brandVoiceContext = "";
    if (body.brand_voice_id) {
      const { data: bv } = await supabase
        .from("brand_voices")
        .select("*")
        .eq("id", body.brand_voice_id)
        .single();
      if (bv) {
        brandVoiceContext = [
          bv.tone && `Tone: ${bv.tone}`,
          bv.style_notes && `Style Guidelines: ${bv.style_notes}`,
          bv.imported_content && `Reference Content: ${bv.imported_content.slice(0, 2000)}`,
          bv.example_content?.length &&
            `Example Content:\n${bv.example_content.slice(0, 3).join("\n---\n")}`,
        ]
          .filter(Boolean)
          .join("\n\n");
      }
    }
    if (body.brand_voice_text) {
      brandVoiceContext += `\n\nCustom Voice Instructions: ${body.brand_voice_text}`;
    }

    // Load variable tags
    let variableTags = "";
    if (body.variable_set_id) {
      const { data: vars } = await supabase
        .from("variables")
        .select("tag, label, category")
        .eq("variable_set_id", body.variable_set_id)
        .order("sort_order");
      if (vars && vars.length > 0) {
        variableTags = vars.map((v) => `${v.tag} = ${v.label} (${v.category})`).join("\n");
      }
    }

    // Use existing campaign (regenerate) or create new one
    let campaign: { id: string };
    if (existingCampaignId) {
      campaign = { id: existingCampaignId };
    } else {
      const { data: newCampaign, error: campError } = await supabase
        .from("campaigns")
        .insert({
          name: body.campaign_name,
          description: body.description || null,
          brand_voice_id: body.brand_voice_id || null,
          company_id: body.company_id || null,
          folder_id: body.folder_id || null,
          imported_url: body.imported_url || null,
          goal: body.goal,
          audience: body.audience,
          num_messages: body.num_messages,
          channels: body.channels,
          status: "draft",
          variable_set_id: body.variable_set_id || null,
        })
        .select()
        .single();

      if (campError) throw campError;
      campaign = newCampaign!;
    }

    // Stream via SSE - generate per channel
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        function send(event: string, data: unknown) {
          controller.enqueue(
            encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
          );
        }

        send("campaign", { campaign_id: campaign.id });

        for (const channel of body.channels) {
          send("progress", {
            channel,
            status: "generating",
            message: `Generating ${body.num_messages} ${channel} messages...`,
          });

          const prompt = buildChannelPrompt(body, channel, brandVoiceContext, variableTags);

          try {
            const response = await anthropic.messages.create({
              model: "claude-sonnet-4-6",
              max_tokens: 12000,
              messages: [{ role: "user", content: prompt }],
            });

            const textBlock = response.content.find((b) => b.type === "text");
            if (!textBlock || textBlock.type !== "text") {
              send("error", { channel, message: "No AI response for " + channel });
              continue;
            }

            let rawText = textBlock.text.trim();
            if (rawText.startsWith("```")) {
              rawText = rawText.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
            }

            const channelMessages = JSON.parse(rawText);

            // Save to DB and stream each message
            for (const msg of channelMessages) {
              const dbMsg = {
                campaign_id: campaign.id,
                sequence_order: msg.sequence_order,
                channel: msg.channel || channel,
                subject: msg.subject || null,
                body: msg.body,
                preview_text: msg.preview_text || null,
                cta_text: msg.cta_text || null,
                status: "draft",
              };

              const { data: saved } = await supabase
                .from("campaign_messages")
                .insert(dbMsg)
                .select()
                .single();

              if (saved) {
                send("message", saved);
              }
            }

            // Log generation
            await supabase.from("generation_logs").insert({
              campaign_id: campaign.id,
              prompt_used: prompt,
              model: "claude-sonnet-4-6",
              response: rawText,
              channel,
            });

            send("progress", {
              channel,
              status: "complete",
              message: `${channel} messages complete!`,
            });
          } catch (err) {
            const errMsg = err instanceof Error ? err.message : "Generation failed";
            send("error", { channel, message: errMsg });
          }
        }

        send("done", { campaign_id: campaign.id });
        controller.close();
      },
    });

    return new NextResponse(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (err: unknown) {
    console.error("Stream generation error:", err);
    const message = err instanceof Error ? err.message : "Failed to generate campaign";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
