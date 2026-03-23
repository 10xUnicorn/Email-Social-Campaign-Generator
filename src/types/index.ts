// Core domain interfaces and types

// User and Organization
export interface User {
  id: string;
  email: string;
  name?: string;
  avatarUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  ownerId: string;
  plan: 'free' | 'pro' | 'enterprise';
  createdAt: Date;
}

export interface OrgMembership {
  userId: string;
  orgId: string;
  role: 'owner' | 'admin' | 'member';
}

// Site Brief and Campaign Configuration
export interface SiteBrief {
  valueProp: string;
  audienceHypothesis: string;
  objections: string[];
  differentiators: string[];
  primaryCtaUrl: string;
  offers: Offer[];
  brandVoice: BrandVoice;
  coreTopics: string[];
}

export interface Offer {
  title: string;
  description: string;
  cta: string;
  url: string;
}

export interface BrandVoice {
  tone?: string;
  perspective?: string;
  vocabulary?: string;
  keyMessages?: string[];
}

// Claims and verification
export interface ClaimsMap {
  claims: Claim[];
}

export interface Claim {
  text: string;
  source?: string;
  verified: boolean;
}

// Campaign specification
export interface CampaignSpec {
  pillars: Pillar[];
  hooks: Hook[];
  ctas: CTA[];
  rolloutPlan: RolloutPhase[];
}

export interface Pillar {
  title: string;
  description: string;
  keyMessages: string[];
}

export interface Hook {
  text: string;
  context: string;
  targetAudience?: string;
}

export interface CTA {
  text: string;
  url: string;
  style?: string;
  placement?: string;
}

export interface RolloutPhase {
  phase: number;
  destinations: string[];
  timing: string;
  objectives: string[];
}

// Campaign model
export interface Campaign {
  id: string;
  orgId: string;
  sourceUrl?: string;
  sourceType?: string;
  canonicalSiteUrl?: string;
  utmPolicy?: string;
  status: 'draft' | 'generating' | 'ready' | 'publishing' | 'completed' | 'failed';
  siteBrief?: SiteBrief;
  claimsMap?: ClaimsMap;
  pillars?: Pillar[];
  primaryCtas?: CTA[];
  createdAt: Date;
  updatedAt: Date;
}

// Content asset types and models
export type AssetType = 'article' | 'blog_post' | 'press_release' | 'newsletter' | 'email' | 'social_snippet' | 'social_linkedin' | 'social_twitter' | 'social_facebook' | 'social_instagram' | 'pdf_document' | 'video_script' | 'podcast_script' | 'case_study' | 'landing_page';

export type AssetStatus = 'draft' | 'approved' | 'published' | 'failed';

export interface ContentAsset {
  id: string;
  campaignId: string;
  assetType: AssetType;
  title: string;
  bodyMarkdown: string;
  excerpt?: string;
  tags: string[];
  heroImage?: string;
  canonicalUrl?: string;
  claims?: Claim[];
  disclosures?: string;
  status: AssetStatus;
  uniquenessScore?: number;
  version: number;
  originalBodyMd?: string;
  targetPlatform?: string;
  scheduledAt?: Date;
  scheduledPlatforms?: { platform: string; scheduledAt: Date }[];
  images?: string[];
  createdAt: Date;
  updatedAt: Date;
}

// Destination and connector configuration
export interface ConnectorConfig {
  destinationKey: string;
  group: 'api' | 'feed' | 'assist';
  requiredFields: RequiredField[];
  limits: ConnectorLimits;
  supportsCanonical: boolean;
  authType: 'oauth' | 'apikey' | 'basic' | 'none';
}

export interface RequiredField {
  name: string;
  type: string;
  description?: string;
  validation?: string;
}

export interface ConnectorLimits {
  maxContentLength?: number;
  maxImageSize?: number;
  rateLimit?: RateLimit;
  dailyLimit?: number;
  monthlyLimit?: number;
}

export interface RateLimit {
  requests: number;
  period: string; // seconds, minutes, hours, days
}

// Destination credential and submission
export interface DestinationCredential {
  id: string;
  orgId: string;
  destinationId: string;
  credentials: string; // Encrypted
  tokenExpiry?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type SubmissionStatus = 'queued' | 'sending' | 'sent' | 'failed' | 'manual_needed' | 'skipped';

export interface DestinationSubmission {
  id: string;
  assetId: string;
  destinationId: string;
  campaignId: string;
  orgId: string;
  prefillJson?: Record<string, any>;
  validationReport?: ValidationReport;
  status: SubmissionStatus;
  externalId?: string;
  publishedUrl?: string;
  errorLog?: string;
  idempotencyKey: string;
  attempts: number;
  lastAttemptAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ValidationReport {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  field: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface ValidationWarning {
  field: string;
  message: string;
}

// Connector result
export interface ConnectorResult {
  success: boolean;
  externalId?: string;
  publishedUrl?: string;
  error?: ConnectorError;
  retryable?: boolean;
}

export interface ConnectorError {
  code: string;
  message: string;
  details?: Record<string, any>;
}

// Assisted pack for user-guided publishing
export interface AssistedPack {
  destinationKey: string;
  copyReadyText: string;
  copyReadyMarkdown: string;
  fieldMappings: FieldMapping[];
  submissionInstructions: string;
  constraintsChecklist: Constraint[];
  riskFlags: RiskFlag[];
}

export interface FieldMapping {
  sourceField: string;
  targetField: string;
  transformation?: string;
  required: boolean;
}

export interface Constraint {
  category: string;
  requirement: string;
  status: 'met' | 'unmet' | 'warning';
}

export interface RiskFlag {
  severity: 'low' | 'medium' | 'high';
  category: string;
  message: string;
  recommendation?: string;
}

// Preview data
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

// Publishing
export type PublishMode = 'dry_run' | 'live';

export type PublishStatus = 'pending' | 'running' | 'completed' | 'failed';

export interface PublishJob {
  id: string;
  campaignId: string;
  orgId: string;
  mode: PublishMode;
  status: PublishStatus;
  startedAt?: Date;
  completedAt?: Date;
  summary?: PublishSummary;
}

export interface PublishSummary {
  totalDestinations: number;
  successful: number;
  failed: number;
  skipped: number;
  duration: number; // milliseconds
  errors: PublishError[];
}

export interface PublishError {
  destinationKey: string;
  error: string;
  retryable: boolean;
}

// Tracking
export interface TrackingLink {
  id: string;
  submissionId?: string;
  campaignId: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  redirectUrl: string;
  originalUrl: string;
  clicks: number;
  createdAt: Date;
}

// Compliance and configuration
export interface ComplianceSettings {
  canonicalStrategy: 'enforce' | 'prefer' | 'optional';
  linkPolicy: 'utm_only' | 'canonical_only' | 'both';
  distributionPacing: DistributionPacing;
  claimsPolicy: ClaimPolicy;
}

export interface DistributionPacing {
  strategy: 'immediate' | 'staggered' | 'scheduled';
  delayBetweenDestinations?: number; // milliseconds
  startTime?: Date;
  endTime?: Date;
}

export interface ClaimPolicy {
  requireVerification: boolean;
  allowedSources: string[];
  maxUnverifiedClaims: number;
}

// Destination registry entry
export interface DestinationRegistry {
  key: string;
  name: string;
  group: 'api' | 'feed' | 'assist';
  requiredFields: DestinationField[];
  authType: 'oauth' | 'apikey' | 'basic' | 'none';
  limits: ConnectorLimits;
  supportsCanonical: boolean;
  description: string;
}

export interface DestinationField {
  name: string;
  type: string;
  required: boolean;
  description?: string;
}

// Audit logging
export interface AuditLog {
  id: string;
  orgId: string;
  userId?: string;
  action: string;
  entityType: string;
  entityId: string;
  metadata?: Record<string, any>;
  createdAt: Date;
}
