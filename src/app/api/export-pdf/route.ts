import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface MessageRow {
  id: string;
  campaign_id: string;
  sequence_order: number;
  channel: string;
  subject: string | null;
  body: string;
  preview_text: string | null;
  cta_text: string | null;
  cta_url: string | null;
  send_at: string | null;
  status: string;
}

interface CampaignRow {
  id: string;
  name: string;
  description: string | null;
  goal: string | null;
  audience: string | null;
  timezone: string;
  company?: { name: string } | null;
}

function channelColor(channel: string): string {
  switch (channel) {
    case "email": return "#2563EB";
    case "sms": return "#16A34A";
    case "social": return "#9333EA";
    default: return "#6B7280";
  }
}

function formatDate(dateStr: string | null, tz: string): string {
  if (!dateStr) return "Not scheduled";
  try {
    return new Date(dateStr).toLocaleString("en-US", {
      timeZone: tz,
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      timeZoneName: "short",
    });
  } catch {
    return dateStr;
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/\n/g, "<br/>");
}

function buildPdfHtml(
  messages: MessageRow[],
  campaignMap: Record<string, CampaignRow>
): string {
  const grouped: Record<string, MessageRow[]> = {};
  for (const msg of messages) {
    if (!grouped[msg.campaign_id]) grouped[msg.campaign_id] = [];
    grouped[msg.campaign_id].push(msg);
  }

  let body = "";

  for (const [campaignId, msgs] of Object.entries(grouped)) {
    const campaign = campaignMap[campaignId];
    const tz = campaign?.timezone || "America/New_York";

    body += `
      <div style="page-break-before: ${body ? "always" : "auto"};">
        <h1 style="font-size:24px;color:#111827;margin-bottom:4px;">${escapeHtml(campaign?.name || "Campaign")}</h1>
        <p style="font-size:11px;color:#6B7280;margin-top:0;">
          ${campaign?.company?.name ? `Company: ${escapeHtml(campaign.company.name)} | ` : ""}
          ${campaign?.goal ? `Goal: ${escapeHtml(campaign.goal)} | ` : ""}
          Messages: ${msgs.length}
        </p>
        <hr style="border:none;border-top:1px solid #E5E7EB;margin:16px 0;"/>
    `;

    for (const msg of msgs) {
      body += `
        <div style="margin-bottom:20px;padding:12px;border:1px solid #E5E7EB;border-radius:6px;border-left:4px solid ${channelColor(msg.channel)};">
          <div style="display:flex;justify-content:space-between;margin-bottom:6px;">
            <span style="font-weight:bold;font-size:13px;color:${channelColor(msg.channel)};">
              #${msg.sequence_order} ${msg.channel.toUpperCase()}
            </span>
            <span style="font-size:11px;color:#9CA3AF;">${formatDate(msg.send_at, tz)}</span>
          </div>
          ${msg.subject ? `<div style="font-weight:600;font-size:14px;margin-bottom:6px;">${escapeHtml(msg.subject)}</div>` : ""}
          <div style="font-size:12px;line-height:1.5;color:#374151;">${escapeHtml(msg.body)}</div>
          ${msg.cta_text ? `<div style="margin-top:8px;font-size:12px;"><span style="color:#2563EB;font-weight:600;">CTA:</span> ${escapeHtml(msg.cta_text)}${msg.cta_url ? ` <span style="color:#9CA3AF;">(${escapeHtml(msg.cta_url)})</span>` : ""}</div>` : ""}
          ${msg.preview_text ? `<div style="margin-top:4px;font-size:11px;color:#9CA3AF;font-style:italic;">Preview: ${escapeHtml(msg.preview_text)}</div>` : ""}
          <div style="margin-top:6px;font-size:10px;color:#D1D5DB;">Status: ${msg.status.toUpperCase()}</div>
        </div>
      `;
    }

    body += `</div>`;
  }

  // Summary table
  body += `
    <div style="page-break-before:always;">
      <h1 style="font-size:20px;color:#111827;">Content Summary</h1>
      <table style="width:100%;border-collapse:collapse;font-size:11px;margin-top:12px;">
        <thead>
          <tr style="background:#1F2937;color:white;">
            <th style="padding:8px;text-align:left;border:1px solid #374151;">#</th>
            <th style="padding:8px;text-align:left;border:1px solid #374151;">Channel</th>
            <th style="padding:8px;text-align:left;border:1px solid #374151;">Subject / Preview</th>
            <th style="padding:8px;text-align:left;border:1px solid #374151;">Schedule</th>
            <th style="padding:8px;text-align:left;border:1px solid #374151;">Status</th>
          </tr>
        </thead>
        <tbody>
  `;

  for (const msg of messages) {
    const tz = campaignMap[msg.campaign_id]?.timezone || "America/New_York";
    body += `
      <tr style="border-bottom:1px solid #E5E7EB;">
        <td style="padding:6px;border:1px solid #E5E7EB;">${msg.sequence_order}</td>
        <td style="padding:6px;border:1px solid #E5E7EB;color:${channelColor(msg.channel)};font-weight:600;">${msg.channel.toUpperCase()}</td>
        <td style="padding:6px;border:1px solid #E5E7EB;">${escapeHtml((msg.subject || msg.body).slice(0, 80))}${(msg.subject || msg.body).length > 80 ? "..." : ""}</td>
        <td style="padding:6px;border:1px solid #E5E7EB;font-size:10px;">${formatDate(msg.send_at, tz)}</td>
        <td style="padding:6px;border:1px solid #E5E7EB;">${msg.status.toUpperCase()}</td>
      </tr>
    `;
  }

  body += `</tbody></table></div>`;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <style>
    @page { size: letter; margin: 0.75in; }
    body { font-family: Arial, Helvetica, sans-serif; font-size: 12px; color: #111827; line-height: 1.4; }
    h1 { page-break-after: avoid; }
    table { page-break-inside: avoid; }
  </style>
</head>
<body>${body}</body>
</html>`;
}

export async function POST(request: Request) {
  try {
    const { campaign_ids, message_ids } = await request.json();

    let messages: MessageRow[] = [];
    if (message_ids && message_ids.length > 0) {
      const { data } = await supabase
        .from("campaign_messages")
        .select("*")
        .in("id", message_ids)
        .order("campaign_id")
        .order("sequence_order");
      messages = (data || []) as MessageRow[];
    } else if (campaign_ids && campaign_ids.length > 0) {
      const { data } = await supabase
        .from("campaign_messages")
        .select("*")
        .in("campaign_id", campaign_ids)
        .order("campaign_id")
        .order("sequence_order");
      messages = (data || []) as MessageRow[];
    }

    const campaignIdsNeeded = [...new Set(messages.map((m) => m.campaign_id))];
    const campaignMap: Record<string, CampaignRow> = {};
    if (campaignIdsNeeded.length > 0) {
      const { data: campaigns } = await supabase
        .from("campaigns")
        .select("*, company:companies(name)")
        .in("id", campaignIdsNeeded);
      for (const c of (campaigns || []) as CampaignRow[]) {
        campaignMap[c.id] = c;
      }
    }

    const html = buildPdfHtml(messages, campaignMap);

    // Return HTML that can be printed to PDF via browser
    // The client will use window.print() or a PDF library
    return new Response(html, {
      headers: {
        "Content-Type": "text/html",
        "Content-Disposition": `inline; filename="campaign-export-${Date.now()}.html"`,
      },
    });
  } catch (err) {
    console.error("PDF export error:", err);
    return NextResponse.json({ error: "Export failed" }, { status: 500 });
  }
}
