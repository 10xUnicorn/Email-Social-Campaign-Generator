import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { PLAN_LIMITS, type PlanType } from "@/lib/stripe";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Get profile for plan info
    const { data: profile } = await supabase
      .from("profiles")
      .select("plan")
      .eq("id", user.id)
      .single();

    const plan = (profile?.plan || "creator") as PlanType;
    const limits = PLAN_LIMITS[plan];

    // Get current month usage
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const { data: events } = await supabase
      .from("usage_events")
      .select("event_type")
      .eq("user_id", user.id)
      .gte("created_at", startOfMonth.toISOString());

    const usage: Record<string, number> = {};
    (events || []).forEach((e) => {
      usage[e.event_type] = (usage[e.event_type] || 0) + 1;
    });

    // Get total counts for non-monthly limits
    const [bvRes, compRes, epRes] = await Promise.all([
      supabase.from("brand_voices").select("id", { count: "exact", head: true }),
      supabase.from("companies").select("id", { count: "exact", head: true }),
      supabase.from("csv_mapping_profiles").select("id", { count: "exact", head: true }),
    ]);

    return NextResponse.json({
      plan,
      limits,
      usage: {
        campaigns_this_month: usage.campaign_created || 0,
        ai_generations_this_month: usage.ai_generation || 0,
        brand_voices: bvRes.count || 0,
        companies: compRes.count || 0,
        export_profiles: epRes.count || 0,
      },
    });
  } catch (err) {
    console.error("Usage error:", err);
    return NextResponse.json({ error: "Failed to fetch usage" }, { status: 500 });
  }
}
