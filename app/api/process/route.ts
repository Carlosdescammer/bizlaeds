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
              text: `CAREFULLY scan and read ALL text visible in this image. Your job is to:

1. FIRST, list out ALL words and text you can see in the image
2. THEN, identify ALL business names (not just one) by looking for:
   - Company names
   - Store names
   - Signs with business branding
   - Directory listings
   - Suite/unit occupants
   - Text on storefronts, signs, vehicles, business cards, building directories, etc.

3. Extract information for EVERY business you find

Return a JSON object with:
{
  "all_text_found": ["list", "of", "all", "text", "you", "can", "see"],
  "is_multi_tenant": true/false,
  "building_name": "Building or complex name if this is a directory/multi-tenant building",
  "shared_address": "Shared address for all businesses if visible",
  "shared_city": "Shared city",
  "shared_state": "Shared state",
  "shared_zip_code": "Shared zip code",
  "shared_phone": "Shared/leasing phone if visible",
  "businesses": [
    {
      "business_name": "Business name (REQUIRED)",
      "business_type": "Type of business",
      "suite_number": "Suite/unit number if visible",
      "phone": "Business-specific phone if visible",
      "email": "Email if visible",
      "website": "Website if visible",
      "confidence_score": 0.0-1.0
    }
  ],
  "notes": "Explanation of what you found - single business or multi-tenant directory"
}

IMPORTANT:
- Scan EVERY word, even small text
- If this is a building directory, extract ALL listed businesses
- If it's a single business, return just one business in the array
- Include suite/unit numbers for multi-tenant buildings
- Don't skip any visible business names
- Return valid JSON only.`,
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
      max_tokens: 1500,
    });

    let aiResponse = response.choices[0]?.message?.content || '{}';

    // Remove markdown code blocks if present (GPT-4o sometimes wraps JSON in ```json ```)
    aiResponse = aiResponse.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();

    const extractedData = JSON.parse(aiResponse);

    // Log OpenAI usage
    await logApiUsage('openai', null, 0.02, true);

    // Validate we have businesses array
    if (!extractedData.businesses || !Array.isArray(extractedData.businesses) || extractedData.businesses.length === 0) {
      await prisma.photo.update({
        where: { id: photoId },
        data: {
          processed: true,
          processingError: 'No businesses found in image',
        },
      });
      return { success: false, error: 'No businesses found' };
    }

    // Shared data from multi-tenant building
    const sharedAddress = extractedData.shared_address;
    const sharedCity = extractedData.shared_city;
    const sharedState = extractedData.shared_state;
    const sharedZipCode = extractedData.shared_zip_code;

    // Process each business found
    const createdBusinesses = [];

    for (const businessData of extractedData.businesses) {
      // Skip if confidence too low or no business name
      if (!businessData.business_name || (businessData.confidence_score && businessData.confidence_score < 0.5)) {
        continue;
      }

      // Build full address for this business
      const fullAddress = sharedAddress || businessData.address;
      const businessCity = sharedCity || businessData.city;
      const businessState = sharedState || businessData.state;
      const businessZipCode = sharedZipCode || businessData.zip_code;

      // Enrich with Google Maps Place Search + Details
      let googleData: any = {};
      if (businessData.business_name && fullAddress) {
        try {
          const searchQuery = businessData.suite_number
            ? `${businessData.business_name} Suite ${businessData.suite_number} ${fullAddress}`
            : `${businessData.business_name} ${fullAddress}`;

          // Step 1: Find Place (Text Search)
          const findPlaceResponse = await axios.get('https://maps.googleapis.com/maps/api/place/findplacefromtext/json', {
            params: {
              input: searchQuery,
              inputtype: 'textquery',
              fields: 'place_id,formatted_address,name,geometry',
              key: process.env.GOOGLE_MAPS_API_KEY,
            },
          });

          await logApiUsage('google_maps', null, 0.005, true);

          if (findPlaceResponse.data.candidates && findPlaceResponse.data.candidates[0]) {
            const place = findPlaceResponse.data.candidates[0];
            const placeId = place.place_id;

            googleData = {
              googlePlaceId: placeId,
              latitude: place.geometry?.location?.lat,
              longitude: place.geometry?.location?.lng,
              formattedAddress: place.formatted_address,
            };

            // Step 2: Get Place Details (rich information)
            try {
              const detailsResponse = await axios.get('https://maps.googleapis.com/maps/api/place/details/json', {
                params: {
                  place_id: placeId,
                  fields: 'name,formatted_address,formatted_phone_number,website,rating,user_ratings_total,price_level,opening_hours,photos,reviews,types',
                  key: process.env.GOOGLE_MAPS_API_KEY,
                },
              });

              await logApiUsage('google_maps', null, 0.017, true); // Place Details costs more

              const details = detailsResponse.data.result;
              if (details) {
                googleData.googleRating = details.rating || null;
                googleData.googleReviewCount = details.user_ratings_total || null;
                googleData.googlePriceLevel = details.price_level || null;
                googleData.googleBusinessHours = details.opening_hours || null;
                googleData.googleEnrichedAt = new Date();

                // Store photo references (up to 5)
                if (details.photos && details.photos.length > 0) {
                  googleData.googlePhotosData = details.photos.slice(0, 5).map((photo: any) => ({
                    photoReference: photo.photo_reference,
                    width: photo.width,
                    height: photo.height,
                    attributions: photo.html_attributions,
                  }));
                }

                // Update contact info if missing
                if (!businessData.phone && details.formatted_phone_number) {
                  businessData.phone = details.formatted_phone_number;
                }
                if (!businessData.website && details.website) {
                  businessData.website = details.website;
                }
              }
            } catch (detailsError: any) {
              console.error('Google Places Details error:', detailsError);
              await logApiUsage('google_maps', null, 0.017, false, detailsError.message);
            }
          }
        } catch (error: any) {
          console.error('Google Maps error:', error);
          await logApiUsage('google_maps', null, 0.005, false, error.message);
        }
      }

      // Find email with Hunter.io (use website from AI or Google Places)
      let hunterEmail = null;
      const websiteToCheck = businessData.website; // Already updated by Google Places if found

      if (websiteToCheck) {
        try {
          // Validate and parse URL
          let websiteUrl = websiteToCheck;
          if (!websiteUrl.startsWith('http://') && !websiteUrl.startsWith('https://')) {
            websiteUrl = 'https://' + websiteUrl;
          }

          const domain = new URL(websiteUrl).hostname;

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
          // Continue processing even if Hunter.io fails
        }
      }

      // Build business data
      const businessAddress = businessData.suite_number
        ? `${fullAddress} Suite ${businessData.suite_number}`
        : fullAddress;

      const businessDataToSave = {
        businessName: businessData.business_name,
        businessType: businessData.business_type || (extractedData.is_multi_tenant ? 'Office/Suite' : null),
        address: businessAddress,
        city: businessCity,
        state: businessState,
        zipCode: businessZipCode,
        phone: businessData.phone || extractedData.shared_phone,
        email: hunterEmail || businessData.email,
        website: businessData.website,
        photoUrl: photo.fileUrl,
        reviewStatus: 'pending_review',
        aiExtractionRaw: {
          ...extractedData,
          extracted_business: businessData,
        },
        confidenceScore: businessData.confidence_score || 0,
        ...googleData,
      };

      // Use upsert to handle duplicates (update if exists, create if new)
      const business = await prisma.business.upsert({
        where: {
          businessName_address: {
            businessName: businessData.business_name,
            address: businessAddress,
          },
        },
        update: {
          // Update with new data if business already exists
          businessType: businessDataToSave.businessType,
          city: businessDataToSave.city,
          state: businessDataToSave.state,
          zipCode: businessDataToSave.zipCode,
          phone: businessDataToSave.phone || undefined,
          email: businessDataToSave.email || undefined,
          website: businessDataToSave.website || undefined,
          photoUrl: businessDataToSave.photoUrl,
          aiExtractionRaw: businessDataToSave.aiExtractionRaw,
          confidenceScore: businessDataToSave.confidenceScore,
          ...googleData,
        },
        create: businessDataToSave,
      });

      // Log activity
      await prisma.activityLog.create({
        data: {
          businessId: business.id,
          action: 'business_extracted',
          details: {
            photoId,
            confidence: businessData.confidence_score,
            isMultiTenant: extractedData.is_multi_tenant,
            suiteNumber: businessData.suite_number,
          },
        },
      });

      createdBusinesses.push({
        id: business.id,
        name: business.businessName,
        type: business.businessType,
        confidence: business.confidenceScore,
        suite: businessData.suite_number,
      });
    }

    // Link photo to first business (or mark as processed if none created)
    await prisma.photo.update({
      where: { id: photoId },
      data: {
        businessId: createdBusinesses.length > 0 ? createdBusinesses[0].id : null,
        processed: true,
      },
    });

    return {
      success: true,
      businesses: createdBusinesses,
      count: createdBusinesses.length,
      isMultiTenant: extractedData.is_multi_tenant,
      buildingName: extractedData.building_name,
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
