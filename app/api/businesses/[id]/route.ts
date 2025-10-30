import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// GET - Get single business
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const business = await prisma.business.findUnique({
      where: { id },
      include: {
        photos: true,
        emailCampaigns: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!business) {
      return NextResponse.json(
        { error: 'Business not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ business });
  } catch (error: any) {
    console.error('Get business error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch business', message: error.message },
      { status: 500 }
    );
  }
}

// PATCH - Update business
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const data = await request.json();

    const business = await prisma.business.update({
      where: { id },
      data: {
        ...(data.businessName && { businessName: data.businessName }),
        ...(data.businessType && { businessType: data.businessType }),
        ...(data.address && { address: data.address }),
        ...(data.city && { city: data.city }),
        ...(data.state && { state: data.state }),
        ...(data.zipCode && { zipCode: data.zipCode }),
        ...(data.phone && { phone: data.phone }),
        ...(data.email && { email: data.email }),
        ...(data.website && { website: data.website }),
        ...(data.reviewStatus && { reviewStatus: data.reviewStatus }),
        ...(data.reviewStatus === 'approved' && { approvedAt: new Date() }),
      },
    });

    await prisma.activityLog.create({
      data: {
        businessId: business.id,
        action: 'business_updated',
        details: data,
      },
    });

    return NextResponse.json({ success: true, business });
  } catch (error: any) {
    console.error('Update business error:', error);
    return NextResponse.json(
      { error: 'Failed to update business', message: error.message },
      { status: 500 }
    );
  }
}

// DELETE - Delete business
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.business.delete({
      where: { id },
    });

    await prisma.activityLog.create({
      data: {
        businessId: id,
        action: 'business_deleted',
        details: {},
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Delete business error:', error);
    return NextResponse.json(
      { error: 'Failed to delete business', message: error.message },
      { status: 500 }
    );
  }
}
