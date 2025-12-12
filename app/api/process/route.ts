import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import OpenAI from 'openai';
import axios from 'axios';
import { enrichBusiness } from '@/lib/enrichment-pipeline';

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
  const processStartTime = Date.now();
  console.log(`\n[PROCESS] ========== Starting processing for photo ${photoId} ==========`);

  const photo = await prisma.photo.findUnique({
    where: { id: photoId },
  });

  if (!photo) {
    console.error(`[PROCESS] ❌ Photo not found: ${photoId}`);
    return { success: false, error: 'Photo not found' };
  }

  if (photo.processed) {
    console.log(`[PROCESS] ⏭️  Photo already processed: ${photoId}`);
    return { success: false, error: 'Photo already processed' };
  }

  try {
    // Get the image URL - handle data URLs, http URLs, and relative paths
    let imageUrl = photo.fileUrl;
    if (!imageUrl) {
      throw new Error('No image URL found in photo record');
    }

    console.log(`[PROCESS] Image URL type: ${imageUrl.startsWith('data:') ? 'data URL' : imageUrl.startsWith('http') ? 'HTTP URL' : 'relative path'}`);

    // If it's a relative path (starts with /), prepend the app URL
    if (imageUrl.startsWith('/') && !imageUrl.startsWith('//')) {
      imageUrl = `${process.env.NEXT_PUBLIC_APP_URL}${imageUrl}`;
      console.log(`[PROCESS] Converted to absolute URL: ${imageUrl.substring(0, 50)}...`);
    }

    // Call OpenAI Vision API
    console.log('[PROCESS] 🔍 Calling OpenAI Vision API...');
    const visionStartTime = Date.now();
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

    const visionDuration = Date.now() - visionStartTime;
    console.log(`[PROCESS] ✅ OpenAI Vision API responded in ${visionDuration}ms`);

    let aiResponse = response.choices[0]?.message?.content || '{}';

    // Check if we got a valid response
    if (!aiResponse || aiResponse === '{}') {
      console.error('[PROCESS] ❌ Empty response from OpenAI Vision API');
      throw new Error('OpenAI Vision API returned empty response - image may be unreadable');
    }

    console.log(`[PROCESS] Raw AI response length: ${aiResponse.length} chars`);

    // Remove markdown code blocks if present (GPT-4o sometimes wraps JSON in ```json ```)
    aiResponse = aiResponse.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();

    let extractedData;
    try {
      extractedData = JSON.parse(aiResponse);
      console.log('[PROCESS] ✅ Successfully parsed AI response as JSON');
    } catch (parseError: any) {
      console.error('[PROCESS] ❌ Failed to parse AI response as JSON');
      console.error('[PROCESS] AI response:', aiResponse.substring(0, 500));
      throw new Error(`Failed to parse AI response: ${parseError.message}`);
    }

    // Log what text was found
    if (extractedData.all_text_found && extractedData.all_text_found.length > 0) {
      console.log(`[PROCESS] 📝 Found ${extractedData.all_text_found.length} text elements:`, extractedData.all_text_found.slice(0, 10));
    } else {
      console.warn('[PROCESS] ⚠️  No text found in image - may be blurry or empty');
    }

    // Log OpenAI usage
    await logApiUsage('openai', null, 0.02, true);

    // Validate we have businesses array
    if (!extractedData.businesses || !Array.isArray(extractedData.businesses) || extractedData.businesses.length === 0) {
      const errorMessage = extractedData.all_text_found && extractedData.all_text_found.length > 0
        ? 'Text found but no business names identified - image may not contain business information'
        : 'No text found in image - photo may be too blurry, too dark, or not contain business information';

      console.error(`[PROCESS] ❌ ${errorMessage}`);
      console.error('[PROCESS] Notes from AI:', extractedData.notes || 'No notes provided');

      await prisma.photo.update({
        where: { id: photoId },
        data: {
          processed: true,
          processingError: errorMessage,
        },
      });
      return {
        success: false,
        error: errorMessage,
        debug: {
          textFound: extractedData.all_text_found || [],
          aiNotes: extractedData.notes || 'No notes',
          suggestion: 'Try taking a clearer photo with good lighting and visible text'
        }
      };
    }

    console.log(`[PROCESS] ✅ Found ${extractedData.businesses.length} business(es) in image`);

    // Shared data from multi-tenant building
    const sharedAddress = extractedData.shared_address;
    const sharedCity = extractedData.shared_city;
    const sharedState = extractedData.shared_state;
    const sharedZipCode = extractedData.shared_zip_code;

    // Process each business found
    const createdBusinesses = [];
    console.log(`[PROCESS] 🔄 Processing ${extractedData.businesses.length} business(es)...`);

    for (let i = 0; i < extractedData.businesses.length; i++) {
      const businessData = extractedData.businesses[i];
      console.log(`\n[PROCESS] --- Business ${i + 1}/${extractedData.businesses.length} ---`);
      console.log(`[PROCESS] Name: ${businessData.business_name}`);
      console.log(`[PROCESS] Confidence: ${businessData.confidence_score || 'N/A'}`);

      // Skip if confidence too low or no business name
      if (!businessData.business_name) {
        console.warn(`[PROCESS] ⏭️  Skipping business ${i + 1} - no name provided`);
        continue;
      }

      if (businessData.confidence_score && businessData.confidence_score < 0.5) {
        console.warn(`[PROCESS] ⏭️  Skipping business ${i + 1} - confidence too low (${businessData.confidence_score})`);
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
        console.log(`[PROCESS] 🗺️  Enriching with Google Maps...`);
        try {
          const searchQuery = businessData.suite_number
            ? `${businessData.business_name} Suite ${businessData.suite_number} ${fullAddress}`
            : `${businessData.business_name} ${fullAddress}`;

          console.log(`[PROCESS] Search query: "${searchQuery}"`);

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
            console.log(`[PROCESS] ✅ Found Google place: ${place.name}`);

            googleData = {
              googlePlaceId: placeId,
              latitude: place.geometry?.location?.lat,
              longitude: place.geometry?.location?.lng,
              formattedAddress: place.formatted_address,
            };

            // Step 2: Get Place Details (rich information)
            console.log(`[PROCESS] 📊 Fetching place details...`);
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
                console.log(`[PROCESS] ✅ Place details: rating=${details.rating}, reviews=${details.user_ratings_total}`);
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
              console.error('[PROCESS] ❌ Google Places Details error:', detailsError.message);
              await logApiUsage('google_maps', null, 0.017, false, detailsError.message);
            }
          } else {
            console.warn('[PROCESS] ⚠️  Google Maps found no results for this business');
          }
        } catch (error: any) {
          console.error('[PROCESS] ❌ Google Maps error:', error.message);
          await logApiUsage('google_maps', null, 0.005, false, error.message);
        }
      } else {
        console.log('[PROCESS] ⏭️  Skipping Google Maps (no business name or address)');
      }

      // Find email with Hunter.io (use website from AI or Google Places)
      let hunterEmail = null;
      const websiteToCheck = businessData.website; // Already updated by Google Places if found

      if (websiteToCheck) {
        console.log(`[PROCESS] 📧 Searching for email at: ${websiteToCheck}`);
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
            console.log(`[PROCESS] ✅ Hunter.io found email: ${hunterEmail}`);
          } else {
            console.log(`[PROCESS] ℹ️  Hunter.io found no emails for domain`);
          }
        } catch (error: any) {
          console.error('[PROCESS] ❌ Hunter.io error:', error.message);
          await logApiUsage('hunter_io', null, 0.001, false, error.message);
          // Continue processing even if Hunter.io fails
        }
      } else {
        console.log('[PROCESS] ⏭️  Skipping Hunter.io (no website)');
      }

      // Build business data
      const businessAddress = businessData.suite_number && fullAddress
        ? `${fullAddress} Suite ${businessData.suite_number}`
        : fullAddress || null;

      // Skip this business if we don't have an address (required for unique constraint)
      if (!businessAddress) {
        console.warn(`[PROCESS] ⏭️  Skipping "${businessData.business_name}" - no address found`);
        continue;
      }

      console.log(`[PROCESS] 💾 Saving to database...`);

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
        leadStatus: 'new',
        aiExtractionRaw: {
          ...extractedData,
          extracted_business: businessData,
        },
        confidenceScore: businessData.confidence_score || 0,
        ...googleData,
      };

      // Check if business already exists
      const existingBusiness = await prisma.business.findFirst({
        where: {
          businessName: businessData.business_name,
          address: businessAddress,
        },
      });

      const isNewBusiness = !existingBusiness;

      // Create or update business
      const business = existingBusiness
        ? await prisma.business.update({
            where: { id: existingBusiness.id },
            data: {
              // Update with new data if business already exists
              businessType: businessDataToSave.businessType,
              city: businessDataToSave.city,
              state: businessDataToSave.state,
              zipCode: businessDataToSave.zipCode,
              phone: businessDataToSave.phone || undefined,
              email: businessDataToSave.email || undefined,
              website: businessDataToSave.website || undefined,
              aiExtractionRaw: businessDataToSave.aiExtractionRaw,
              confidenceScore: businessDataToSave.confidenceScore,
              ...googleData,
            },
          })
        : await prisma.business.create({
            data: businessDataToSave,
          });

      console.log(`[PROCESS] ✅ Business saved: ${business.id} (${isNewBusiness ? 'NEW' : 'UPDATED'})`);

      // Auto-enrich new businesses (runs in background)
      if (isNewBusiness && business.id) {
        console.log(`[PROCESS] 🚀 Starting background enrichment for "${business.businessName}"...`);
        // Run enrichment asynchronously (don't await - let it run in background)
        enrichBusiness(business.id)
          .then((result) => {
            console.log(`[PROCESS] ✅ Auto-enrichment completed for ${business.businessName}:`, {
              leadScore: result.leadScore,
              cost: result.totalCost,
              enrichments: result.enrichments.filter(e => e.success).length,
            });
          })
          .catch((error) => {
            console.error(`[PROCESS] ❌ Auto-enrichment failed for ${business.businessName}:`, error);
            // Don't fail the whole process if enrichment fails
          });
      }

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

    const processDuration = Date.now() - processStartTime;
    console.log(`\n[PROCESS] ========== ✅ Processing complete! ==========`);
    console.log(`[PROCESS] Duration: ${processDuration}ms`);
    console.log(`[PROCESS] Businesses created/updated: ${createdBusinesses.length}`);
    console.log(`[PROCESS] Multi-tenant: ${extractedData.is_multi_tenant ? 'Yes' : 'No'}`);
    if (extractedData.building_name) {
      console.log(`[PROCESS] Building: ${extractedData.building_name}`);
    }
    console.log(`[PROCESS] ================================================\n`);

    return {
      success: true,
      businesses: createdBusinesses,
      count: createdBusinesses.length,
      isMultiTenant: extractedData.is_multi_tenant,
      buildingName: extractedData.building_name,
      processDuration: `${processDuration}ms`
    };
  } catch (error: any) {
    const processDuration = Date.now() - processStartTime;
    console.error(`\n[PROCESS] ========== ❌ Processing failed! ==========`);
    console.error(`[PROCESS] Duration: ${processDuration}ms`);
    console.error(`[PROCESS] Error: ${error.message}`);
    console.error(`[PROCESS] Stack:`, error.stack);
    console.error(`[PROCESS] ================================================\n`);

    await prisma.photo.update({
      where: { id: photoId },
      data: {
        processed: true,
        processingError: error.message,
      },
    });

    return {
      success: false,
      error: error.message,
      processDuration: `${processDuration}ms`,
      debug: {
        errorType: error.name,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      }
    };
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
