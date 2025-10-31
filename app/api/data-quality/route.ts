import { NextRequest, NextResponse } from 'next/server';
import { batchProcessBusinesses } from '@/lib/business-processor';
import { findAndMarkDuplicates } from '@/lib/deduplication';
import { batchEnrichBusinesses } from '@/lib/enrichment-apis';
import { processPendingAlerts, sendDailySummary } from '@/lib/telegram-alerts';

/**
 * POST /api/data-quality
 * Run data quality operations
 */
export async function POST(request: NextRequest) {
  try {
    const { action, batchSize } = await request.json();

    switch (action) {
      case 'process_businesses': {
        const result = await batchProcessBusinesses(batchSize || 50);
        return NextResponse.json({
          success: true,
          action: 'process_businesses',
          ...result,
        });
      }

      case 'find_duplicates': {
        const result = await findAndMarkDuplicates();
        return NextResponse.json({
          success: true,
          action: 'find_duplicates',
          ...result,
        });
      }

      case 'batch_enrich': {
        const result = await batchEnrichBusinesses(batchSize || 10);
        return NextResponse.json({
          success: true,
          action: 'batch_enrich',
          ...result,
        });
      }

      case 'send_alerts': {
        const sentCount = await processPendingAlerts();
        return NextResponse.json({
          success: true,
          action: 'send_alerts',
          sentCount,
        });
      }

      case 'daily_summary': {
        const sent = await sendDailySummary();
        return NextResponse.json({
          success: sent,
          action: 'daily_summary',
        });
      }

      default:
        return NextResponse.json(
          { error: 'Invalid action. Valid actions: process_businesses, find_duplicates, batch_enrich, send_alerts, daily_summary' },
          { status: 400 }
        );
    }
  } catch (error: any) {
    console.error('Data quality operation error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * GET /api/data-quality
 * Get data quality statistics
 */
export async function GET() {
  try {
    const { prisma } = await import('@/lib/db');

    const [
      totalBusinesses,
      validEmails,
      invalidEmails,
      duplicates,
      highPriority,
      needsEnrichment,
      contactReady,
    ] = await Promise.all([
      prisma.business.count(),
      prisma.business.count({ where: { emailValid: true } }),
      prisma.business.count({ where: { emailValid: false } }),
      prisma.business.count({ where: { isDuplicate: true } }),
      prisma.business.count({ where: { leadPriority: 'high', isDuplicate: false } }),
      prisma.business.count({ where: { enrichedAt: null, website: { not: null } } }),
      prisma.business.count({
        where: {
          emailValid: true,
          phone: { not: null },
          domainValid: true,
          isDuplicate: false,
        },
      }),
    ]);

    return NextResponse.json({
      totalBusinesses,
      dataQuality: {
        validEmails,
        invalidEmails,
        emailValidationRate: totalBusinesses > 0 ? (validEmails / totalBusinesses) * 100 : 0,
      },
      duplicates: {
        count: duplicates,
        percentage: totalBusinesses > 0 ? (duplicates / totalBusinesses) * 100 : 0,
      },
      leads: {
        highPriority,
        contactReady,
        needsEnrichment,
      },
    });
  } catch (error: any) {
    console.error('Failed to get data quality stats:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
