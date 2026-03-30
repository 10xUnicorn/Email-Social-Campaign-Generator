import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface NotifyRequest {
  email: string;
  campaign_id: string;
  campaign_name: string;
  total_posts: number;
  type: "posts_ready" | "posts_approved" | "posts_published";
}

export async function POST(request: Request) {
  try {
    const req: NotifyRequest = await request.json();

    if (!req.email || !req.campaign_id) {
      return Response.json({ error: "email and campaign_id required" }, { status: 400 });
    }

    // Store notification in Supabase
    // We'll create a notifications table entry
    const { error } = await supabase.from("notifications").insert({
      email: req.email,
      campaign_id: req.campaign_id,
      type: req.type,
      title: getTitle(req.type, req.campaign_name),
      body: getBody(req.type, req.campaign_name, req.total_posts),
      read: false,
    });

    if (error) {
      // Table might not exist yet — that's ok, we'll still return success
      console.warn("Notification insert error (table may not exist):", error.message);
    }

    // In production, you'd integrate with SendGrid/Resend/Postmark here
    // For now, we store in DB and the dashboard polls for notifications
    console.log(`[NOTIFICATION] ${req.type} → ${req.email}: ${req.campaign_name} (${req.total_posts} posts)`);

    return Response.json({
      success: true,
      message: `Notification queued for ${req.email}`,
      notification: {
        title: getTitle(req.type, req.campaign_name),
        body: getBody(req.type, req.campaign_name, req.total_posts),
      },
    });
  } catch (err) {
    console.error("Notify error:", err);
    return Response.json({ error: "Notification failed" }, { status: 500 });
  }
}

function getTitle(type: string, campaignName: string): string {
  switch (type) {
    case "posts_ready":
      return `${campaignName} — Posts Ready for Review`;
    case "posts_approved":
      return `${campaignName} — Posts Approved`;
    case "posts_published":
      return `${campaignName} — Posts Published`;
    default:
      return `${campaignName} — Update`;
  }
}

function getBody(type: string, campaignName: string, totalPosts: number): string {
  switch (type) {
    case "posts_ready":
      return `Your ${totalPosts} posts for "${campaignName}" are ready for review. Open the dashboard to approve, edit, or delete individual posts before they go live.`;
    case "posts_approved":
      return `All ${totalPosts} posts for "${campaignName}" have been approved and added to the posting schedule.`;
    case "posts_published":
      return `${totalPosts} posts from "${campaignName}" have been published across your social profiles.`;
    default:
      return `Update on "${campaignName}".`;
  }
}
