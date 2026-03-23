// Destination-specific types and configurations

export interface DestinationConfig {
  key: string;
  name: string;
  group: 'api' | 'feed' | 'assist';
  description: string;
  supportsCanonical: boolean;
  authType: 'oauth' | 'apikey' | 'basic' | 'none';
  rateLimit?: {
    requests: number;
    periodSeconds: number;
  };
  contentLimits?: {
    maxTitleLength?: number;
    maxContentLength?: number;
    maxTagsCount?: number;
    supportedFormats?: string[];
  };
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationWarning {
  field: string;
  message: string;
}

export interface MappedPayload {
  [key: string]: any;
}

export interface PreviewData {
  destinationKey: string;
  mappedFields: Record<string, string>;
  renderedPreview: string;
  warnings: PreviewWarning[];
  suggestedEdits: SuggestedEdit[];
}

export interface PreviewWarning {
  type: 'formatting' | 'compliance' | 'technical' | 'optimization';
  message: string;
  affectedField?: string;
}

export interface SuggestedEdit {
  field: string;
  currentValue: string;
  suggestedValue: string;
  reason: string;
}

export interface ConnectorResult {
  success: boolean;
  externalId?: string;
  publishedUrl?: string;
  error?: ConnectorError;
  retryable?: boolean;
  metadata?: Record<string, any>;
}

export interface ConnectorError {
  code: string;
  message: string;
  details?: Record<string, any>;
}

// WordPress specific types
export interface WordPressCredentials {
  siteUrl: string;
  username: string;
  password: string;
}

export interface WordPressPost {
  title: string;
  content: string;
  status: 'publish' | 'draft' | 'pending';
  categories?: number[];
  tags?: string[];
  featured_media?: number;
}

// DEV/Forem specific types
export interface ForemArticle {
  article: {
    title: string;
    body_markdown: string;
    published: boolean;
    tags?: string[];
    canonical_url?: string;
  };
}

// Mastodon specific types
export interface MastodonStatus {
  status: string;
  visibility?: 'public' | 'unlisted' | 'private' | 'direct';
  in_reply_to_id?: string;
  media_ids?: string[];
}

// Bluesky specific types
export interface BlueskyPost {
  $type: string;
  text: string;
  createdAt: string;
  facets?: BlueskyFacet[];
}

export interface BlueskyFacet {
  index: {
    byteStart: number;
    byteEnd: number;
  };
  features: BlueskyFeature[];
}

export interface BlueskyFeature {
  $type: string;
  uri?: string;
  did?: string;
  name?: string;
}

// IndexNow specific types
export interface IndexNowPayload {
  host: string;
  key: string;
  keyLocation: string;
  urlList: string[];
}

// RSS Feed types
export interface RSSChannel {
  title: string;
  link: string;
  description: string;
  language?: string;
  lastBuildDate?: string;
  items: RSSItem[];
  webSubHub?: string;
}

export interface RSSItem {
  title: string;
  link: string;
  guid: string;
  description: string;
  pubDate: string;
  author?: string;
  category?: string[];
  comments?: string;
  image?: string;
  enclosure?: {
    url: string;
    type: string;
    length: number;
  };
}

// Assisted packs
export interface AssistedPack {
  destinationKey: string;
  copyReadyText: string;
  copyReadyMarkdown?: string;
  fieldMappings: FieldMapping[];
  submissionInstructions: string;
  constraintsChecklist?: Constraint[];
  riskFlags?: RiskFlag[];
  tags?: string[];
  metadata?: Record<string, any>;
}

export interface FieldMapping {
  sourceField: string;
  targetField: string;
  transformation?: string;
  required: boolean;
  description?: string;
}

export interface Constraint {
  category: string;
  requirement: string;
  status: 'met' | 'unmet' | 'warning';
  details?: string;
}

export interface RiskFlag {
  severity: 'low' | 'medium' | 'high';
  category: string;
  message: string;
  recommendation?: string;
}

// Medium Pack specific
export interface MediumPack extends AssistedPack {
  importUrl?: string;
  tagSuggestions: string[];
  titleOptions: string[];
  canonicalNote: string;
}

// PRLog Pack specific
export interface PRLogPack extends AssistedPack {
  headline: string;
  summary: string;
  body: string;
  constraintDetails: {
    summaryLimitChars: number;
    maxLinksCount: number;
    supportedCategories: string[];
  };
}

// Community packs
export interface CommunityPack extends AssistedPack {
  platform: 'reddit' | 'hackernews' | 'producthunt';
}

export interface RedditPack extends CommunityPack {
  subredditVariants: SubredditVariant[];
  disclosureRequired: boolean;
  rulesChecklist: Rule[];
}

export interface SubredditVariant {
  subreddit: string;
  adaptedTitle: string;
  adaptedContent: string;
}

export interface Rule {
  subreddit: string;
  rule: string;
  status: 'met' | 'unmet' | 'warning';
}

export interface HackerNewsPack extends CommunityPack {
  titleOptions: string[];
  contextSnippets: string[];
  submissionTips: string[];
}

export interface ProductHuntPack extends CommunityPack {
  launchChecklist: LaunchItem[];
  assetsNeeded: string[];
  copyVariations: CopyVariation[];
}

export interface LaunchItem {
  item: string;
  status: 'pending' | 'complete';
  notes?: string;
}

export interface CopyVariation {
  type: 'headline' | 'tagline' | 'description';
  variant: string;
}

// Rate limiter state
export interface RateLimiterState {
  lastRequestTime: number;
  requestCount: number;
  resetTime: number;
}
