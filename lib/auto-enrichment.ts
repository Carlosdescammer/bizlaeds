// PHASE 3: Auto-enrichment Pipeline
// Automatically enriches businesses with Hunter.io data

import { prisma } from '@/lib/db';
import * as hunter from '@/lib/hunter-service';
import { calculateEnhancedLeadScore } from '@/lib/enhanced-lead-scoring';

export interface EnrichmentResult {
  success: boolean;
  businessId: string;
  enrichments: {
    emailCount?: boolean;
    domainSearch?: boolean;
    emailVerification?: boolean;
    emailEnrichment?: boolean;
    companyEnrichment?: boolean;
  };
  errors?: string[];
  leadScore?: number;
}

/**
 * Auto-enrich a single business with all available Hunter.io data
 */
export async function autoEnrichBusiness(businessId: string): Promise<EnrichmentResult> {
  const result: EnrichmentResult = {
    success: false,
    businessId,
    enrichments: {},
    errors: [],
  };

  try {
    // Get business from database
    const business = await prisma.business.findUnique({
      where: { id: businessId },
    });

    if (!business) {
      result.errors?.push('Business not found');
      return result;
    }

    // Extract domain from website or email
    let domain: string | null = null;
    if (business.website) {
      try {
        let url = business.website;
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
          url = 'https://' + url;
        }
        domain = new URL(url).hostname.replace(/^www\./, '');
      } catch {
        // Invalid URL
      }
    } else if (business.email) {
      domain = business.email.split('@')[1];
    }

    if (!domain) {
      result.errors?.push('No domain available for enrichment');
      return result;
    }

    // Step 1: Email Count (FREE - always do this first)
    try {
      const emailCountResult = await hunter.getEmailCount(domain);
      if (emailCountResult.success && emailCountResult.data) {
        await prisma.business.update({
          where: { id: businessId },
          data: {
            hunterEmailCount: emailCountResult.data.total,
            hunterEnrichedAt: new Date(),
          },
        });
        result.enrichments.emailCount = true;
      }
    } catch (error: any) {
      result.errors?.push(`Email Count failed: ${error.message}`);
    }

    // Step 2: Company Enrichment
    try {
      const companyResult = await hunter.enrichCompany(domain);
      if (companyResult.success && companyResult.data) {
        await prisma.business.update({
          where: { id: businessId },
          data: {
            linkedinUrl: companyResult.data.linkedinUrl || business.linkedinUrl,
            twitterHandle: companyResult.data.twitterHandle || business.twitterHandle,
            enrichedByService: 'hunter',
            enrichedAt: new Date(),
          },
        });
        result.enrichments.companyEnrichment = true;
      }
    } catch (error: any) {
      result.errors?.push(`Company Enrichment failed: ${error.message}`);
    }

    // Step 3: Domain Search (if email not already found)
    if (!business.email) {
      try {
        const domainSearchResult = await hunter.domainSearch(domain, { limit: 10 });
        if (domainSearchResult.success && domainSearchResult.data) {
          const bestEmail = domainSearchResult.data.emails
            ?.sort((a, b) => b.confidence - a.confidence)[0];

          if (bestEmail) {
            await prisma.business.update({
              where: { id: businessId },
              data: {
                email: bestEmail.value,
                emailConfidence: bestEmail.confidence,
                contactPosition: bestEmail.position || business.contactPosition,
                contactSeniority: bestEmail.seniority || business.contactSeniority,
                contactDepartment: bestEmail.department || business.contactDepartment,
                contactLinkedin: bestEmail.linkedin || business.contactLinkedin,
                contactTwitter: bestEmail.twitter || business.contactTwitter,
                contactPhoneNumber: bestEmail.phoneNumber || business.contactPhoneNumber,
                hunterEmailPattern: domainSearchResult.data.pattern,
                hunterEnrichedAt: new Date(),
              },
            });
            result.enrichments.domainSearch = true;
          }
        }
      } catch (error: any) {
        result.errors?.push(`Domain Search failed: ${error.message}`);
      }
    }

    // Step 4: Email Verification (if email exists)
    const updatedBusiness = await prisma.business.findUnique({
      where: { id: businessId },
    });

    if (updatedBusiness?.email) {
      try {
        const verifyResult = await hunter.verifyEmail(updatedBusiness.email);
        if (verifyResult.success && verifyResult.data) {
          await prisma.business.update({
            where: { id: businessId },
            data: {
              hunterVerificationStatus: verifyResult.data.status,
              hunterVerificationScore: verifyResult.data.score,
              hunterVerifiedAt: new Date(),
              emailDeliverability: verifyResult.data.result,
              emailRiskLevel:
                verifyResult.data.result === 'risky'
                  ? 'high'
                  : verifyResult.data.result === 'deliverable'
                  ? 'low'
                  : 'medium',
            },
          });
          result.enrichments.emailVerification = true;
        }
      } catch (error: any) {
        result.errors?.push(`Email Verification failed: ${error.message}`);
      }

      // Step 5: Email Enrichment (get full contact profile)
      try {
        const enrichResult = await hunter.enrichEmail(updatedBusiness.email);
        if (enrichResult.success && enrichResult.data) {
          await prisma.business.update({
            where: { id: businessId },
            data: {
              contactName: enrichResult.data.fullName || updatedBusiness.contactName,
              contactPosition: enrichResult.data.position || updatedBusiness.contactPosition,
              contactSeniority: enrichResult.data.seniority || updatedBusiness.contactSeniority,
              contactDepartment:
                enrichResult.data.department || updatedBusiness.contactDepartment,
              contactLinkedin: enrichResult.data.linkedin || updatedBusiness.contactLinkedin,
              contactTwitter: enrichResult.data.twitter || updatedBusiness.contactTwitter,
              contactPhoneNumber:
                enrichResult.data.phoneNumber || updatedBusiness.contactPhoneNumber,
              contactLocation:
                enrichResult.data.city && enrichResult.data.state
                  ? `${enrichResult.data.city}, ${enrichResult.data.state}`
                  : updatedBusiness.contactLocation,
              contactTimezone: enrichResult.data.timezone || updatedBusiness.contactTimezone,
            },
          });
          result.enrichments.emailEnrichment = true;
        }
      } catch (error: any) {
        result.errors?.push(`Email Enrichment failed: ${error.message}`);
      }
    }

    // Step 6: Calculate enhanced lead score
    const finalBusiness = await prisma.business.findUnique({
      where: { id: businessId },
    });

    if (finalBusiness) {
      const leadScore = calculateEnhancedLeadScore(finalBusiness);
      await prisma.business.update({
        where: { id: businessId },
        data: {
          relevanceScore: leadScore.totalScore,
          leadPriority:
            leadScore.totalScore >= 80
              ? 'high'
              : leadScore.totalScore >= 60
              ? 'medium'
              : 'low',
        },
      });
      result.leadScore = leadScore.totalScore;
    }

    result.success = Object.values(result.enrichments).some((v) => v === true);
    return result;
  } catch (error: any) {
    result.errors?.push(`Auto-enrichment error: ${error.message}`);
    return result;
  }
}

/**
 * Batch auto-enrich multiple businesses
 */
export async function batchAutoEnrich(
  businessIds: string[],
  options?: {
    onProgress?: (progress: { completed: number; total: number; current?: string }) => void;
    delayMs?: number;
  }
): Promise<{
  success: boolean;
  results: EnrichmentResult[];
  summary: {
    total: number;
    successful: number;
    failed: number;
  };
}> {
  const results: EnrichmentResult[] = [];
  const summary = {
    total: businessIds.length,
    successful: 0,
    failed: 0,
  };

  for (let i = 0; i < businessIds.length; i++) {
    const businessId = businessIds[i];

    // Report progress
    if (options?.onProgress) {
      options.onProgress({
        completed: i,
        total: businessIds.length,
        current: businessId,
      });
    }

    const result = await autoEnrichBusiness(businessId);
    results.push(result);

    if (result.success) {
      summary.successful++;
    } else {
      summary.failed++;
    }

    // Delay between requests to respect rate limits
    if (i < businessIds.length - 1 && options?.delayMs) {
      await new Promise((resolve) => setTimeout(resolve, options.delayMs));
    }
  }

  // Final progress report
  if (options?.onProgress) {
    options.onProgress({
      completed: businessIds.length,
      total: businessIds.length,
    });
  }

  return {
    success: true,
    results,
    summary,
  };
}

/**
 * Auto-enrich all businesses that haven't been enriched yet
 */
export async function autoEnrichPending(options?: {
  limit?: number;
  onProgress?: (progress: { completed: number; total: number }) => void;
}): Promise<{
  success: boolean;
  summary: {
    total: number;
    successful: number;
    failed: number;
  };
}> {
  // Find businesses that haven't been enriched by Hunter yet
  const businesses = await prisma.business.findMany({
    where: {
      OR: [
        { hunterEnrichedAt: null },
        {
          hunterEnrichedAt: {
            lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Older than 30 days
          },
        },
      ],
      website: {
        not: null,
      },
    },
    take: options?.limit || 50,
    select: {
      id: true,
    },
  });

  const businessIds = businesses.map((b) => b.id);

  return await batchAutoEnrich(businessIds, {
    onProgress: options?.onProgress,
    delayMs: 1000, // 1 second delay between requests
  });
}
