import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { createServiceClient } from "@/lib/supabase";
import type Stripe from "stripe";

// Helper to safely extract subscription period dates
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getSubDates(sub: any) {
  const start = sub.current_period_start;
  const end = sub.current_period_end;
  return {
    current_period_start: typeof start === "number" ? new Date(start * 1000).toISOString() : null,
    current_period_end: typeof end === "number" ? new Date(end * 1000).toISOString() : null,
  };
}

export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "No signature" }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Webhook signature verification failed:", message);
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const supabase = createServiceClient();

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.user_id;
        const plan = session.metadata?.plan || "creator";

        if (userId && session.subscription) {
          const sub = await stripe.subscriptions.retrieve(
            session.subscription as string
          );
          const dates = getSubDates(sub);
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const subAny = sub as any;

          await supabase
            .from("profiles")
            .update({
              stripe_customer_id: session.customer as string,
              subscription_status: sub.status,
              plan,
              trial_ends_at: subAny.trial_end
                ? new Date(subAny.trial_end * 1000).toISOString()
                : null,
            })
            .eq("id", userId);

          await supabase.from("subscriptions").upsert(
            {
              user_id: userId,
              stripe_subscription_id: sub.id,
              stripe_price_id: sub.items.data[0]?.price.id,
              status: sub.status,
              ...dates,
              cancel_at_period_end: sub.cancel_at_period_end,
            },
            { onConflict: "stripe_subscription_id" }
          );
        }
        break;
      }

      case "customer.subscription.updated": {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const sub = event.data.object as any;
        const dates = getSubDates(sub);

        await supabase
          .from("subscriptions")
          .update({
            status: sub.status,
            stripe_price_id: sub.items?.data?.[0]?.price?.id,
            ...dates,
            cancel_at_period_end: sub.cancel_at_period_end,
            canceled_at: sub.canceled_at
              ? new Date(sub.canceled_at * 1000).toISOString()
              : null,
          })
          .eq("stripe_subscription_id", sub.id);

        const { data: subRecord } = await supabase
          .from("subscriptions")
          .select("user_id")
          .eq("stripe_subscription_id", sub.id)
          .single();

        if (subRecord) {
          await supabase
            .from("profiles")
            .update({ subscription_status: sub.status })
            .eq("id", subRecord.user_id);
        }
        break;
      }

      case "customer.subscription.deleted": {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const sub = event.data.object as any;

        await supabase
          .from("subscriptions")
          .update({
            status: "canceled",
            canceled_at: new Date().toISOString(),
          })
          .eq("stripe_subscription_id", sub.id);

        const { data: subRecord } = await supabase
          .from("subscriptions")
          .select("user_id")
          .eq("stripe_subscription_id", sub.id)
          .single();

        if (subRecord) {
          await supabase
            .from("profiles")
            .update({ subscription_status: "canceled" })
            .eq("id", subRecord.user_id);
        }
        break;
      }

      case "invoice.payment_failed": {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const invoice = event.data.object as any;
        const subId = invoice.subscription;
        if (subId) {
          const { data: subRecord } = await supabase
            .from("subscriptions")
            .select("user_id")
            .eq("stripe_subscription_id", subId)
            .single();

          if (subRecord) {
            await supabase
              .from("profiles")
              .update({ subscription_status: "past_due" })
              .eq("id", subRecord.user_id);
            await supabase
              .from("subscriptions")
              .update({ status: "past_due" })
              .eq("stripe_subscription_id", subId);
          }
        }
        break;
      }

      case "invoice.paid": {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const paidInvoice = event.data.object as any;
        const paidSubId = paidInvoice.subscription;
        if (paidSubId) {
          const { data: subRecord } = await supabase
            .from("subscriptions")
            .select("user_id")
            .eq("stripe_subscription_id", paidSubId)
            .single();

          if (subRecord) {
            await supabase
              .from("profiles")
              .update({ subscription_status: "active" })
              .eq("id", subRecord.user_id);
            await supabase
              .from("subscriptions")
              .update({ status: "active" })
              .eq("stripe_subscription_id", paidSubId);
          }
        }
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("Webhook handler error:", err);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }
}
