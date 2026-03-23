# Deploy Mass Distribution Platform to Vercel

## One-Click Deploy (Fastest)

1. Push this project to a GitHub repo
2. Go to [vercel.com/new](https://vercel.com/new)
3. Import the repo
4. Add the environment variables below
5. Click Deploy

## Environment Variables (Required)

Set these in Vercel Dashboard → Project → Settings → Environment Variables:

| Variable | Value |
|----------|-------|
| `ANTHROPIC_API_KEY` | Your Anthropic API key (get from console.anthropic.com) |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://yasjdremegqrtkpnsywi.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlhc2pkcmVtZWdxcnRrcG5zeXdpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQxNDk1NzEsImV4cCI6MjA4OTcyNTU3MX0.e0h9lZgIlExT8qtDCz-1HENyVQ8-nqdj__iwGkEZiME` |
| `MOCK_DESTINATIONS` | `true` |

## CLI Deploy (Alternative)

```bash
npm i -g vercel
vercel login
vercel deploy --prod
```

When prompted, set:
- Framework: Next.js
- Build Command: `next build`
- Output Directory: `.next`

Then add env vars:
```bash
vercel env add ANTHROPIC_API_KEY
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel env add MOCK_DESTINATIONS
```

## Local Development

```bash
cp .env.example .env.local
# Edit .env.local with your keys
npm install
npm run dev
```
