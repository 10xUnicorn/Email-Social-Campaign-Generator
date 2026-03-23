import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

export async function POST(request: Request) {
  try {
    const { subject, body, cta_text, preview_text, brand_color, platform } = await request.json();

    const platformStyles: Record<string, string> = {
      mailchimp: "Use a clean, modern layout with a centered content area (600px max-width). Simple header with logo placeholder, content sections with clear spacing, and a prominent CTA button.",
      activecampaign: "Professional layout with sidebar option. Use a clean header, content blocks with icons, and a bold footer with social links.",
      hubspot: "Modern, sleek design. Use a hero section, content cards, and gradient CTA buttons. Clean typography.",
      gohighlevel: "Direct and conversion-focused. Minimal design with strong headline, short paragraphs, and multiple CTA placements.",
      generic: "Clean, responsive, universally compatible design. Max-width 600px, system fonts with web-safe fallbacks.",
    };

    const styleGuide = platformStyles[platform?.toLowerCase()] || platformStyles.generic;

    const prompt = `You are an expert email designer. Create a beautiful, professional HTML email template.

EMAIL CONTENT:
Subject: ${subject || "No subject"}
Body: ${body}
CTA: ${cta_text || "Learn More"}
Preview: ${preview_text || ""}
Brand Color: ${brand_color || "#7c3aed"}

PLATFORM: ${platform || "Generic"}
STYLE GUIDE: ${styleGuide}

REQUIREMENTS:
- Create a complete, self-contained HTML email with ALL styles inline (no external CSS)
- Max width 600px, centered layout
- Mobile responsive using @media queries in a <style> tag inside <head>
- Professional, modern design with the brand color as the primary accent
- Include: header area, main content, CTA button, footer with unsubscribe placeholder
- The CTA button should be prominent, using the brand color
- Use web-safe fonts (Arial, Helvetica, sans-serif) with fallbacks
- Include proper email DOCTYPE and meta tags
- Keep the original text content intact — just wrap it in beautiful HTML
- Use tables for layout (email compatibility)
- Add subtle background colors, padding, borders for visual structure
- Include a preheader/preview text span
- Make link colors match the brand color

Return ONLY the complete HTML — no markdown, no explanation, no code fences.`;

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 8000,
      messages: [{ role: "user", content: prompt }],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") throw new Error("No AI response");

    let html = textBlock.text.trim();
    // Strip code fences if present
    if (html.startsWith("```")) {
      html = html.replace(/^```(?:html)?\n?/, "").replace(/\n?```$/, "");
    }

    return NextResponse.json({ html });
  } catch (err: unknown) {
    console.error("HTML generation error:", err);
    const message = err instanceof Error ? err.message : "Failed to generate HTML";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
