import { NextRequest, NextResponse } from 'next/server';
import { autoEnrichBusiness, batchAutoEnrich, autoEnrichPending } from '@/lib/auto-enrichment';
import { calculateEnhancedLeadScore, getLeadQualityLabel } from '@/lib/enhanced-lead-scoring';
import { prisma } from '@/lib/db';

/**
 * POST /api/auto-enrich
 * Auto-enrich businesses with Hunter.io data
 *
 * Actions:
 * - enrich-one: Enrich a single business by ID
 * - enrich-batch: Enrich multiple businesses by IDs
 * - enrich-pending: Enrich all businesses that haven't been enriched yet
 * - calculate-score: Calculate enhanced lead score for a business
 * - recalculate-all-scores: Recalculate scores for all businesses
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, businessId, businessIds, limit } = body;

    if (action === 'enrich-one') {
      if (!businessId) {
        return NextResponse.json({ error: 'Business ID is required' }, { status: 400 });
      }

      const result = await autoEnrichBusiness(businessId);

      return NextResponse.json({
        success: result.success,
        enrichments: result.enrichments,
        errors: result.errors,
        leadScore: result.leadScore,
      });
    }

    if (action === 'enrich-batch') {
      if (!businessIds || !Array.isArray(businessIds)) {
        return NextResponse.json({ error: 'Business IDs array is required' }, { status: 400 });
      }

      const result = await batchAutoEnrich(businessIds, {
        delayMs: 1000, // 1 second delay between requests
      });

      return NextResponse.json({
        success: result.success,
        results: result.results,
        summary: result.summary,
      });
    }

    if (action === 'enrich-pending') {
      const result = await autoEnrichPending({
        limit: limit || 50,
      });

      return NextResponse.json({
        success: result.success,
        summary: result.summary,
      });
    }

    if (action === 'calculate-score') {
      if (!businessId) {
        return NextResponse.json({ error: 'Business ID is required' }, { status: 400 });
      }

      const business = await prisma.business.findUnique({
        where: { id: businessId },
      });

      if (!business) {
        return NextResponse.json({ error: 'Business not found' }, { status: 404 });
      }

      const scoreBreakdown = calculateEnhancedLeadScore(business);
      const qualityLabel = getLeadQualityLabel(scoreBreakdown.totalScore);

      // Update the business with new score
      await prisma.business.update({
        where: { id: businessId },
        data: {
          relevanceScore: scoreBreakdown.totalScore,
          leadPriority: scoreBreakdown.priority,
        },
      });

      return NextResponse.json({
        success: true,
        score: scoreBreakdown.totalScore,
        priority: scoreBreakdown.priority,
        quality: qualityLabel,
        breakdown: scoreBreakdown.categories,
        recommendations: scoreBreakdown.recommendations,
      });
    }

    if (action === 'recalculate-all-scores') {
      // Get all businesses
      const businesses = await prisma.business.findMany({
        take: limit || 100,
      });

      let updated = 0;
      for (const business of businesses) {
        const scoreBreakdown = calculateEnhancedLeadScore(business);

        await prisma.business.update({
          where: { id: business.id },
          data: {
            relevanceScore: scoreBreakdown.totalScore,
            leadPriority: scoreBreakdown.priority,
          },
        });

        updated++;
      }

      return NextResponse.json({
        success: true,
        message: `Recalculated scores for ${updated} businesses`,
        total: updated,
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    console.error('Auto-enrich API error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * GET /api/auto-enrich?action=stats
 * Get enrichment statistics
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const action = searchParams.get('action');

    if (action === 'stats') {
      // Get enrichment statistics
      const total = await prisma.business.count();
      const enriched = await prisma.business.count({
        where: {
          hunterEnrichedAt: {
            not: null,
          },
        },
      });
      const verified = await prisma.business.count({
        where: {
          hunterVerifiedAt: {
            not: null,
          },
        },
      });
      const withEmail = await prisma.business.count({
        where: {
          email: {
            not: null,
          },
        },
      });

      // Score distribution
      const highPriority = await prisma.business.count({
        where: { leadPriority: 'high' },
      });
      const mediumPriority = await prisma.business.count({
        where: { leadPriority: 'medium' },
      });
      const lowPriority = await prisma.business.count({
        where: { leadPriority: 'low' },
      });

      // Average scores by priority
      const avgScores = await prisma.business.groupBy({
        by: ['leadPriority'],
        _avg: {
          relevanceScore: true,
        },
      });

      return NextResponse.json({
        success: true,
        stats: {
          total,
          enriched,
          verified,
          withEmail,
          enrichmentRate: total > 0 ? Math.round((enriched / total) * 100) : 0,
          verificationRate: withEmail > 0 ? Math.round((verified / withEmail) * 100) : 0,
          priorityDistribution: {
            high: highPriority,
            medium: mediumPriority,
            low: lowPriority,
          },
          averageScores: avgScores.reduce(
            (acc, curr) => {
              acc[curr.leadPriority] = curr._avg.relevanceScore || 0;
              return acc;
            },
            {} as Record<string, number>
          ),
        },
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    console.error('Auto-enrich API error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
