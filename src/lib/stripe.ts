import Stripe from "stripe";

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error("STRIPE_SECRET_KEY not set");
    }
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2026-03-25.dahlia",
      typescript: true,
    });
  }
  return _stripe;
}

// Convenience alias — lazy-loads on first property access
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const stripe = new Proxy({} as Stripe, {
  get(_target, prop) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (getStripe() as any)[prop];
  },
});

// Stripe Product IDs
export const PRODUCTS = {
  creator: "prod_UFM1CCfoT7IWWz",
  business: "prod_UFM1vEEEb9Uyiv",
} as const;

// Plan limits
export const PLAN_LIMITS = {
  creator: {
    campaigns_per_month: 10,
    ai_generations_per_month: 50,
    brand_voices: 3,
    companies: 3,
    export_profiles: 5,
    team_members: 0,
  },
  business: {
    campaigns_per_month: Infinity,
    ai_generations_per_month: Infinity,
    brand_voices: Infinity,
    companies: Infinity,
    export_profiles: Infinity,
    team_members: 10,
  },
  admin: {
    campaigns_per_month: Infinity,
    ai_generations_per_month: Infinity,
    brand_voices: Infinity,
    companies: Infinity,
    export_profiles: Infinity,
    team_members: Infinity,
  },
} as const;

export type PlanType = keyof typeof PLAN_LIMITS;

// Price amounts for checkout (in cents)
export const PRICES = {
  creator_monthly: 2900,
  creator_annual: 29000,
  business_monthly: 7900,
  business_annual: 79000,
} as const;
