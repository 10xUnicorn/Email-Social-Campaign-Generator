import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// GET — list all social profiles
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get("company_id");
    const platform = searchParams.get("platform");

    let query = supabase
      .from("social_profiles")
      .select("*, company:companies(name)")
      .order("platform")
      .order("profile_name");

    if (companyId) query = query.eq("company_id", companyId);
    if (platform) query = query.eq("platform", platform);

    const { data, error } = await query;
    if (error) throw error;

    // Strip sensitive tokens from response
    const safe = (data || []).map((p: Record<string, unknown>) => ({
      ...p,
      access_token: p.access_token ? "••••••" : null,
      refresh_token: p.refresh_token ? "••••••" : null,
      api_key: p.api_key ? "••••••" : null,
      api_secret: p.api_secret ? "••••••" : null,
    }));

    return NextResponse.json(safe);
  } catch (err) {
    console.error("Social profiles GET error:", err);
    return NextResponse.json({ error: "Failed to load profiles" }, { status: 500 });
  }
}

// POST — create or update a social profile
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      id,
      platform,
      profile_name,
      profile_id,
      profile_url,
      profile_image_url,
      access_token,
      refresh_token,
      token_expires_at,
      api_key,
      api_secret,
      extra_config,
      company_id,
      is_active,
    } = body;

    if (!platform || !profile_name) {
      return NextResponse.json(
        { error: "platform and profile_name required" },
        { status: 400 }
      );
    }

    const record: Record<string, unknown> = {
      platform,
      profile_name,
      profile_id: profile_id || null,
      profile_url: profile_url || null,
      profile_image_url: profile_image_url || null,
      extra_config: extra_config || {},
      company_id: company_id || null,
      is_active: is_active ?? true,
      updated_at: new Date().toISOString(),
    };

    // Only update tokens if provided (non-empty)
    if (access_token && access_token !== "••••••") record.access_token = access_token;
    if (refresh_token && refresh_token !== "••••••") record.refresh_token = refresh_token;
    if (api_key && api_key !== "••••••") record.api_key = api_key;
    if (api_secret && api_secret !== "••••••") record.api_secret = api_secret;
    if (token_expires_at) record.token_expires_at = token_expires_at;

    if (id) {
      const { data, error } = await supabase
        .from("social_profiles")
        .update(record)
        .eq("id", id)
        .select("*, company:companies(name)")
        .single();
      if (error) throw error;
      return NextResponse.json(data);
    } else {
      const { data, error } = await supabase
        .from("social_profiles")
        .insert(record)
        .select("*, company:companies(name)")
        .single();
      if (error) throw error;
      return NextResponse.json(data);
    }
  } catch (err) {
    console.error("Social profiles POST error:", err);
    return NextResponse.json({ error: "Failed to save profile" }, { status: 500 });
  }
}

// DELETE — remove a profile
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

    const { error } = await supabase
      .from("social_profiles")
      .delete()
      .eq("id", id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Social profiles DELETE error:", err);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
