import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import OpenAI from 'openai';
import axios from 'axios';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Helper function to log API usage
async function logApiUsage(serviceName: string, businessId: string | null, cost: number, success: boolean, error?: string) {
  await prisma.apiUsageLog.create({
    data: {
      service: serviceName,
      businessId,
      requestType: serviceName === 'openai' ? 'vision_analysis' : serviceName === 'google_maps' ? 'geocode' : 'email_search',
      success,
      estimatedCost: cost,
      errorMessage: error,
    },
  });

  // Update monthly usage
  const month = new Date().toISOString().slice(0, 7);
  await prisma.apiUsage.upsert({
    where: {
      month_service: {
        month,
        service: serviceName,
      },
    },
    update: {
      requestsCount: { increment: 1 },
      estimatedCost: { increment: cost },
    },
    create: {
      month,
      service: serviceName,
      requestsCount: 1,
      estimatedCost: cost,
    },
  });
}

// Process a single photo
async function processPhoto(photoId: string) {
  const photo = await prisma.photo.findUnique({
    where: { id: photoId },
  });

  if (!photo || photo.processed) {
    return { success: false, error: 'Photo not found or already processed' };
  }

  try {
    // Get the image URL - handle data URLs, http URLs, and relative paths
    let imageUrl = photo.fileUrl;
    if (!imageUrl) {
      throw new Error('No image URL found');
    }

    // If it's a relative path (starts with /), prepend the app URL
    if (imageUrl.startsWith('/') && !imageUrl.startsWith('//')) {
      imageUrl = `${process.env.NEXT_PUBLIC_APP_URL}${imageUrl}`;
    }
    // data: URLs and http/https URLs are used as-is

    // Call OpenAI Vision API
    const response = await openai.chat.completions.create({
      model: 'gpt-4o', // Updated model (gpt-4-vision-preview is deprecated)
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Analyze this photo and extract business information. Return a JSON object with:
- business_name: The business name (required)
- business_type: Type of business (e.g., restaurant, retail store, salon)
- address: Full street address if visible
- city: City name
- state: State/province
- zip_code: Postal code
- phone: Phone number if visible
- email: Email address if visible
- website: Website URL if visible
- confidence_score: How confident you are (0.0-1.0)
- notes: Any additional observations

Only include fields you can actually see in the image. Return valid JSON only.`,
            },
            {
              type: 'image_url',
              image_url: {
                url: imageUrl,
              },
            },
          ],
        },
      ],
      max_tokens: 1000,
    });

    let aiResponse = response.choices[0]?.message?.content || '{}';

    // Remove markdown code blocks if present (GPT-4o sometimes wraps JSON in ```json ```)
    aiResponse = aiResponse.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();

    const extractedData = JSON.parse(aiResponse);

    // Log OpenAI usage
    await logApiUsage('openai', null, 0.02, true);

    // Validate confidence score
    if (!extractedData.business_name || (extractedData.confidence_score && extractedData.confidence_score < 0.7)) {
      await prisma.photo.update({
        where: { id: photoId },
        data: {
          processed: true,
          processingError: 'Low confidence or missing business name',
        },
      });
      return { success: false, error: 'Low confidence extraction' };
    }

    // Enrich with Google Maps
    let googleData = {};
    if (extractedData.business_name && extractedData.address) {
      try {
        const mapsResponse = await axios.get('https://maps.googleapis.com/maps/api/place/findplacefromtext/json', {
          params: {
            input: `${extractedData.business_name} ${extractedData.address}`,
            inputtype: 'textquery',
            fields: 'place_id,formatted_address,name,geometry',
            key: process.env.GOOGLE_MAPS_API_KEY,
          },
        });

        await logApiUsage('google_maps', null, 0.005, true);

        if (mapsResponse.data.candidates && mapsResponse.data.candidates[0]) {
          const place = mapsResponse.data.candidates[0];
          googleData = {
            googlePlaceId: place.place_id,
            latitude: place.geometry?.location?.lat,
            longitude: place.geometry?.location?.lng,
          };
        }
      } catch (error: any) {
        console.error('Google Maps error:', error);
        await logApiUsage('google_maps', null, 0.005, false, error.message);
      }
    }

    // Find email with Hunter.io
    let hunterEmail = null;
    if (extractedData.website || extractedData.business_name) {
      try {
        const domain = extractedData.website
          ? new URL(extractedData.website).hostname
          : `${extractedData.business_name.toLowerCase().replace(/\s+/g, '')}.com`;

        const hunterResponse = await axios.get('https://api.hunter.io/v2/domain-search', {
          params: {
            domain,
            limit: 1,
            api_key: process.env.HUNTER_API_KEY,
          },
        });

        await logApiUsage('hunter_io', null, 0.001, true);

        if (hunterResponse.data.data?.emails && hunterResponse.data.data.emails.length > 0) {
          hunterEmail = hunterResponse.data.data.emails[0].value;
        }
      } catch (error: any) {
        console.error('Hunter.io error:', error);
        await logApiUsage('hunter_io', null, 0.001, false, error.message);
      }
    }

    // Create business record
    const business = await prisma.business.create({
      data: {
        businessName: extractedData.business_name,
        businessType: extractedData.business_type,
        address: extractedData.address,
        city: extractedData.city,
        state: extractedData.state,
        zipCode: extractedData.zip_code,
        phone: extractedData.phone,
        email: hunterEmail || extractedData.email,
        website: extractedData.website,
        photoUrl: photo.fileUrl,
        reviewStatus: 'pending_review',
        aiExtractionRaw: extractedData,
        confidenceScore: extractedData.confidence_score || 0,
        ...googleData,
      },
    });

    // Link photo to business
    await prisma.photo.update({
      where: { id: photoId },
      data: {
        businessId: business.id,
        processed: true,
      },
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        businessId: business.id,
        action: 'business_extracted',
        details: {
          photoId,
          confidence: extractedData.confidence_score,
        },
      },
    });

    return {
      success: true,
      business: {
        id: business.id,
        name: business.businessName,
        type: business.businessType,
        confidence: business.confidenceScore,
      },
    };
  } catch (error: any) {
    console.error('Processing error:', error);

    await prisma.photo.update({
      where: { id: photoId },
      data: {
        processed: true,
        processingError: error.message,
      },
    });

    return { success: false, error: error.message };
  }
}

// API endpoint to process photos
export async function POST(request: NextRequest) {
  try {
    const { photoId } = await request.json();

    if (photoId) {
      // Process specific photo
      const result = await processPhoto(photoId);
      return NextResponse.json(result);
    }

    // Process all unprocessed photos (queue worker)
    const unprocessedPhotos = await prisma.photo.findMany({
      where: {
        processed: false,
        processingError: null,
      },
      take: 5, // Process 5 at a time
    });

    const results = await Promise.all(
      unprocessedPhotos.map((photo) => processPhoto(photo.id))
    );

    return NextResponse.json({
      success: true,
      processed: results.length,
      results,
    });
  } catch (error: any) {
    console.error('Process API error:', error);
    return NextResponse.json(
      { error: 'Processing failed', message: error.message },
      { status: 500 }
    );
  }
}

// GET endpoint to check processing status
export async function GET(request: NextRequest) {
  try {
    const pending = await prisma.photo.count({
      where: {
        processed: false,
        processingError: null,
      },
    });

    const processing = await prisma.photo.count({
      where: {
        processed: true,
        businessId: { not: null },
      },
    });

    return NextResponse.json({
      pending,
      processed: processing,
      status: pending > 0 ? 'processing' : 'idle',
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
