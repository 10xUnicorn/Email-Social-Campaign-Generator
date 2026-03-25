import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// GET — list all profiles (optionally filter by company_id)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get("company_id");

    let query = supabase
      .from("csv_mapping_profiles")
      .select("*")
      .order("name");

    if (companyId) {
      query = query.or(`is_global.eq.true,company_id.eq.${companyId}`);
    }

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json(data);
  } catch (err) {
    console.error("CSV profiles GET error:", err);
    return NextResponse.json({ error: "Failed to load profiles" }, { status: 500 });
  }
}

// POST — create or update a profile
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { id, name, description, company_id, is_global, field_mappings } = body;

    if (!name || !field_mappings) {
      return NextResponse.json({ error: "name and field_mappings required" }, { status: 400 });
    }

    if (id) {
      // Update existing
      const { data, error } = await supabase
        .from("csv_mapping_profiles")
        .update({
          name,
          description: description || null,
          company_id: company_id || null,
          is_global: is_global ?? true,
          field_mappings,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json(data);
    } else {
      // Create new
      const { data, error } = await supabase
        .from("csv_mapping_profiles")
        .insert({
          name,
          description: description || null,
          company_id: company_id || null,
          is_global: is_global ?? true,
          field_mappings,
        })
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json(data);
    }
  } catch (err) {
    console.error("CSV profiles POST error:", err);
    return NextResponse.json({ error: "Failed to save profile" }, { status: 500 });
  }
}

// DELETE — remove a profile
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "id required" }, { status: 400 });
    }

    const { error } = await supabase
      .from("csv_mapping_profiles")
      .delete()
      .eq("id", id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("CSV profiles DELETE error:", err);
    return NextResponse.json({ error: "Failed to delete profile" }, { status: 500 });
  }
}
