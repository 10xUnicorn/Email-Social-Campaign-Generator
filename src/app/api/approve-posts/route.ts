import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: Request) {
  try {
    const { campaign_id, message_ids, action } = await request.json();

    if (!campaign_id) {
      return Response.json({ error: "campaign_id required" }, { status: 400 });
    }

    if (!action || !["approve", "approve_all", "delete", "save_draft"].includes(action)) {
      return Response.json({ error: "action must be approve, approve_all, delete, or save_draft" }, { status: 400 });
    }

    if (action === "approve_all") {
      // Approve all draft messages in this campaign
      const { data, error } = await supabase
        .from("campaign_messages")
        .update({ status: "scheduled" })
        .eq("campaign_id", campaign_id)
        .eq("status", "draft")
        .select("id");

      if (error) return Response.json({ error: error.message }, { status: 500 });

      // Update campaign status
      await supabase
        .from("campaigns")
        .update({ status: "active" })
        .eq("id", campaign_id);

      return Response.json({ success: true, approved: data?.length || 0 });
    }

    if (action === "approve" && message_ids?.length) {
      const { data, error } = await supabase
        .from("campaign_messages")
        .update({ status: "scheduled" })
        .in("id", message_ids)
        .select("id");

      if (error) return Response.json({ error: error.message }, { status: 500 });
      return Response.json({ success: true, approved: data?.length || 0 });
    }

    if (action === "delete" && message_ids?.length) {
      const { data, error } = await supabase
        .from("campaign_messages")
        .delete()
        .in("id", message_ids)
        .select("id");

      if (error) return Response.json({ error: error.message }, { status: 500 });
      return Response.json({ success: true, deleted: data?.length || 0 });
    }

    if (action === "save_draft") {
      // Keep everything as draft — no changes needed
      return Response.json({ success: true, message: "Posts saved as draft" });
    }

    return Response.json({ error: "Invalid request" }, { status: 400 });
  } catch (err) {
    console.error("Approve posts error:", err);
    return Response.json({ error: "Failed to process" }, { status: 500 });
  }
}
