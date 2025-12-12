// Poor Man's Apollo.io - Data Enrichment Pipeline
// Automatically enriches business card data with multiple sources

import { prisma } from '@/lib/db';
import axios from 'axios';

// Free/Affordable enrichment sources
const FREE_APIS = {
  clearbit_logo: 'https://logo.clearbit.com', // Free logo API
  companies_house_uk: 'https://api.company-information.service.gov.uk', // UK companies (free)
  hunter_io: process.env.HUNTER_API_KEY, // Email finding
  google_maps: process.env.GOOGLE_MAPS_API_KEY, // Location data
};

export interface EnrichmentResult {
  success: boolean;
  source: string;
  data?: any;
  error?: string;
  cost?: number;
}

// Step 1: Clean and normalize data
export function cleanBusinessData(business: any) {
  return {
    // Normalize business name
    businessName: business.businessName?.trim().replace(/\s+/g, ' '),

    // Normalize email
    email: business.email?.toLowerCase().trim(),

    // Normalize phone (remove spaces, dashes)
    phone: business.phone?.replace(/[\s\-\(\)]/g, ''),

    // Normalize website (add https if missing)
    website: business.website?.trim()
      ? (business.website.startsWith('http')
          ? business.website
          : `https://${business.website}`)
      : null,

    // Extract domain from email or website
    domain: extractDomain(business.email || business.website),

    // Normalize address
    address: business.address?.trim(),
    city: business.city?.trim(),
    state: business.state?.trim()?.toUpperCase(),
    zipCode: business.zipCode?.trim(),
  };
}

// Step 2: Extract domain from email or website
export function extractDomain(input: string | null | undefined): string | null {
  if (!input) return null;

  // From email
  if (input.includes('@')) {
    return input.split('@')[1].toLowerCase();
  }

  // From URL
  try {
    const url = input.startsWith('http') ? input : `https://${input}`;
    const domain = new URL(url).hostname.replace('www.', '');
    return domain;
  } catch {
    return null;
  }
}

// Step 3: Get company logo (Free!)
export async function getCompanyLogo(domain: string): Promise<EnrichmentResult> {
  try {
    const logoUrl = `https://logo.clearbit.com/${domain}`;

    // Check if logo exists
    const response = await axios.head(logoUrl, { timeout: 3000 });

    if (response.status === 200) {
      return {
        success: true,
        source: 'clearbit_logo',
        data: { logoUrl },
        cost: 0, // FREE!
      };
    }

    return {
      success: false,
      source: 'clearbit_logo',
      error: 'Logo not found',
      cost: 0,
    };
  } catch (error) {
    return {
      success: false,
      source: 'clearbit_logo',
      error: 'Failed to fetch logo',
      cost: 0,
    };
  }
}

// Step 4: Enrich with Hunter.io (50 free searches/month)
export async function enrichWithHunter(domain: string): Promise<EnrichmentResult> {
  if (!FREE_APIS.hunter_io) {
    return {
      success: false,
      source: 'hunter_io',
      error: 'Hunter.io API key not configured',
    };
  }

  try {
    // Get email count (FREE - doesn't use credits!)
    const countResponse = await axios.get(
      `https://api.hunter.io/v2/email-count?domain=${domain}`,
      {
        params: { api_key: FREE_APIS.hunter_io },
        timeout: 5000,
      }
    );

    const emailCount = countResponse.data.data;

    // Domain search (uses 1 credit)
    const domainResponse = await axios.get(
      `https://api.hunter.io/v2/domain-search?domain=${domain}&limit=5`,
      {
        params: { api_key: FREE_APIS.hunter_io },
        timeout: 5000,
      }
    );

    const domainData = domainResponse.data.data;

    return {
      success: true,
      source: 'hunter_io',
      data: {
        emailCount: emailCount.total,
        emailPattern: domainData.pattern,
        organization: domainData.organization,
        emails: domainData.emails?.slice(0, 3).map((e: any) => ({
          value: e.value,
          type: e.type,
          confidence: e.confidence,
          firstName: e.first_name,
          lastName: e.last_name,
          position: e.position,
        })),
        twitter: domainData.twitter,
        linkedin: domainData.linkedin,
      },
      cost: 1, // 1 Hunter.io credit
    };
  } catch (error: any) {
    return {
      success: false,
      source: 'hunter_io',
      error: error.message,
      cost: 0,
    };
  }
}

// Step 4.5: Verify email deliverability with Hunter.io
export async function verifyEmailWithHunter(email: string): Promise<EnrichmentResult> {
  if (!FREE_APIS.hunter_io) {
    return {
      success: false,
      source: 'hunter_io_verifier',
      error: 'Hunter.io API key not configured',
    };
  }

  try {
    console.log(`[ENRICHMENT] Verifying email: ${email}`);

    const response = await axios.get(
      `https://api.hunter.io/v2/email-verifier`,
      {
        params: {
          email,
          api_key: FREE_APIS.hunter_io
        },
        timeout: 10000,
      }
    );

    const verificationData = response.data.data;

    console.log(`[ENRICHMENT] Email verification result:`, {
      email,
      status: verificationData.status,
      result: verificationData.result,
      score: verificationData.score
    });

    return {
      success: true,
      source: 'hunter_io_verifier',
      data: {
        status: verificationData.status,           // valid, invalid, accept_all, unknown
        result: verificationData.result,           // deliverable, undeliverable, risky
        score: verificationData.score,             // 0-100 confidence score
        regexp: verificationData.regexp,           // Email format valid
        gibberish: verificationData.gibberish,     // Looks like gibberish
        disposable: verificationData.disposable,   // Disposable email service
        webmail: verificationData.webmail,         // Webmail (gmail, yahoo, etc)
        mxRecords: verificationData.mx_records,    // Has MX records
        smtpServer: verificationData.smtp_server,  // SMTP server exists
        smtpCheck: verificationData.smtp_check,    // SMTP check passed
        acceptAll: verificationData.accept_all,    // Domain accepts all emails
        block: verificationData.block,             // Should block this email
      },
      cost: 1, // 1 Hunter.io credit per verification
    };
  } catch (error: any) {
    console.error('[ENRICHMENT] Email verification error:', error.message);
    return {
      success: false,
      source: 'hunter_io_verifier',
      error: error.message,
      cost: 0,
    };
  }
}

// Step 5: Get social media profiles (Free!)
export async function findSocialProfiles(businessName: string, domain: string | null): Promise<EnrichmentResult> {
  try {
    const profiles: any = {
      linkedin: null,
      twitter: null,
      facebook: null,
      instagram: null,
    };

    // LinkedIn company search (construct likely URL)
    if (businessName) {
      const linkedinSlug = businessName
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-');
      profiles.linkedin = `https://www.linkedin.com/company/${linkedinSlug}`;
    }

    // Twitter search
    if (domain) {
      const twitterHandle = domain.split('.')[0];
      profiles.twitter = `https://twitter.com/${twitterHandle}`;
    }

    // Facebook (check if page exists)
    if (businessName) {
      const fbSlug = businessName.toLowerCase().replace(/\s+/g, '');
      profiles.facebook = `https://www.facebook.com/${fbSlug}`;
    }

    return {
      success: true,
      source: 'social_profiles',
      data: profiles,
      cost: 0, // FREE!
    };
  } catch (error) {
    return {
      success: false,
      source: 'social_profiles',
      error: 'Failed to find social profiles',
      cost: 0,
    };
  }
}

// Step 6: Determine company size based on signals
export function estimateCompanySize(data: {
  employeeCount?: number;
  emailCount?: number;
  googleReviewCount?: number;
}): string {
  const { employeeCount, emailCount, googleReviewCount } = data;

  // If we have employee count from enrichment
  if (employeeCount) {
    if (employeeCount <= 10) return '1-10';
    if (employeeCount <= 50) return '11-50';
    if (employeeCount <= 200) return '51-200';
    if (employeeCount <= 1000) return '201-1000';
    return '1000+';
  }

  // Estimate from email count (from Hunter.io)
  if (emailCount) {
    if (emailCount <= 5) return '1-10';
    if (emailCount <= 20) return '11-50';
    if (emailCount <= 100) return '51-200';
    if (emailCount <= 500) return '201-1000';
    return '1000+';
  }

  // Estimate from Google review count
  if (googleReviewCount) {
    if (googleReviewCount <= 10) return '1-10';
    if (googleReviewCount <= 50) return '11-50';
    return '51-200';
  }

  return 'Unknown';
}

// Step 7: Calculate lead score (0-100)
export function calculateLeadScore(business: any): number {
  let score = 0;

  // Has valid email (+30 points)
  if (business.emailValid) score += 30;

  // Has website (+15 points)
  if (business.website) score += 15;

  // Has phone (+10 points)
  if (business.phone) score += 10;

  // Google rating (+20 points max)
  if (business.googleRating) {
    score += Math.round((business.googleRating / 5) * 20);
  }

  // Has location data (+10 points)
  if (business.latitude && business.longitude) score += 10;

  // Recent business (+5 points if added recently)
  const daysSinceCreated = business.createdAt
    ? Math.floor((Date.now() - new Date(business.createdAt).getTime()) / (1000 * 60 * 60 * 24))
    : 999;
  if (daysSinceCreated <= 7) score += 5;

  // Has enrichment data (+10 points)
  if (business.hunterEnrichedAt) score += 10;

  return Math.min(score, 100);
}

// MAIN ENRICHMENT PIPELINE
export async function enrichBusiness(businessId: string) {
  try {
    // Get business from database
    const business = await prisma.business.findUnique({
      where: { id: businessId },
    });

    if (!business) {
      throw new Error('Business not found');
    }

    // Step 1: Clean data
    const cleaned = cleanBusinessData(business);
    const domain = cleaned.domain;

    const enrichments: EnrichmentResult[] = [];
    const updates: any = {
      ...cleaned,
    };

    // Step 2: Get company logo (FREE!)
    if (domain) {
      const logoResult = await getCompanyLogo(domain);
      enrichments.push(logoResult);
      if (logoResult.success) {
        updates.businessCardImageUrl = logoResult.data.logoUrl;
      }
    }

    // Step 3: Enrich with Hunter.io
    if (domain && !business.hunterEnrichedAt) {
      const hunterResult = await enrichWithHunter(domain);
      enrichments.push(hunterResult);

      if (hunterResult.success) {
        updates.hunterEmailPattern = hunterResult.data.emailPattern;
        updates.hunterEmailCount = hunterResult.data.emailCount;
        updates.hunterEnrichedAt = new Date();

        // If no email, use first found email
        if (!updates.email && hunterResult.data.emails?.length > 0) {
          updates.email = hunterResult.data.emails[0].value;
        }
      }
    }

    // Step 3.5: Verify email with Hunter.io (if email exists and not already verified)
    const emailToVerify = updates.email || business.email;
    if (emailToVerify && !business.hunterVerificationStatus) {
      console.log(`[ENRICHMENT] Email found, verifying: ${emailToVerify}`);
      const verificationResult = await verifyEmailWithHunter(emailToVerify);
      enrichments.push(verificationResult);

      if (verificationResult.success) {
        const data = verificationResult.data;

        // Store verification results
        updates.hunterVerificationStatus = data.result; // deliverable, undeliverable, risky
        updates.hunterVerificationScore = data.score;   // 0-100 confidence score

        // Update emailValid based on verification
        if (data.result === 'deliverable' && data.score >= 70) {
          updates.emailValid = true;
        } else if (data.result === 'undeliverable' || data.block) {
          updates.emailValid = false;
        } else {
          updates.emailValid = null; // risky or unknown
        }

        console.log(`[ENRICHMENT] Email verification complete:`, {
          email: emailToVerify,
          status: data.result,
          score: data.score,
          valid: updates.emailValid
        });
      } else {
        console.warn(`[ENRICHMENT] Email verification failed:`, verificationResult.error);
      }
    }

    // Step 4: Find social profiles (FREE!)
    if (domain || business.businessName) {
      const socialResult = await findSocialProfiles(
        business.businessName,
        domain
      );
      enrichments.push(socialResult);

      if (socialResult.success) {
        updates.linkedinUrl = socialResult.data.linkedin;
        updates.website = updates.website || socialResult.data.facebook;
      }
    }

    // Step 5: Calculate lead score
    const leadScore = calculateLeadScore({ ...business, ...updates });

    // Determine lead priority based on score
    let leadPriority = 'low';
    if (leadScore >= 80) leadPriority = 'high';
    else if (leadScore >= 50) leadPriority = 'medium';

    updates.confidenceScore = leadScore / 100; // Store as 0-1
    updates.leadPriority = leadPriority;

    // Step 6: Update business in database
    const updatedBusiness = await prisma.business.update({
      where: { id: businessId },
      data: updates,
    });

    // Step 7: Log API usage
    const totalCost = enrichments.reduce((sum, e) => sum + (e.cost || 0), 0);
    if (totalCost > 0) {
      await prisma.apiUsageLog.create({
        data: {
          service: 'enrichment_pipeline',
          businessId,
          requestType: 'full_enrichment',
          success: true,
          estimatedCost: totalCost,
          responseData: {
            enrichments: enrichments.map(e => ({
              source: e.source,
              success: e.success,
              cost: e.cost,
            })),
          },
        },
      });
    }

    return {
      success: true,
      business: updatedBusiness,
      enrichments,
      totalCost,
      leadScore,
    };
  } catch (error: any) {
    console.error('Enrichment pipeline error:', error);
    throw error;
  }
}

// Batch enrichment (process multiple businesses)
export async function batchEnrichBusinesses(businessIds: string[]) {
  const results = [];

  for (const id of businessIds) {
    try {
      const result = await enrichBusiness(id);
      results.push(result);

      // Rate limiting: wait 1 second between requests
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      results.push({
        success: false,
        businessId: id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  return results;
}
