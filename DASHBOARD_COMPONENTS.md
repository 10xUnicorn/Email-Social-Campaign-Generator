# Mass Distribution Platform - Dashboard UI Components

## Overview
Complete Next.js App Router dashboard UI implementation for the Mass Content Distribution Platform with Tailwind CSS dark theme.

## Files Created

### 1. Root Layout & Pages

#### `src/app/layout.tsx`
- Root HTML/body layout with dark mode support (bg-gray-950, text-white)
- Inter font from next/font
- Metadata configuration
- Children wrapper

#### `src/app/page.tsx`
- Landing/home page with hero section
- "Distribute" branding with gradient text
- Tagline: "Ingest. Generate. Publish. Everywhere."
- CTA: "Get Started" → /dashboard
- 3-feature grid highlighting AI generation, 25+ destinations, one-button publish
- Modern SaaS aesthetics with gradient backgrounds

### 2. Dashboard Pages

#### `src/app/dashboard/layout.tsx`
- Responsive sidebar navigation
  - Campaigns, Destinations, Analytics, Settings
  - Collapsible sidebar (sidebarOpen state)
- Top bar with org name placeholder + user avatar
- Main content area with proper spacing
- Dark UI with Tailwind styling
- User profile section with avatar circle

#### `src/app/dashboard/page.tsx`
- Dashboard home page
- 4 stats cards: Total Campaigns, Assets Generated, Published, Pending
- Recent campaigns list with status badges
- "New Campaign" button triggers new-campaign-modal
- Empty state for first-time users
- Mock campaign data with status indicators

#### `src/app/dashboard/campaigns/[id]/page.tsx`
- Campaign detail page
- Header with source URL, status badge, creation date
- 4 tabs: Assets | Destinations | Publish Run | Analytics
- Assets tab displays grid of AssetCard components
- Each asset shows: title, type, excerpt, uniqueness score, status
- "Approve All" and "Start Publish Run" action buttons
- "Back to Campaigns" navigation link
- Mock campaign and asset data

#### `src/app/dashboard/campaigns/[id]/preview/page.tsx`
- Campaign preview & approval page
- Left panel: destinations grouped by type (API / Feed / Assisted)
- Right panel: selected destination details showing:
  - Mapped fields table
  - Rendered content preview
  - Validation warnings (yellow) and errors (red)
  - Compliance checklist (canonical, links, pacing)
  - "Edit" and "Approve" buttons
- Status indicators for each destination
- Mock destination data with compliance checks

### 3. UI Components

#### `src/components/ui/button.tsx`
- Reusable Button component
- Variants: primary, secondary, danger, ghost
- Sizes: sm, md, lg
- Disabled state styling
- Focus ring for accessibility

#### `src/components/ui/badge.tsx`
- Status badge component
- Status types: draft, generating, ready, approved, published, failed, manual_needed, needs_edit
- Color-coded backgrounds and text
- Sizes: sm, md
- Auto-labeling of status text

#### `src/components/ui/card.tsx`
- Card wrapper component
- Optional header, body, footer slots
- Consistent dark theme styling
- Border and spacing configuration

#### `src/components/ui/tabs.tsx`
- Client component with useState for tab management
- Tab navigation with underline indicator
- Optional count badges on tabs
- Active tab highlighting (blue-500 underline, blue-400 text)
- Smooth transitions

### 4. Campaign Components

#### `src/components/campaign/new-campaign-modal.tsx`
- "use client" modal component
- URL input field with validation
- Canonical strategy selector (canonical_first, excerpt_only, full_copy_allowed)
- Link policy settings (max links 1-20, anchor style)
- Distribution pacing selector (conservative, moderate, aggressive)
- "Start Ingestion" button → calls POST /api/ingest
- Loading state with animated progress messages
- Step-by-step progress display (6 steps)
- Form validation and error handling

#### `src/components/campaign/asset-card.tsx`
- Asset display card component
- Asset type icon/emoji badges
- Truncated title and excerpt preview
- Uniqueness score visual bar (0-100%)
- Status badge (color-coded)
- "Edit" and "Approve" action buttons
- Responsive grid layout support

### 5. Editor Components

#### `src/components/editor/markdown-editor.tsx`
- "use client" markdown editor component
- Textarea with monospace font
- Side-by-side preview panel
- Simple markdown-to-HTML converter supporting:
  - Headers (# ## ###)
  - Bold (**text**)
  - Italic (*text*)
  - Inline code (`code`)
  - Code blocks (```code```)
  - Links ([text](url))
- Save button with loading state
- Diff toggle to show changes from original
- Formatting tips reference table
- Character and line count display

## Design System

### Colors
- Background: gray-950 (darkest), gray-900, gray-800
- Text: white, gray-300, gray-400 (muted)
- Accents: blue-500/600 (primary), green-500 (success), red-500 (danger), yellow-500 (warning)
- Gradients: from-blue-600 to-blue-700

### Typography
- Font: Inter (next/font)
- Size hierarchy: text-6xl (hero), text-3xl (page), text-xl, text-base, text-sm, text-xs
- Font weights: bold (headings), semibold (emphasis), normal (body)

### Components
- Rounded corners: rounded-lg (standard), rounded-full (badges)
- Borders: border-gray-800 (default), border-gray-700 (hover)
- Spacing: px-4-6, py-2.5-4, gap-2-6
- Shadows: shadow-lg with colored shadows for gradients
- Transitions: duration-200-300, ease-out

### Interactive Elements
- Buttons: gradient backgrounds with hover state darkening
- Hover states: lighter background/border, text color brightening
- Focus rings: ring-blue-500 with offset
- Disabled: opacity-50, cursor-not-allowed
- Active states: bg-blue-600/20, border-blue-600/30 for selected items

## Features

### Authentication
- Placeholder org name and avatar in sidebar
- User profile button in top bar
- Avatar circles (8x8 to 12x12 px)

### Status Management
- Draft, Generating, Ready, Approved, Published, Failed, Manual, Needs Edit
- Color-coded badges for quick status identification

### Form Handling
- URL validation (basic URL parsing)
- Input fields with focus states
- Select dropdowns with Tailwind styling
- Disabled input states during processing
- Error message display with icons

### Data Visualization
- Stats cards with gradient icon backgrounds
- Progress bars with gradient fills
- Tables with hover states
- Lists with alternating backgrounds

### State Management
- React useState for modal visibility
- Tab switching with controlled state
- Form input state management
- Loading states with animations

## Integration Points

### API Endpoints (Mock/Placeholder)
- POST /api/ingest - Start campaign ingestion
- GET /api/campaigns - List campaigns
- GET /api/campaigns/[id] - Get campaign details
- POST /api/campaigns/[id]/approve - Approve assets
- POST /api/publish - Start publish run

### Data Models (Mock)
- Campaign: id, title, source, status, createdAt, description
- Asset: id, title, type, excerpt, uniquenessScore, status
- Destination: id, name, type, status, mappedFields, preview, warnings, errors, compliance
- Stats: label, value, icon, color

## Browser Support
- Modern browsers with CSS Grid, Flexbox, and CSS Variables
- Responsive design: mobile-first with md (768px) and lg (1024px) breakpoints

## Accessibility
- Semantic HTML structure
- ARIA labels where needed
- Keyboard accessible buttons and links
- Focus rings on interactive elements
- Color contrast compliance (dark theme)
- Alt text for icons

## Performance Optimizations
- Client components marked with "use client" only where necessary
- Server components default for better performance
- Lucide React icons (tree-shakeable)
- Tailwind CSS for optimized styling
- Image-less design (emoji/icons only for now)

---

Created: March 21, 2024
Platform: Next.js 14+, React 18+, Tailwind CSS 3.4+, TypeScript
