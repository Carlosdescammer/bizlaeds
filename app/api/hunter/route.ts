import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import * as hunter from '@/lib/hunter-service';

// Helper function to log API usage
async function logApiUsage(
  service: string,
  businessId: string | null,
  estimatedCost: number,
  success: boolean,
  errorMessage?: string,
  responseData?: any
) {
  try {
    await prisma.apiUsageLog.create({
      data: {
        service,
        businessId,
        estimatedCost,
        success,
        errorMessage,
        responseData,
      },
    });
  } catch (error) {
    console.error('Failed to log API usage:', error);
  }
}

/**
 * POST /api/hunter
 * Comprehensive Hunter.io API endpoint
 *
 * Actions:
 * - email-count: Get email count for domain (FREE)
 * - domain-search: Find all emails for domain
 * - email-finder: Find specific person's email
 * - email-verifier: Verify single email
 * - bulk-verify: Verify multiple emails
 * - email-enrichment: Enrich email with full profile
 * - company-enrichment: Enrich company from domain
 * - discover: Find companies matching criteria
 * - account-info: Get Hunter account usage stats
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, businessId, ...params } = body;

    // ========================================================================
    // PHASE 1: Quick Wins
    // ========================================================================

    if (action === 'email-count') {
      const { domain } = params;
      if (!domain) {
        return NextResponse.json({ error: 'Domain is required' }, { status: 400 });
      }

      const result = await hunter.getEmailCount(domain);
      await logApiUsage('hunter_email_count', businessId || null, 0, result.success, result.error);

      if (result.success && businessId) {
        // Update business with email count
        await prisma.business.update({
          where: { id: businessId },
          data: {
            hunterEmailCount: result.data?.total || 0,
            hunterEnrichedAt: new Date(),
          },
        });
      }

      return NextResponse.json(result);
    }

    if (action === 'domain-search') {
      const { domain, limit, offset, type, seniority, department } = params;
      if (!domain) {
        return NextResponse.json({ error: 'Domain is required' }, { status: 400 });
      }

      const result = await hunter.domainSearch(domain, {
        limit,
        offset,
        type,
        seniority,
        department,
      });

      await logApiUsage(
        'hunter_domain_search',
        businessId || null,
        0.001,
        result.success,
        result.error,
        result.data
      );

      if (result.success && businessId && result.data) {
        // Update business with best email and company info
        const bestEmail = result.data.emails
          ?.sort((a, b) => b.confidence - a.confidence)[0];

        const updateData: any = {
          hunterEmailPattern: result.data.pattern,
          hunterEmailCount: result.data.emails?.length || 0,
          hunterEnrichedAt: new Date(),
        };

        if (bestEmail) {
          updateData.email = bestEmail.value;
          if (bestEmail.firstName && bestEmail.lastName) {
            updateData.contactName = `${bestEmail.firstName} ${bestEmail.lastName}`;
          }
        }

        if (result.data.linkedinUrl) updateData.linkedinUrl = result.data.linkedinUrl;
        if (result.data.twitterHandle) updateData.twitterHandle = result.data.twitterHandle;

        await prisma.business.update({
          where: { id: businessId },
          data: updateData,
        });
      }

      return NextResponse.json(result);
    }

    if (action === 'email-verifier') {
      const { email } = params;
      if (!email) {
        return NextResponse.json({ error: 'Email is required' }, { status: 400 });
      }

      const result = await hunter.verifyEmail(email);

      await logApiUsage(
        'hunter_email_verifier',
        businessId || null,
        0.0005,
        result.success,
        result.error,
        result.data
      );

      if (result.success && businessId && result.data) {
        // Update business with verification info
        await prisma.business.update({
          where: { id: businessId },
          data: {
            hunterVerificationStatus: result.data.result,
            hunterVerificationScore: result.data.score,
            emailValid: result.data.result === 'deliverable' && result.data.score >= 70,
          },
        });
      }

      return NextResponse.json(result);
    }

    if (action === 'bulk-verify') {
      const { emails } = params;
      if (!emails || !Array.isArray(emails)) {
        return NextResponse.json({ error: 'Emails array is required' }, { status: 400 });
      }

      const result = await hunter.bulkVerifyEmails(emails);

      await logApiUsage(
        'hunter_bulk_verify',
        null,
        0.0005 * emails.length,
        result.success,
        undefined,
        { summary: result.summary }
      );

      return NextResponse.json(result);
    }

    if (action === 'company-enrichment') {
      const { domain } = params;
      if (!domain) {
        return NextResponse.json({ error: 'Domain is required' }, { status: 400 });
      }

      const result = await hunter.enrichCompany(domain);

      await logApiUsage(
        'hunter_company_enrichment',
        businessId || null,
        0.001,
        result.success,
        result.error,
        result.data
      );

      if (result.success && businessId && result.data) {
        // Update business with company enrichment
        await prisma.business.update({
          where: { id: businessId },
          data: {
            linkedinUrl: result.data.linkedinUrl || undefined,
            twitterHandle: result.data.twitterHandle || undefined,
            hunterEnrichedAt: new Date(),
          },
        });
      }

      return NextResponse.json(result);
    }

    // ========================================================================
    // PHASE 2: Power Features
    // ========================================================================

    if (action === 'email-finder') {
      const { domain, firstName, lastName, companyName, linkedin } = params;
      if (!domain || !firstName || !lastName) {
        return NextResponse.json(
          { error: 'Domain, firstName, and lastName are required' },
          { status: 400 }
        );
      }

      const result = await hunter.findEmail(domain, firstName, lastName, {
        companyName,
        linkedin,
      });

      await logApiUsage(
        'hunter_email_finder',
        businessId || null,
        0.001,
        result.success,
        result.error,
        result.data
      );

      if (result.success && businessId && result.data) {
        // Update business with found email and contact info
        await prisma.business.update({
          where: { id: businessId },
          data: {
            email: result.data.email,
            contactName: result.data.firstName && result.data.lastName
              ? `${result.data.firstName} ${result.data.lastName}`
              : undefined,
            hunterEnrichedAt: new Date(),
          },
        });
      }

      return NextResponse.json(result);
    }

    if (action === 'email-enrichment') {
      const { email } = params;
      if (!email) {
        return NextResponse.json({ error: 'Email is required' }, { status: 400 });
      }

      const result = await hunter.enrichEmail(email);

      await logApiUsage(
        'hunter_email_enrichment',
        businessId || null,
        0.001,
        result.success,
        result.error,
        result.data
      );

      if (result.success && businessId && result.data) {
        // Update business with enriched contact info
        await prisma.business.update({
          where: { id: businessId },
          data: {
            contactName: result.data.fullName || undefined,
            hunterEnrichedAt: new Date(),
          },
        });
      }

      return NextResponse.json(result);
    }

    if (action === 'discover') {
      const {
        query,
        location,
        industry,
        minEmployees,
        maxEmployees,
        technology,
        limit,
        offset,
      } = params;

      const result = await hunter.discoverCompanies({
        query,
        location,
        industry,
        minEmployees,
        maxEmployees,
        technology,
        limit,
        offset,
      });

      await logApiUsage(
        'hunter_discover',
        null,
        0,
        result.success,
        result.error,
        { total: result.data?.total }
      );

      return NextResponse.json(result);
    }

    if (action === 'account-info') {
      const result = await hunter.getAccountInfo();

      await logApiUsage('hunter_account_info', null, 0, result.success, result.error);

      return NextResponse.json(result);
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    console.error('Hunter API error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * GET /api/hunter?action=account-info
 * Get Hunter account information
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const action = searchParams.get('action');

    if (action === 'account-info') {
      const result = await hunter.getAccountInfo();
      return NextResponse.json(result);
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    console.error('Hunter API error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
