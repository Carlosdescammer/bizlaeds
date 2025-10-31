import { NextRequest, NextResponse } from 'next/server';
import { processBusinessCard, batchProcessBusinessCards } from '@/lib/ocr-processor';

/**
 * POST /api/business-card
 * Upload and process business card image(s)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { image, images, userId } = body;

    // Single image processing
    if (image) {
      if (!image.startsWith('data:image/')) {
        return NextResponse.json(
          { error: 'Invalid image format. Must be base64 data URL' },
          { status: 400 }
        );
      }

      // Remove data URL prefix to get pure base64
      const base64Data = image.split(',')[1];

      const result = await processBusinessCard(base64Data, userId);

      if (result.success) {
        return NextResponse.json({
          success: true,
          businessId: result.businessId,
          extractedData: result.extractedData,
          message: 'Business card processed successfully',
        });
      } else {
        return NextResponse.json(
          { error: result.error || 'Failed to process business card' },
          { status: 400 }
        );
      }
    }

    // Batch image processing
    if (images && Array.isArray(images)) {
      if (images.length === 0) {
        return NextResponse.json(
          { error: 'No images provided' },
          { status: 400 }
        );
      }

      // Validate all images
      for (const img of images) {
        if (!img.data || !img.data.startsWith('data:image/')) {
          return NextResponse.json(
            { error: 'All images must be base64 data URLs' },
            { status: 400 }
          );
        }
      }

      // Convert to format expected by batch processor
      const processableImages = images.map((img: any) => ({
        id: img.id || `image_${Date.now()}_${Math.random()}`,
        base64: img.data.split(',')[1],
      }));

      const result = await batchProcessBusinessCards(processableImages, userId);

      return NextResponse.json({
        success: true,
        processed: result.processed,
        successful: result.successful,
        failed: result.failed,
        results: result.results,
        message: `Processed ${result.processed} business cards. ${result.successful} successful, ${result.failed} failed.`,
      });
    }

    return NextResponse.json(
      { error: 'Either "image" or "images" array must be provided' },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('Business card API error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/business-card
 * Get OCR processing statistics
 */
export async function GET() {
  try {
    const { prisma } = await import('@/lib/db');

    const [totalOCRProcessed, successfulOCR, failedOCR, totalCost] = await Promise.all([
      prisma.apiUsageLog.count({
        where: { service: 'google_vision_ocr' },
      }),
      prisma.apiUsageLog.count({
        where: { service: 'google_vision_ocr', success: true },
      }),
      prisma.apiUsageLog.count({
        where: { service: 'google_vision_ocr', success: false },
      }),
      prisma.apiUsageLog.aggregate({
        where: { service: 'google_vision_ocr' },
        _sum: { estimatedCost: true },
      }),
    ]);

    return NextResponse.json({
      totalOCRProcessed,
      successfulOCR,
      failedOCR,
      successRate: totalOCRProcessed > 0 ? (successfulOCR / totalOCRProcessed) * 100 : 0,
      totalCost: totalCost._sum.estimatedCost || 0,
    });
  } catch (error: any) {
    console.error('Failed to get OCR stats:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
