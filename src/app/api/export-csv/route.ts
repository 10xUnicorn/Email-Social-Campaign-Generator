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

const DATE_FIELDS = new Set(["send_at", "created_at", "updated_at"]);

const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function pad(n: number, len = 2): string {
  return String(n).padStart(len, "0");
}

function formatDate(isoStr: string, fmt: string): string {
  if (!isoStr) return "";
  const d = new Date(isoStr);
  if (isNaN(d.getTime())) return isoStr;

  const Y = d.getUTCFullYear();
  const M = d.getUTCMonth(); // 0-based
  const D = d.getUTCDate();
  const H = d.getUTCHours();
  const m = d.getUTCMinutes();
  const s = d.getUTCSeconds();
  const h12 = H % 12 || 12;
  const ampm = H >= 12 ? "PM" : "AM";

  switch (fmt) {
    case "YYYY-MM-DD HH:mm:ss":
      return `${Y}-${pad(M + 1)}-${pad(D)} ${pad(H)}:${pad(m)}:${pad(s)}`;
    case "MM/DD/YYYY HH:mm":
      return `${pad(M + 1)}/${pad(D)}/${Y} ${pad(H)}:${pad(m)}`;
    case "DD/MM/YYYY HH:mm":
      return `${pad(D)}/${pad(M + 1)}/${Y} ${pad(H)}:${pad(m)}`;
    case "YYYY-MM-DDTHH:mm:ssZ":
      return d.toISOString().replace(/\.\d{3}Z$/, "Z");
    case "MM/DD/YYYY hh:mm A":
      return `${pad(M + 1)}/${pad(D)}/${Y} ${pad(h12)}:${pad(m)} ${ampm}`;
    case "DD MMM YYYY HH:mm":
      return `${pad(D)} ${MONTHS_SHORT[M]} ${Y} ${pad(H)}:${pad(m)}`;
    case "MMM DD, YYYY hh:mm A":
      return `${MONTHS_SHORT[M]} ${pad(D)}, ${Y} ${pad(h12)}:${pad(m)} ${ampm}`;
    case "YYYY/MM/DD HH:mm":
      return `${Y}/${pad(M + 1)}/${pad(D)} ${pad(H)}:${pad(m)}`;
    case "Unix":
      return String(Math.floor(d.getTime() / 1000));
    case "date_only":
      return `${Y}-${pad(M + 1)}-${pad(D)}`;
    case "time_only":
      return `${pad(H)}:${pad(m)}:${pad(s)}`;
    default:
      return `${Y}-${pad(M + 1)}-${pad(D)} ${pad(H)}:${pad(m)}:${pad(s)}`;
  }
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
  field: string,
  dateFmt: string
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
    default: {
      const raw = msg[field];
      if (raw && DATE_FIELDS.has(field)) {
        return formatDate(String(raw), dateFmt);
      }
      return String(raw ?? "");
    }
  }
}

export async function POST(request: Request) {
  try {
    const { campaign_ids, message_ids, field_mappings, sort_field, sort_direction, date_format } = await request.json();

    const dateFmt = date_format || "YYYY-MM-DD HH:mm:ss";

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

    // Sort messages if requested
    if (sort_field) {
      const dir = sort_direction === "desc" ? -1 : 1;
      messages.sort((a, b) => {
        const aVal = String(a[sort_field] ?? "");
        const bVal = String(b[sort_field] ?? "");
        return aVal.localeCompare(bVal) * dir;
      });
    }

    // Build CSV
    const headers = enabledMappings.map((m) => escapeCSV(m.header));
    const rows = messages.map((msg) => {
      const campaign = campaignMap[String(msg.campaign_id)] || {};
      return enabledMappings
        .map((m) => escapeCSV(resolveField(msg, campaign, m.field, dateFmt)))
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
