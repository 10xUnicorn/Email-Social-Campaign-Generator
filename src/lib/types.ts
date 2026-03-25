export interface Company {
  id: string;
  name: string;
  logo_url: string | null;
  website: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CampaignFolder {
  id: string;
  company_id: string | null;
  name: string;
  description: string | null;
  created_at: string;
}

export interface BrandVoice {
  id: string;
  name: string;
  description: string | null;
  tone: string | null;
  style_notes: string | null;
  example_content: string[] | null;
  imported_url: string | null;
  imported_content: string | null;
  company_id: string | null;
  company?: Company;
  created_at: string;
  updated_at: string;
  brand_assets?: BrandAsset[];
  brand_voice_urls?: BrandVoiceUrl[];
}

export interface BrandAsset {
  id: string;
  brand_voice_id: string;
  asset_type: "logo" | "file" | "link" | "folder";
  name: string;
  url: string;
  notes: string | null;
  created_at: string;
}

export interface BrandVoiceUrl {
  id: string;
  brand_voice_id: string;
  url: string;
  extracted_content: string | null;
  imported_at: string;
}

export interface Campaign {
  id: string;
  name: string;
  description: string | null;
  brand_voice_id: string | null;
  company_id: string | null;
  folder_id: string | null;
  goal: string | null;
  audience: string | null;
  num_messages: number;
  channels: string[];
  status: "draft" | "active" | "paused" | "completed";
  schedule_start: string | null;
  schedule_interval_hours: number;
  imported_url: string | null;
  imported_content: string | null;
  variable_set_id: string | null;
  duplicated_from_id: string | null;
  timezone: string;
  email_style: string | null;
  created_at: string;
  updated_at: string;
  brand_voice?: BrandVoice;
  company?: Company;
  folder?: CampaignFolder;
  variable_set?: VariableSet;
}

export interface CampaignMessage {
  id: string;
  campaign_id: string;
  sequence_order: number;
  channel: "email" | "sms" | "social";
  subject: string | null;
  body: string;
  preview_text: string | null;
  cta_text: string | null;
  cta_url: string | null;
  send_at: string | null;
  status: "draft" | "scheduled" | "sent";
  created_at: string;
  updated_at: string;
}

export interface CampaignFile {
  id: string;
  campaign_id: string;
  file_name: string;
  file_url: string;
  file_type: string | null;
  file_size: number | null;
  created_at: string;
}

export interface GenerationRequest {
  campaign_name: string;
  description: string;
  goal: string;
  audience: string;
  brand_voice_id?: string;
  brand_voice_text?: string;
  channels: string[];
  num_messages: number;
  company_id?: string;
  folder_id?: string;
  imported_url?: string;
  additional_instructions?: string;
  variable_set_id?: string;
}

export interface VariableSet {
  id: string;
  name: string;
  platform: string | null;
  description: string | null;
  created_at: string;
  updated_at: string;
  variables?: Variable[];
}

export interface Variable {
  id: string;
  variable_set_id: string;
  tag: string;
  label: string;
  description: string | null;
  default_value: string | null;
  category: "contact" | "company" | "custom" | "system";
  sort_order: number;
  created_at: string;
}

export interface GenerationLog {
  id: string;
  campaign_id: string;
  prompt_used: string;
  model: string;
  response: string;
  channel: string;
  created_at: string;
}

// ── Social Profiles & Publishing ──

export interface SocialProfile {
  id: string;
  platform: "instagram" | "facebook" | "linkedin" | "x" | "tiktok";
  profile_name: string;
  profile_id: string | null;
  profile_url: string | null;
  access_token: string | null;
  refresh_token: string | null;
  api_key: string | null;
  api_secret: string | null;
  company_id: string | null;
  company?: Company;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PublishedPost {
  id: string;
  message_id: string;
  social_profile_id: string;
  platform: string;
  content: string;
  external_post_id: string | null;
  external_url: string | null;
  status: "published" | "failed" | "pending";
  error_message: string | null;
  published_at: string;
}

export interface MediaItem {
  id: string;
  platform: "instagram" | "tiktok" | "youtube" | "other";
  media_type: "video" | "image" | "reel" | "short";
  source_url: string;
  thumbnail_url: string | null;
  title: string | null;
  description: string | null;
  tags: string[] | null;
  company_id: string | null;
  created_at: string;
}

// ── CSV Export Mapping ──

export interface FieldMapping {
  field: string;
  label: string;
  header: string;
  enabled: boolean;
  category: string;
}

export interface CsvMappingProfile {
  id: string;
  name: string;
  description: string | null;
  company_id: string | null;
  is_global: boolean;
  field_mappings: FieldMapping[];
  created_at: string;
  updated_at: string;
}

export const EXPORTABLE_FIELDS: FieldMapping[] = [
  { field: "subject", label: "Subject Line", header: "Subject", enabled: true, category: "Message" },
  { field: "body", label: "Body Content", header: "Body", enabled: true, category: "Message" },
  { field: "channel", label: "Channel", header: "Channel", enabled: true, category: "Message" },
  { field: "preview_text", label: "Preview Text", header: "Preview Text", enabled: true, category: "Message" },
  { field: "cta_text", label: "CTA Text", header: "CTA", enabled: true, category: "Message" },
  { field: "cta_url", label: "CTA URL", header: "CTA URL", enabled: false, category: "Message" },
  { field: "sequence_order", label: "Sequence #", header: "Sequence", enabled: true, category: "Schedule" },
  { field: "send_at", label: "Send Date/Time", header: "Send At", enabled: true, category: "Schedule" },
  { field: "status", label: "Status", header: "Status", enabled: true, category: "Schedule" },
  { field: "campaign_name", label: "Campaign Name", header: "Campaign", enabled: true, category: "Campaign" },
  { field: "company_name", label: "Company", header: "Company", enabled: false, category: "Campaign" },
  { field: "goal", label: "Campaign Goal", header: "Goal", enabled: false, category: "Campaign" },
  { field: "audience", label: "Target Audience", header: "Audience", enabled: false, category: "Campaign" },
];

export const PLATFORM_CONFIG: Record<string, { label: string; color: string; icon: string; requiredFields: string[] }> = {
  instagram: { label: "Instagram", color: "bg-pink-500/20 text-pink-400", icon: "📸", requiredFields: ["access_token"] },
  facebook: { label: "Facebook", color: "bg-blue-500/20 text-blue-400", icon: "📘", requiredFields: ["access_token", "profile_id"] },
  linkedin: { label: "LinkedIn", color: "bg-sky-500/20 text-sky-400", icon: "💼", requiredFields: ["access_token", "profile_id"] },
  x: { label: "X (Twitter)", color: "bg-zinc-500/20 text-zinc-300", icon: "𝕏", requiredFields: ["api_key", "api_secret", "access_token"] },
  tiktok: { label: "TikTok", color: "bg-cyan-500/20 text-cyan-400", icon: "🎵", requiredFields: ["access_token"] },
};
