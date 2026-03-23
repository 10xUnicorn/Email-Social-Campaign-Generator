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
