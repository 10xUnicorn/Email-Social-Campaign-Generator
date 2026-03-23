import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

export async function POST(request: Request) {
  try {
    const { subject, body, cta_text, cta_url, preview_text, brand_color, platform, email_style } = await request.json();

    const platformStyles: Record<string, string> = {
      mailchimp: "Use a clean, modern layout with a centered content area (600px max-width). Simple header with logo placeholder, content sections with clear spacing, and a prominent CTA button.",
      activecampaign: "Professional layout with sidebar option. Use a clean header, content blocks with icons, and a bold footer with social links.",
      hubspot: "Modern, sleek design. Use a hero section, content cards, and gradient CTA buttons. Clean typography.",
      gohighlevel: "Direct and conversion-focused. Minimal design with strong headline, short paragraphs, and multiple CTA placements.",
      generic: "Clean, responsive, universally compatible design. Max-width 600px, system fonts with web-safe fallbacks.",
    };

    const styleGuide = platformStyles[platform?.toLowerCase()] || platformStyles.generic;
    const ctaLink = cta_url || "#";

    const prompt = `You are an expert email designer who specializes in dark-mode compatible, mobile-first email design. Create a beautiful, professional HTML email template.

EMAIL CONTENT:
Subject: ${subject || "No subject"}
Body: ${body}
CTA Button Text: ${cta_text || "Learn More"}
CTA Button Link: ${ctaLink}
Preview: ${preview_text || ""}
Brand Color: ${brand_color || "#7c3aed"}

PLATFORM: ${platform || "Generic"}
STYLE GUIDE: ${styleGuide}
${email_style ? `\nCAMPAIGN DESIGN STYLE (MUST FOLLOW — this ensures visual consistency across all emails in this campaign):\n${email_style}\nApply this design direction to every aspect: colors, typography, layout, spacing, button styles, and overall visual feel. This is the most important design instruction.` : ""}

CRITICAL REQUIREMENTS:

1. DARK MODE SUPPORT (MANDATORY):
   - Add <meta name="color-scheme" content="light dark"> in <head>
   - Add <meta name="supported-color-modes" content="light dark"> in <head>
   - Include @media (prefers-color-scheme: dark) styles in <style> tag
   - Use transparent backgrounds where possible so dark mode inherits naturally
   - For the outer wrapper/body, use: background-color: #ffffff for light, and in dark mode override to #1a1a2e or #121212
   - For content areas in dark mode: background-color: #1e1e30 or #1e1e1e
   - For text in dark mode: color: #f0f0f0 or #e0e0e0
   - For the CTA button: use the brand color (works in both modes), with white text
   - Add [data-ogsc] and [data-ogsb] selectors for Outlook dark mode
   - Add .dark-mode class selectors as fallback
   - Test colors: ensure sufficient contrast (4.5:1 minimum) in BOTH light and dark

2. MOBILE RESPONSIVE (MANDATORY):
   - Add <meta name="viewport" content="width=device-width, initial-scale=1.0">
   - Include @media only screen and (max-width: 600px) in <style>
   - On mobile: content should be 100% width with 16px side padding
   - On mobile: font sizes should be minimum 16px for body text
   - On mobile: CTA button should be full-width (100%) and min 48px tall for touch targets
   - On mobile: images should be max-width: 100% and height: auto
   - Stack multi-column layouts to single column on mobile

3. GENERAL EMAIL BEST PRACTICES:
   - Complete self-contained HTML with ALL styles inline on elements (CSS in style tag is for dark mode + mobile overrides only)
   - Max width 600px centered layout
   - Use tables for layout (email client compatibility)
   - Web-safe fonts: Arial, Helvetica, sans-serif
   - Include proper email DOCTYPE: <!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN">
   - Header area with logo placeholder
   - Main content area
   - CTA button: prominent, rounded corners, brand color background, white text, MIN 48px height, centered, links to: ${ctaLink}
   - Footer: unsubscribe placeholder, company address placeholder, muted text
   - Preheader/preview text: hidden span at top of body
   - All links use brand color
   - Avoid pure black (#000000) for text — use #333333 for light mode

4. DESIGN QUALITY:
   - Professional, modern, clean design
   - Generous whitespace and padding (20-30px between sections)
   - Subtle section separators
   - Brand color used for: CTA button, links, accent borders, header accent
   - Body text: 15-16px, line-height 1.6
   - Headings: clear hierarchy with proper spacing
   - The email should look PREMIUM — not generic or template-y

Return ONLY the complete HTML — no markdown, no explanation, no code fences.`;

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 10000,
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
