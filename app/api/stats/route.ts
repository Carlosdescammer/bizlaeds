import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    // Get total business count
    const totalBusinesses = await prisma.businesses.count();

    // Get count by status
    const [approved, pending, archived] = await Promise.all([
      prisma.businesses.count({ where: { approvedAt: { not: null } } }),
      prisma.businesses.count({ where: { approvedAt: null, archivedAt: null } }),
      prisma.businesses.count({ where: { archivedAt: { not: null } } }),
    ]);

    // Get recent activity (last 24 hours)
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentlyAdded = await prisma.businesses.count({
      where: {
        createdAt: { gte: twentyFourHoursAgo }
      }
    });

    // Get enrichment stats
    const [enrichedByGoogle, enrichedByHunter, verified] = await Promise.all([
      prisma.businesses.count({ where: { googleEnrichedAt: { not: null } } }),
      prisma.businesses.count({ where: { hunterEnrichedAt: { not: null } } }),
      prisma.businesses.count({ where: { hunterVerificationStatus: 'valid' } }),
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
