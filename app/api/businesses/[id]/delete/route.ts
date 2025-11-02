import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Check if business exists
    const business = await prisma.business.findUnique({
      where: { id },
    });

    if (!business) {
      return NextResponse.json(
        { error: 'Business not found' },
        { status: 404 }
      );
    }

    // Delete related records first (photos, email campaigns)
    await prisma.$transaction(async (tx) => {
      // Delete photos
      await tx.photo.deleteMany({
        where: { businessId: id },
      });

      // Delete email campaigns
      await tx.emailCampaign.deleteMany({
        where: { businessId: id },
      });

      // Delete the business
      await tx.business.delete({
        where: { id },
      });
    });

    return NextResponse.json({
      success: true,
      message: 'Business deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting business:', error);
    return NextResponse.json(
      { error: 'Failed to delete business' },
      { status: 500 }
    );
  }
}
