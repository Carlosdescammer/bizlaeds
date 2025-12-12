import { NextRequest, NextResponse } from 'next/server';
import { enrichBusiness, batchEnrichBusinesses } from '@/lib/enrichment-pipeline';

// POST /api/enrich - Enrich a single business or batch
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { businessId, businessIds, mode = 'single' } = body;

    if (mode === 'batch' && businessIds && Array.isArray(businessIds)) {
      // Batch enrichment
      const results = await batchEnrichBusinesses(businessIds);

      const successful = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;
      const totalCost = results.reduce((sum, r) => sum + ((r as any).totalCost || 0), 0);

      return NextResponse.json({
        success: true,
        mode: 'batch',
        total: businessIds.length,
        successful,
        failed,
        totalCost,
        results,
      });
    } else if (businessId) {
      // Single enrichment
      const result = await enrichBusiness(businessId);

      return NextResponse.json({
        ...result,
        mode: 'single',
      });
    } else {
      return NextResponse.json(
        { error: 'businessId or businessIds required' },
        { status: 400 }
      );
    }
  } catch (error: any) {
    console.error('Enrichment error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Enrichment failed',
      },
      { status: 500 }
    );
  }
}

// GET /api/enrich/preview - Preview what enrichment would do (free!)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const domain = searchParams.get('domain');
    const businessName = searchParams.get('businessName');

    if (!domain && !businessName) {
      return NextResponse.json(
        { error: 'domain or businessName required' },
        { status: 400 }
      );
    }

    // Return preview of what we'd enrich
    const preview = {
      dataPoints: [
        {
          source: 'Clearbit Logo API',
          description: 'Company logo',
          cost: 'FREE',
          example: domain ? `https://logo.clearbit.com/${domain}` : null,
        },
        {
          source: 'Hunter.io',
          description: 'Email patterns, email count, company emails',
          cost: '1 credit (~50 free/month)',
          available: !!process.env.HUNTER_API_KEY,
        },
        {
          source: 'Social Profile Detection',
          description: 'LinkedIn, Twitter, Facebook URLs',
          cost: 'FREE',
          available: true,
        },
        {
          source: 'Lead Scoring',
          description: '0-100 score based on data quality',
          cost: 'FREE',
          available: true,
        },
        {
          source: 'Company Size Estimation',
          description: 'Estimate based on email count & reviews',
          cost: 'FREE',
          available: true,
        },
      ],
      estimatedCost: process.env.HUNTER_API_KEY ? '1 Hunter.io credit' : '0 (FREE)',
      enrichmentFields: [
        'email',
        'emailPattern',
        'emailCount',
        'logoUrl',
        'linkedinUrl',
        'twitterHandle',
        'facebookUrl',
        'companySize',
        'leadScore',
        'leadPriority',
      ],
    };

    return NextResponse.json(preview);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
