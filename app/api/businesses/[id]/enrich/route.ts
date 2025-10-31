import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import axios from 'axios';

// Helper function to log API usage
async function logApiUsage(
  service: string,
  businessId: string | null,
  estimatedCost: number,
  success: boolean,
  errorMessage?: string
) {
  try {
    await prisma.apiUsageLog.create({
      data: {
        service,
        businessId,
        estimatedCost,
        success,
        errorMessage,
      },
    });
  } catch (error) {
    console.error('Failed to log API usage:', error);
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: businessId } = await params;
    const body = await request.json();
    const { action } = body; // 'google' or 'hunter'

    const business = await prisma.business.findUnique({
      where: { id: businessId },
    });

    if (!business) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 });
    }

    if (action === 'google') {
      // Enrich with Google Places Details
      if (!business.businessName) {
        return NextResponse.json({ error: 'Business name is required' }, { status: 400 });
      }

      // Step 1: Find Place
      const searchQuery = business.address
        ? `${business.businessName} ${business.address}`
        : business.businessName;

      const findPlaceUrl = `https://maps.googleapis.com/maps/api/place/findplacefromtext/json`;
      const findPlaceResponse = await axios.get(findPlaceUrl, {
        params: {
          input: searchQuery,
          inputtype: 'textquery',
          fields: 'place_id',
          key: process.env.GOOGLE_MAPS_API_KEY,
        },
      });

      await logApiUsage('google_maps', businessId, 0.005, true);

      if (!findPlaceResponse.data.candidates?.[0]?.place_id) {
        return NextResponse.json({ error: 'Business not found on Google' }, { status: 404 });
      }

      const placeId = findPlaceResponse.data.candidates[0].place_id;

      // Step 2: Get Place Details
      const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json`;
      const detailsResponse = await axios.get(detailsUrl, {
        params: {
          place_id: placeId,
          fields:
            'name,formatted_address,formatted_phone_number,website,rating,user_ratings_total,price_level,opening_hours,photos',
          key: process.env.GOOGLE_MAPS_API_KEY,
        },
      });

      await logApiUsage('google_maps', businessId, 0.017, true);

      const placeDetails = detailsResponse.data.result;

      // Update business with Google data
      const updateData: any = {
        googleEnrichedAt: new Date(),
      };

      if (placeDetails.rating) updateData.googleRating = placeDetails.rating;
      if (placeDetails.user_ratings_total) updateData.googleReviewCount = placeDetails.user_ratings_total;
      if (placeDetails.price_level) updateData.googlePriceLevel = placeDetails.price_level;
      if (placeDetails.opening_hours) updateData.googleBusinessHours = placeDetails.opening_hours;
      if (placeDetails.formatted_address) updateData.formattedAddress = placeDetails.formatted_address;
      if (placeDetails.formatted_phone_number && !business.phone) updateData.phone = placeDetails.formatted_phone_number;
      if (placeDetails.website && !business.website) updateData.website = placeDetails.website;
      if (placeDetails.photos) updateData.googlePhotosData = placeDetails.photos;

      const updatedBusiness = await prisma.business.update({
        where: { id: businessId },
        data: updateData,
      });

      return NextResponse.json({
        success: true,
        business: {
          ...updatedBusiness,
          telegramMessageId: updatedBusiness.telegramMessageId?.toString(),
          telegramUserId: updatedBusiness.telegramUserId?.toString(),
        },
      });
    } else if (action === 'hunter') {
      // Find email with Hunter.io
      if (!business.website) {
        return NextResponse.json({ error: 'Website is required for email lookup' }, { status: 400 });
      }

      try {
        // Validate and parse URL
        let websiteUrl = business.website;
        if (!websiteUrl.startsWith('http://') && !websiteUrl.startsWith('https://')) {
          websiteUrl = 'https://' + websiteUrl;
        }

        const domain = new URL(websiteUrl).hostname;

        const hunterResponse = await axios.get('https://api.hunter.io/v2/domain-search', {
          params: {
            domain,
            limit: 5,
            api_key: process.env.HUNTER_API_KEY,
          },
        });

        await logApiUsage('hunter_io', businessId, 0.001, true);

        const emails = hunterResponse.data.data?.emails || [];

        if (emails.length > 0) {
          // Take the first email or the one with highest confidence
          const bestEmail = emails.sort((a: any, b: any) => (b.confidence || 0) - (a.confidence || 0))[0];

          const updatedBusiness = await prisma.business.update({
            where: { id: businessId },
            data: {
              email: bestEmail.value,
            },
          });

          return NextResponse.json({
            success: true,
            emails: emails.map((e: any) => ({
              email: e.value,
              confidence: e.confidence,
              type: e.type,
            })),
            business: {
              ...updatedBusiness,
              telegramMessageId: updatedBusiness.telegramMessageId?.toString(),
              telegramUserId: updatedBusiness.telegramUserId?.toString(),
            },
          });
        } else {
          return NextResponse.json({ error: 'No emails found' }, { status: 404 });
        }
      } catch (error: any) {
        await logApiUsage('hunter_io', businessId, 0.001, false, error.message);
        return NextResponse.json({ error: 'Hunter.io lookup failed: ' + error.message }, { status: 500 });
      }
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    console.error('Enrichment error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
