import Anthropic from '@anthropic-ai/sdk';
import { SiteBrief, CampaignSpec, Pillar, Hook, CTA, RolloutPhase, ClaimsMap } from '@/types';

interface PlanResponse {
  pillars: Array<{
    title: string;
    description: string;
    keyMessages: string[];
  }>;
  hooks: Array<{
    text: string;
    context: string;
    targetAudience?: string;
  }>;
  ctas: Array<{
    text: string;
    url: string;
    style?: string;
    placement?: string;
  }>;
  rolloutPlan: Array<{
    phase: number;
    destinations: string[];
    timing: string;
    objectives: string[];
  }>;
}

const CAMPAIGN_SYSTEM_PROMPT = `You are an expert content strategist and campaign planner with deep experience in multi-channel marketing campaigns.

Given a company's site brief, claims map, and compliance requirements, create a comprehensive campaign specification that includes:

1. **Campaign Pillars** (3-5 main content angles/themes):
   - Each pillar should represent a distinct angle or message
   - Include key messages for each pillar
   - Pillars should appeal to different aspects of the audience's needs

2. **Hooks** (compelling openings for each pillar):
   - Create 5-10 different hooks that resonate with the target audience
   - Hooks should address common objections, desires, or pain points
   - Include context for when/where each hook is most effective

3. **CTA Strategy**:
   - Define 3-5 primary CTAs with different messaging
   - Include placements and styles (e.g., banner, inline, footer)
   - CTAs should guide users through the customer journey

4. **10-Day Rollout Plan**:
   - Phase 1 (Days 1-3): Initial awareness and education
   - Phase 2 (Days 4-7): Engagement and consideration
   - Phase 3 (Days 8-10): Conversion and activation
   - For each phase, specify target destinations and objectives

Return response as valid JSON. Ensure the campaign is strategic, multi-channel, and aligned with the company's positioning.`;

export class CampaignPlanner {
  private client: Anthropic;

  constructor() {
    this.client = new Anthropic();
  }

  async planCampaign(
    siteBrief: SiteBrief,
    claimsMap: ClaimsMap
  ): Promise<CampaignSpec> {
    const prompt = this.prepareCampaignPrompt(siteBrief, claimsMap);

    const response = await this.client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: CAMPAIGN_SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const responseText =
      response.content[0].type === 'text' ? response.content[0].text : '{}';

    return this.parseCampaignPlan(responseText, siteBrief);
  }

  private prepareCampaignPrompt(siteBrief: SiteBrief, claimsMap: ClaimsMap): string {
    const claims = claimsMap.claims
      .slice(0, 10)
      .map((c: any) => `- ${c.text} (${c.verified ? 'Verified' : 'Unverified'})`)
      .join('\n');

    return `Create a multi-channel campaign for the following company:

VALUE PROPOSITION: ${siteBrief.valueProp}

TARGET AUDIENCE: ${siteBrief.audienceHypothesis}

BRAND VOICE: ${JSON.stringify(siteBrief.brandVoice, null, 2)}

CORE TOPICS: ${siteBrief.coreTopics.join(', ')}

KEY DIFFERENTIATORS:
${siteBrief.differentiators.map((d) => `- ${d}`).join('\n')}

COMMON OBJECTIONS TO ADDRESS:
${siteBrief.objections.map((o: any) => `- ${o}`).join('\n')}

KEY CLAIMS & PROOF POINTS:
${claims}

PRIMARY CTA URL: ${siteBrief.primaryCtaUrl}

AVAILABLE OFFERS:
${siteBrief.offers.map((o: any) => `- ${o.title}: ${o.description}`).join('\n')}

Create a comprehensive campaign specification with pillar topics, content hooks, CTAs, and a 10-day rollout plan.`;
  }

  private parseCampaignPlan(responseText: string, siteBrief: SiteBrief): CampaignSpec {
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return this.normalizeCampaignPlan(parsed, siteBrief);
      }
    } catch (error) {
      console.error('Failed to parse campaign plan:', error);
    }

    // Return minimal valid campaign spec
    return this.createDefaultCampaignSpec(siteBrief);
  }

  private normalizeCampaignPlan(data: any, siteBrief: SiteBrief): CampaignSpec {
    const pillars: Pillar[] = (data.pillars || []).map((p: any) => ({
      title: String(p.title || ''),
      description: String(p.description || ''),
      keyMessages: Array.isArray(p.keyMessages)
        ? p.keyMessages.map(String)
        : [],
    }));

    const hooks: Hook[] = (data.hooks || []).map((h: any) => ({
      text: String(h.text || ''),
      context: String(h.context || ''),
      targetAudience: h.targetAudience ? String(h.targetAudience) : undefined,
    }));

    const ctas: CTA[] = (data.ctas || []).map((c: any) => ({
      text: String(c.text || ''),
      url: String(c.url || siteBrief.primaryCtaUrl),
      style: c.style ? String(c.style) : undefined,
      placement: c.placement ? String(c.placement) : undefined,
    }));

    const rolloutPlan: RolloutPhase[] = (data.rolloutPlan || []).map(
      (r: any, idx: number) => ({
        phase: r.phase || idx + 1,
        destinations: Array.isArray(r.destinations)
          ? r.destinations.map(String)
          : [],
        timing: String(r.timing || ''),
        objectives: Array.isArray(r.objectives)
          ? r.objectives.map(String)
          : [],
      })
    );

    return {
      pillars: pillars.length > 0 ? pillars : this.createDefaultPillars(siteBrief),
      hooks: hooks.length > 0 ? hooks : this.createDefaultHooks(siteBrief),
      ctas: ctas.length > 0 ? ctas : this.createDefaultCtas(siteBrief),
      rolloutPlan:
        rolloutPlan.length > 0 ? rolloutPlan : this.createDefaultRollout(siteBrief),
    };
  }

  private createDefaultCampaignSpec(siteBrief: SiteBrief): CampaignSpec {
    return {
      pillars: this.createDefaultPillars(siteBrief),
      hooks: this.createDefaultHooks(siteBrief),
      ctas: this.createDefaultCtas(siteBrief),
      rolloutPlan: this.createDefaultRollout(siteBrief),
    };
  }

  private createDefaultPillars(siteBrief: SiteBrief): Pillar[] {
    return [
      {
        title: 'Value & Benefits',
        description: siteBrief.valueProp,
        keyMessages: siteBrief.brandVoice.keyMessages || [siteBrief.valueProp],
      },
      {
        title: 'Differentiation',
        description: 'What sets us apart from competitors',
        keyMessages: siteBrief.differentiators.slice(0, 3),
      },
      {
        title: 'Social Proof',
        description: 'Real results from real customers',
        keyMessages: ['Trusted by industry leaders', 'Proven track record'],
      },
    ];
  }

  private createDefaultHooks(siteBrief: SiteBrief): Hook[] {
    return [
      {
        text: `Discover ${siteBrief.valueProp.toLowerCase()}`,
        context: 'Awareness and interest',
        targetAudience: siteBrief.audienceHypothesis,
      },
      {
        text: `Unlike other solutions, we ${siteBrief.differentiators[0] || 'deliver real value'}`,
        context: 'Differentiation',
        targetAudience: siteBrief.audienceHypothesis,
      },
      {
        text: 'See how businesses like yours are succeeding',
        context: 'Social proof and conversion',
        targetAudience: siteBrief.audienceHypothesis,
      },
    ];
  }

  private createDefaultCtas(siteBrief: SiteBrief): CTA[] {
    return [
      {
        text: 'Learn More',
        url: siteBrief.primaryCtaUrl,
        style: 'primary',
        placement: 'hero',
      },
      {
        text: 'Get Started',
        url: siteBrief.primaryCtaUrl,
        style: 'primary',
        placement: 'mid-content',
      },
      {
        text: 'View Pricing',
        url: siteBrief.primaryCtaUrl,
        style: 'secondary',
        placement: 'footer',
      },
    ];
  }

  private createDefaultRollout(siteBrief: SiteBrief): RolloutPhase[] {
    return [
      {
        phase: 1,
        destinations: ['twitter', 'linkedin', 'email'],
        timing: 'Days 1-3',
        objectives: [
          'Build awareness',
          'Establish credibility',
          'Drive initial traffic',
        ],
      },
      {
        phase: 2,
        destinations: ['blog', 'medium', 'linkedin', 'newsletter'],
        timing: 'Days 4-7',
        objectives: [
          'Deepen engagement',
          'Educate audience',
          'Build consideration',
        ],
      },
      {
        phase: 3,
        destinations: ['email', 'twitter', 'linkedin', 'website'],
        timing: 'Days 8-10',
        objectives: [
          'Drive conversions',
          'Activate customers',
          'Amplify social proof',
        ],
      },
    ];
  }
}
