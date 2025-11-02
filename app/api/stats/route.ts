import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    // Get total business count
    const totalBusinesses = await prisma.business.count();

    // Get count by status
    const [approved, pending, archived] = await Promise.all([
      prisma.business.count({ where: { approvedAt: { not: null } } }),
      prisma.business.count({ where: { approvedAt: null, archivedAt: null } }),
      prisma.business.count({ where: { archivedAt: { not: null } } }),
    ]);

    // Get recent activity (last 24 hours)
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentlyAdded = await prisma.business.count({
      where: {
        createdAt: { gte: twentyFourHoursAgo }
      }
    });

    // Get enrichment stats
    const [enrichedByGoogle, enrichedByHunter, verified] = await Promise.all([
      prisma.business.count({ where: { googleEnrichedAt: { not: null } } }),
      prisma.business.count({ where: { hunterEnrichedAt: { not: null } } }),
      prisma.business.count({ where: { hunterVerificationStatus: 'valid' } }),
    ]);

    return NextResponse.json({
      total: totalBusinesses,
      approved,
      pending,
      archived,
      recentlyAdded,
      enrichment: {
        google: enrichedByGoogle,
        hunter: enrichedByHunter,
        verified,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stats' },
      { status: 500 }
    );
  }
}
