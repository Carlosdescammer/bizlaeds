import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// GET - List businesses with filters
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const where: any = {};

    if (status) {
      where.reviewStatus = status;
    }

    if (search) {
      where.OR = [
        { businessName: { contains: search, mode: 'insensitive' } },
        { address: { contains: search, mode: 'insensitive' } },
        { businessType: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [businesses, total] = await Promise.all([
      prisma.business.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: { createdAt: 'desc' },
        include: {
          photos: {
            take: 1,
            orderBy: { createdAt: 'desc' },
          },
          emailCampaigns: {
            take: 1,
            orderBy: { createdAt: 'desc' },
          },
        },
      }),
      prisma.business.count({ where }),
    ]);

    // Convert BigInt to string for JSON serialization
    const serializedBusinesses = businesses.map(business => ({
      ...business,
      telegramMessageId: business.telegramMessageId?.toString(),
      telegramUserId: business.telegramUserId?.toString(),
      photos: business.photos.map(photo => ({
        ...photo,
        telegramMessageId: photo.telegramMessageId.toString(),
      })),
    }));

    return NextResponse.json({
      businesses: serializedBusinesses,
      total,
      limit,
      offset,
    });
  } catch (error: any) {
    console.error('List businesses error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch businesses', message: error.message },
      { status: 500 }
    );
  }
}

// POST - Create business manually (optional, mainly for testing)
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();

    const business = await prisma.business.create({
      data: {
        businessName: data.businessName,
        businessType: data.businessType,
        address: data.address,
        city: data.city,
        state: data.state,
        zipCode: data.zipCode,
        phone: data.phone,
        email: data.email,
        website: data.website,
        reviewStatus: 'pending_review',
      },
    });

    await prisma.activityLog.create({
      data: {
        businessId: business.id,
        action: 'business_created_manually',
        details: data,
      },
    });

    return NextResponse.json({ success: true, business });
  } catch (error: any) {
    console.error('Create business error:', error);
    return NextResponse.json(
      { error: 'Failed to create business', message: error.message },
      { status: 500 }
    );
  }
}
