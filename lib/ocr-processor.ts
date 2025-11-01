// Business card OCR processing using Google Vision API
import axios from 'axios';
import { prisma } from '@/lib/db';
import { processBusinessData } from '@/lib/business-processor';

const GOOGLE_VISION_API_KEY = process.env.GOOGLE_VISION_API_KEY || process.env.GOOGLE_MAPS_API_KEY;

export interface OCRResult {
  success: boolean;
  extractedText?: string;
  parsedData?: {
    businessName?: string;
    contactName?: string;
    email?: string;
    phone?: string;
    website?: string;
    address?: string;
    jobTitle?: string;
    industry?: string;
  };
  confidence?: number;
  error?: string;
}

/**
 * Extract text from business card image using Google Vision API
 */
export async function extractTextFromImage(
  imageBase64: string
): Promise<{ success: boolean; text?: string; error?: string }> {
  if (!GOOGLE_VISION_API_KEY) {
    return {
      success: false,
      error: 'Google Vision API key not configured',
    };
  }

  try {
    const response = await axios.post(
      `https://vision.googleapis.com/v1/images:annotate?key=${GOOGLE_VISION_API_KEY}`,
      {
        requests: [
          {
            image: {
              content: imageBase64,
            },
            features: [
              {
                type: 'TEXT_DETECTION',
                maxResults: 1,
              },
            ],
          },
        ],
      }
    );

    const textAnnotations = response.data.responses[0]?.textAnnotations;

    if (!textAnnotations || textAnnotations.length === 0) {
      return {
        success: false,
        error: 'No text detected in image',
      };
    }

    // The first annotation contains all detected text
    const fullText = textAnnotations[0].description;

    return {
      success: true,
      text: fullText,
    };
  } catch (error: any) {
    console.error('Google Vision API error:', error);
    return {
      success: false,
      error: error.response?.data?.error?.message || error.message,
    };
  }
}

/**
 * Parse extracted text and identify business card fields
 */
export function parseBusinessCardText(text: string): OCRResult['parsedData'] {
  const lines = text.split('\n').map((line) => line.trim()).filter(Boolean);

  const parsed: OCRResult['parsedData'] = {};

  // Email regex
  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/;

  // Phone regex (various formats)
  const phoneRegex = /(\+?1?\s*\(?[0-9]{3}\)?[\s.-]?[0-9]{3}[\s.-]?[0-9]{4})|(\+?[0-9]{1,3}[\s.-]?[0-9]{2,4}[\s.-]?[0-9]{2,4}[\s.-]?[0-9]{2,4})/;

  // Website regex
  const websiteRegex = /(https?:\/\/)?(www\.)?[a-zA-Z0-9-]+\.[a-zA-Z]{2,}(\.[a-zA-Z]{2,})?/;

  // Common job titles
  const jobTitles = [
    'ceo', 'cto', 'cfo', 'coo', 'president', 'vice president', 'vp',
    'director', 'manager', 'supervisor', 'coordinator', 'specialist',
    'analyst', 'consultant', 'engineer', 'developer', 'designer',
    'founder', 'owner', 'partner', 'executive', 'senior', 'junior',
    'lead', 'head', 'chief', 'photographer', 'artist', 'creative director'
  ];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lowerLine = line.toLowerCase();

    // Extract email
    if (!parsed.email && emailRegex.test(line)) {
      const match = line.match(emailRegex);
      if (match) {
        parsed.email = match[0].toLowerCase();
      }
    }

    // Extract phone
    if (!parsed.phone && phoneRegex.test(line)) {
      const match = line.match(phoneRegex);
      if (match) {
        parsed.phone = match[0];
      }
    }

    // Extract website
    if (!parsed.website && websiteRegex.test(line) && !line.includes('@')) {
      const match = line.match(websiteRegex);
      if (match) {
        let website = match[0];
        // Remove common prefixes
        website = website.replace(/^(https?:\/\/)?(www\.)?/, '');
        parsed.website = website;
      }
    }

    // Extract job title (look for common titles)
    if (!parsed.jobTitle) {
      for (const title of jobTitles) {
        if (lowerLine.includes(title)) {
          parsed.jobTitle = line;
          break;
        }
      }
    }

    // First line is usually the person's name (if not already identified)
    if (i === 0 && !parsed.contactName && line.length < 50 && !emailRegex.test(line) && !phoneRegex.test(line)) {
      parsed.contactName = line;
    }

    // Second or third line might be company name (if first is person name)
    if (i === 1 && parsed.contactName && !parsed.businessName && !emailRegex.test(line) && !phoneRegex.test(line) && !websiteRegex.test(line)) {
      parsed.businessName = line;
    }
  }

  // Address detection (look for patterns with numbers, street, city, state, zip)
  const addressRegex = /\d+\s+[A-Za-z\s]+(?:street|st|avenue|ave|road|rd|boulevard|blvd|lane|ln|drive|dr|court|ct|way)/i;
  const fullText = lines.join(' ');

  if (addressRegex.test(fullText)) {
    const match = fullText.match(addressRegex);
    if (match) {
      parsed.address = match[0];
    }
  }

  // Industry detection (look for keywords)
  const industryKeywords: { [key: string]: string[] } = {
    'photography': ['photo', 'photography', 'photographer', 'studio', 'image', 'portrait'],
    'real estate': ['real estate', 'realtor', 'realty', 'broker', 'property'],
    'legal': ['law', 'attorney', 'lawyer', 'legal', 'esquire', 'esq'],
    'medical': ['doctor', 'dr.', 'medical', 'health', 'clinic', 'physician'],
    'technology': ['tech', 'software', 'it', 'developer', 'engineer', 'digital'],
    'consulting': ['consultant', 'consulting', 'advisory', 'advisor'],
    'marketing': ['marketing', 'advertising', 'media', 'brand', 'pr'],
    'design': ['design', 'designer', 'creative', 'graphics', 'branding'],
  };

  const textLower = fullText.toLowerCase();
  for (const [industry, keywords] of Object.entries(industryKeywords)) {
    if (keywords.some(keyword => textLower.includes(keyword))) {
      parsed.industry = industry;
      break;
    }
  }

  return parsed;
}

/**
 * Process business card image and create/update business record
 */
export async function processBusinessCard(
  imageBase64: string,
  userId?: string
): Promise<{
  success: boolean;
  businessId?: string;
  extractedData?: OCRResult['parsedData'];
  error?: string;
}> {
  try {
    // Step 1: Extract text from image
    const extractionResult = await extractTextFromImage(imageBase64);

    if (!extractionResult.success || !extractionResult.text) {
      // Log failed OCR attempt
      await prisma.apiUsageLog.create({
        data: {
          service: 'google_vision_ocr',
          requestType: 'business_card_ocr',
          success: false,
          estimatedCost: 0.0015,
          responseData: {
            error: extractionResult.error,
          },
        },
      });

      return {
        success: false,
        error: extractionResult.error || 'Failed to extract text from image',
      };
    }

    // Step 2: Parse the extracted text
    const parsedData = parseBusinessCardText(extractionResult.text);

    // Validate that we got at least some useful data
    if (!parsedData || (!parsedData.businessName && !parsedData.email && !parsedData.phone)) {
      // Log insufficient data extraction
      await prisma.apiUsageLog.create({
        data: {
          service: 'google_vision_ocr',
          requestType: 'business_card_ocr',
          success: false,
          estimatedCost: 0.0015,
          responseData: {
            error: 'Insufficient business data extracted',
            extractedText: extractionResult.text?.substring(0, 500),
            parsedData,
          },
        },
      });

      return {
        success: false,
        error: 'Could not extract sufficient business information from the image',
        extractedData: parsedData || {},
      };
    }

    // Step 3: Process through business-processor for validation and enrichment
    const businessInput = {
      businessName: parsedData.businessName || 'Unknown Business',
      email: parsedData.email || null,
      phone: parsedData.phone || null,
      website: parsedData.website || null,
      address: parsedData.address || null,
      industry: parsedData.industry || null,
      contactName: parsedData.contactName || null,
      businessType: parsedData.jobTitle || null,
      source: 'business_card_ocr',
      notes: `Extracted from business card. Original text: ${extractionResult.text.substring(0, 500)}`,
    };

    const processedData = await processBusinessData(businessInput);

    // Step 4: Create business record
    const business = await prisma.business.create({
      data: {
        ...processedData,
        userId: userId || null,
      } as any,
    });

    // Log the OCR API usage
    await prisma.apiUsageLog.create({
      data: {
        service: 'google_vision_ocr',
        businessId: business.id,
        requestType: 'business_card_ocr',
        success: true,
        estimatedCost: 0.0015, // Google Vision API cost per image
        responseData: {
          extractedText: extractionResult.text,
          parsedFields: parsedData,
        },
      },
    });

    return {
      success: true,
      businessId: business.id,
      extractedData: parsedData,
    };
  } catch (error: any) {
    console.error('Business card processing error:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Batch process multiple business cards
 */
export async function batchProcessBusinessCards(
  images: { id: string; base64: string }[],
  userId?: string
): Promise<{
  processed: number;
  successful: number;
  failed: number;
  results: Array<{
    imageId: string;
    success: boolean;
    businessId?: string;
    error?: string;
  }>;
}> {
  const results = {
    processed: 0,
    successful: 0,
    failed: 0,
    results: [] as Array<{
      imageId: string;
      success: boolean;
      businessId?: string;
      error?: string;
    }>,
  };

  for (const image of images) {
    const result = await processBusinessCard(image.base64, userId);
    results.processed++;

    if (result.success) {
      results.successful++;
      results.results.push({
        imageId: image.id,
        success: true,
        businessId: result.businessId,
      });
    } else {
      results.failed++;
      results.results.push({
        imageId: image.id,
        success: false,
        error: result.error,
      });
    }

    // Small delay to avoid rate limiting
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  return results;
}
