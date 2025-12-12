import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    // Get total business count
    const totalBusinesses = await prisma.business.count();

    // Get count by lead status (using leadStatus field instead of approvedAt/archivedAt)
    const [approved, pending, archived] = await Promise.all([
      prisma.business.count({ where: { leadStatus: { in: ['contacted', 'qualified', 'won'] } } }),
      prisma.business.count({ where: { leadStatus: 'new' } }),
      prisma.business.count({ where: { leadStatus: 'lost' } }),
    ]);

    // Get recent activity (last 24 hours)
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentlyAdded = await prisma.business.count({
      where: {
        createdAt: { gte: twentyFourHoursAgo }
      }
    });

    // Get enrichment stats (using simplified fields)
    const [enrichedByGoogle, enrichedByHunter, verified] = await Promise.all([
      prisma.business.count({ where: { googlePlaceId: { not: null } } }),
      prisma.business.count({ where: { hunterEnrichedAt: { not: null } } }),
      prisma.business.count({ where: { emailValid: true } }),
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
