import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface FieldMapping {
  field: string;
  header: string;
  label: string;
  category: string;
  enabled: boolean;
}

function escapeCSV(val: string): string {
  if (val.includes(",") || val.includes('"') || val.includes("\n")) {
    return `"${val.replace(/"/g, '""')}"`;
  }
  return val;
}

function resolveField(
  msg: Record<string, unknown>,
  campaign: Record<string, unknown>,
  field: string
): string {
  switch (field) {
    case "campaign_name":
      return String(campaign.name || "");
    case "company_name":
      return String((campaign as Record<string, unknown>).company_name || "");
    case "goal":
      return String(campaign.goal || "");
    case "audience":
      return String(campaign.audience || "");
    case "send_at":
      return msg.send_at ? new Date(String(msg.send_at)).toISOString() : "";
    default:
      return String(msg[field] ?? "");
  }
}

export async function POST(request: Request) {
  try {
    const { campaign_ids, message_ids, field_mappings } = await request.json();

    if (!field_mappings || !Array.isArray(field_mappings)) {
      return NextResponse.json({ error: "field_mappings required" }, { status: 400 });
    }

    const enabledMappings: FieldMapping[] = field_mappings.filter(
      (m: FieldMapping) => m.enabled
    );

    if (enabledMappings.length === 0) {
      return NextResponse.json({ error: "At least one field must be enabled" }, { status: 400 });
    }

    // Load messages
    let messages: Record<string, unknown>[] = [];
    const campaignMap: Record<string, Record<string, unknown>> = {};

    if (message_ids && message_ids.length > 0) {
      const { data } = await supabase
        .from("campaign_messages")
        .select("*")
        .in("id", message_ids)
        .order("campaign_id")
        .order("sequence_order");
      messages = (data || []) as Record<string, unknown>[];
    } else if (campaign_ids && campaign_ids.length > 0) {
      const { data } = await supabase
        .from("campaign_messages")
        .select("*")
        .in("campaign_id", campaign_ids)
        .order("campaign_id")
        .order("sequence_order");
      messages = (data || []) as Record<string, unknown>[];
    }

    // Load campaigns for campaign-level fields
    const campaignIdsNeeded = [...new Set(messages.map((m) => String(m.campaign_id)))];
    if (campaignIdsNeeded.length > 0) {
      const { data: campaigns } = await supabase
        .from("campaigns")
        .select("*, company:companies(name)")
        .in("id", campaignIdsNeeded);
      for (const c of campaigns || []) {
        const rec = c as Record<string, unknown>;
        const company = rec.company as Record<string, unknown> | null;
        campaignMap[String(rec.id)] = {
          ...rec,
          company_name: company?.name || "",
        };
      }
    }

    // Build CSV
    const headers = enabledMappings.map((m) => escapeCSV(m.header));
    const rows = messages.map((msg) => {
      const campaign = campaignMap[String(msg.campaign_id)] || {};
      return enabledMappings
        .map((m) => escapeCSV(resolveField(msg, campaign, m.field)))
        .join(",");
    });

    const csv = [headers.join(","), ...rows].join("\n");

    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="campaign-export-${Date.now()}.csv"`,
      },
    });
  } catch (err) {
    console.error("CSV export error:", err);
    return NextResponse.json({ error: "Export failed" }, { status: 500 });
  }
}
