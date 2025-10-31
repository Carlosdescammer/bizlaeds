// External API enrichment integrations (Clearbit, Apollo, etc.)
import axios from 'axios';
import { prisma } from '@/lib/db';

const CLEARBIT_API_KEY = process.env.CLEARBIT_API_KEY;
const APOLLO_API_KEY = process.env.APOLLO_API_KEY;

export interface EnrichmentResult {
  success: boolean;
  service: string;
  data: any;
  error?: string;
}

// ============================================================================
// CLEARBIT ENRICHMENT
// ============================================================================

/**
 * Enrich business with Clearbit Company API
 */
export async function enrichWithClearbit(domain: string): Promise<EnrichmentResult> {
  if (!CLEARBIT_API_KEY) {
    return {
      success: false,
      service: 'clearbit',
      data: null,
      error: 'Clearbit API key not configured',
    };
  }

  try {
    const response = await axios.get(`https://company.clearbit.com/v2/companies/find`, {
      params: { domain },
      headers: {
        Authorization: `Bearer ${CLEARBIT_API_KEY}`,
      },
    });

    const companyData = response.data;

    return {
      success: true,
      service: 'clearbit',
      data: {
        companySize: companyData.metrics?.employees || null,
        companyRevenue: companyData.metrics?.estimatedAnnualRevenue || null,
        foundedYear: companyData.foundedYear || null,
        industry: companyData.category?.industry || null,
        linkedinUrl: companyData.linkedin?.handle
          ? `https://www.linkedin.com/company/${companyData.linkedin.handle}`
          : null,
        twitterHandle: companyData.twitter?.handle || null,
        facebookUrl: companyData.facebook?.handle || null,
        website: companyData.domain || null,
        description: companyData.description || null,
        logo: companyData.logo || null,
        tags: companyData.tags || [],
      },
    };
  } catch (error: any) {
    return {
      success: false,
      service: 'clearbit',
      data: null,
      error: error.response?.data?.error?.message || error.message,
    };
  }
}

// ============================================================================
// APOLLO ENRICHMENT
// ============================================================================

/**
 * Enrich business with Apollo.io API
 */
export async function enrichWithApollo(domain: string): Promise<EnrichmentResult> {
  if (!APOLLO_API_KEY) {
    return {
      success: false,
      service: 'apollo',
      data: null,
      error: 'Apollo API key not configured',
    };
  }

  try {
    const response = await axios.post(
      'https://api.apollo.io/v1/organizations/enrich',
      {
        domain,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
          'X-Api-Key': APOLLO_API_KEY,
        },
      }
    );

    const orgData = response.data.organization;

    return {
      success: true,
      service: 'apollo',
      data: {
        companySize: orgData.estimated_num_employees || null,
        companyRevenue: orgData.annual_revenue || null,
        foundedYear: orgData.founded_year || null,
        industry: orgData.industry || null,
        linkedinUrl: orgData.linkedin_url || null,
        twitterHandle: orgData.twitter_url?.split('/').pop() || null,
        facebookUrl: orgData.facebook_url || null,
        website: orgData.website_url || null,
        phone: orgData.phone || null,
        description: orgData.short_description || null,
        tags: orgData.industry_tag_list || [],
        technologies: orgData.technologies || [],
      },
    };
  } catch (error: any) {
    return {
      success: false,
      service: 'apollo',
      data: null,
      error: error.response?.data?.message || error.message,
    };
  }
}

// ============================================================================
// GENERIC ENRICHMENT FUNCTION
// ============================================================================

/**
 * Enrich a business using available services (tries Clearbit first, then Apollo)
 */
export async function enrichBusiness(
  businessId: string,
  preferredService?: 'clearbit' | 'apollo'
): Promise<EnrichmentResult> {
  const business = await prisma.business.findUnique({
    where: { id: businessId },
  });

  if (!business) {
    return {
      success: false,
      service: 'none',
      data: null,
      error: 'Business not found',
    };
  }

  // Extract domain from website or email
  let domain: string | null = null;

  if (business.website) {
    try {
      let url = business.website;
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url;
      }
      domain = new URL(url).hostname.replace(/^www\./, '');
    } catch {
      domain = null;
    }
  } else if (business.email) {
    domain = business.email.split('@')[1];
  }

  if (!domain) {
    return {
      success: false,
      service: 'none',
      data: null,
      error: 'No domain found for enrichment',
    };
  }

  // Try preferred service first
  let result: EnrichmentResult;

  if (preferredService === 'apollo' && APOLLO_API_KEY) {
    result = await enrichWithApollo(domain);
    if (!result.success && CLEARBIT_API_KEY) {
      result = await enrichWithClearbit(domain);
    }
  } else if (preferredService === 'clearbit' && CLEARBIT_API_KEY) {
    result = await enrichWithClearbit(domain);
    if (!result.success && APOLLO_API_KEY) {
      result = await enrichWithApollo(domain);
    }
  } else {
    // Try Clearbit first by default
    if (CLEARBIT_API_KEY) {
      result = await enrichWithClearbit(domain);
      if (!result.success && APOLLO_API_KEY) {
        result = await enrichWithApollo(domain);
      }
    } else if (APOLLO_API_KEY) {
      result = await enrichWithApollo(domain);
    } else {
      return {
        success: false,
        service: 'none',
        data: null,
        error: 'No enrichment API keys configured',
      };
    }
  }

  // If enrichment was successful, update the business
  if (result.success && result.data) {
    await prisma.business.update({
      where: { id: businessId },
      data: {
        ...result.data,
        enrichedByService: result.service,
        enrichedAt: new Date(),
      },
    });

    // Log API usage
    await prisma.apiUsageLog.create({
      data: {
        service: result.service,
        businessId,
        requestType: 'company_enrichment',
        success: true,
        estimatedCost: result.service === 'clearbit' ? 0.01 : 0.005, // Approximate costs
        responseData: result.data,
      },
    });
  } else {
    // Log failed attempt
    await prisma.apiUsageLog.create({
      data: {
        service: result.service,
        businessId,
        requestType: 'company_enrichment',
        success: false,
        estimatedCost: 0,
        errorMessage: result.error,
      },
    });
  }

  return result;
}

// ============================================================================
// LINKEDIN SCRAPING (via RapidAPI)
// ============================================================================

const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;

/**
 * Search for company on LinkedIn using RapidAPI
 */
export async function searchLinkedIn(companyName: string): Promise<{
  success: boolean;
  linkedinUrl?: string;
  companyData?: any;
  error?: string;
}> {
  if (!RAPIDAPI_KEY) {
    return {
      success: false,
      error: 'RapidAPI key not configured for LinkedIn search',
    };
  }

  try {
    // Using RapidAPI's LinkedIn Company Search
    const response = await axios.get(
      'https://linkedin-data-api.p.rapidapi.com/search-companies',
      {
        params: {
          keywords: companyName,
        },
        headers: {
          'X-RapidAPI-Key': RAPIDAPI_KEY,
          'X-RapidAPI-Host': 'linkedin-data-api.p.rapidapi.com',
        },
      }
    );

    const companies = response.data?.data || [];

    if (companies.length === 0) {
      return {
        success: false,
        error: 'No LinkedIn company found',
      };
    }

    // Get the first (most relevant) result
    const company = companies[0];

    return {
      success: true,
      linkedinUrl: company.url || `https://www.linkedin.com/company/${company.id}`,
      companyData: {
        name: company.name,
        description: company.tagline,
        industry: company.industry,
        companySize: company.company_size_on_linkedin,
        headquarters: company.hq?.city,
        website: company.website,
        followerCount: company.follower_count,
      },
    };
  } catch (error: any) {
    console.error('LinkedIn search error:', error);
    return {
      success: false,
      error: error.response?.data?.message || error.message,
    };
  }
}

/**
 * Get detailed company information from LinkedIn
 */
export async function getLinkedInCompanyDetails(linkedinUrl: string): Promise<{
  success: boolean;
  data?: any;
  error?: string;
}> {
  if (!RAPIDAPI_KEY) {
    return {
      success: false,
      error: 'RapidAPI key not configured',
    };
  }

  try {
    // Extract company username from URL
    const companyUsername = linkedinUrl.split('/company/')[1]?.split('/')[0];

    if (!companyUsername) {
      return {
        success: false,
        error: 'Invalid LinkedIn URL',
      };
    }

    const response = await axios.get(
      'https://linkedin-data-api.p.rapidapi.com/get-company-details',
      {
        params: {
          username: companyUsername,
        },
        headers: {
          'X-RapidAPI-Key': RAPIDAPI_KEY,
          'X-RapidAPI-Host': 'linkedin-data-api.p.rapidapi.com',
        },
      }
    );

    const companyData = response.data?.data || response.data;

    return {
      success: true,
      data: {
        name: companyData.name,
        description: companyData.description,
        website: companyData.website,
        industry: companyData.industry,
        companySize: companyData.company_size || companyData.company_size_on_linkedin,
        headquarters: companyData.hq,
        foundedYear: companyData.founded?.year,
        specialties: companyData.specialities || [],
        followerCount: companyData.follower_count,
        employeeCount: companyData.staff_count,
      },
    };
  } catch (error: any) {
    console.error('LinkedIn details error:', error);
    return {
      success: false,
      error: error.response?.data?.message || error.message,
    };
  }
}

/**
 * Enrich business with LinkedIn data
 */
export async function enrichWithLinkedIn(
  businessId: string
): Promise<EnrichmentResult> {
  const business = await prisma.business.findUnique({
    where: { id: businessId },
  });

  if (!business) {
    return {
      success: false,
      service: 'linkedin',
      data: null,
      error: 'Business not found',
    };
  }

  let linkedinData;

  // Try to find LinkedIn profile if we don't have one
  if (!business.linkedinUrl && business.businessName) {
    const searchResult = await searchLinkedIn(business.businessName);

    if (searchResult.success) {
      linkedinData = searchResult.companyData;

      // Update business with LinkedIn URL and data
      await prisma.business.update({
        where: { id: businessId },
        data: {
          linkedinUrl: searchResult.linkedinUrl,
          companySize: linkedinData?.companySize || business.companySize,
          industry: linkedinData?.industry || business.industry,
          description: linkedinData?.description || business.description,
          website: linkedinData?.website || business.website,
        },
      });

      // Log API usage
      await prisma.apiUsageLog.create({
        data: {
          service: 'linkedin_rapidapi',
          businessId,
          requestType: 'company_search',
          success: true,
          estimatedCost: 0.01,
          responseData: linkedinData,
        },
      });

      return {
        success: true,
        service: 'linkedin',
        data: linkedinData,
      };
    } else {
      return {
        success: false,
        service: 'linkedin',
        data: null,
        error: searchResult.error,
      };
    }
  } else if (business.linkedinUrl) {
    // We already have a LinkedIn URL, get detailed info
    const detailsResult = await getLinkedInCompanyDetails(business.linkedinUrl);

    if (detailsResult.success) {
      linkedinData = detailsResult.data;

      await prisma.business.update({
        where: { id: businessId },
        data: {
          companySize: linkedinData?.companySize || business.companySize,
          industry: linkedinData?.industry || business.industry,
          description: linkedinData?.description || business.description,
          foundedYear: linkedinData?.foundedYear || business.foundedYear,
        },
      });

      await prisma.apiUsageLog.create({
        data: {
          service: 'linkedin_rapidapi',
          businessId,
          requestType: 'company_details',
          success: true,
          estimatedCost: 0.01,
          responseData: linkedinData,
        },
      });

      return {
        success: true,
        service: 'linkedin',
        data: linkedinData,
      };
    } else {
      return {
        success: false,
        service: 'linkedin',
        data: null,
        error: detailsResult.error,
      };
    }
  }

  return {
    success: false,
    service: 'linkedin',
    data: null,
    error: 'No business name or LinkedIn URL available',
  };
}

// ============================================================================
// YELP API INTEGRATION
// ============================================================================

/**
 * Enrich with Yelp Business API
 */
export async function enrichWithYelp(
  businessName: string,
  location: string
): Promise<EnrichmentResult> {
  const YELP_API_KEY = process.env.YELP_API_KEY;

  if (!YELP_API_KEY) {
    return {
      success: false,
      service: 'yelp',
      data: null,
      error: 'Yelp API key not configured',
    };
  }

  try {
    const response = await axios.get('https://api.yelp.com/v3/businesses/search', {
      headers: {
        Authorization: `Bearer ${YELP_API_KEY}`,
      },
      params: {
        term: businessName,
        location: location,
        limit: 1,
      },
    });

    const business = response.data.businesses[0];

    if (!business) {
      return {
        success: false,
        service: 'yelp',
        data: null,
        error: 'Business not found on Yelp',
      };
    }

    return {
      success: true,
      service: 'yelp',
      data: {
        yelpRating: business.rating,
        yelpReviewCount: business.review_count,
        yelpUrl: business.url,
        phone: business.phone || null,
        address: business.location.display_address.join(', '),
        categories: business.categories.map((c: any) => c.title),
        price: business.price || null,
        photos: business.image_url ? [business.image_url] : [],
      },
    };
  } catch (error: any) {
    return {
      success: false,
      service: 'yelp',
      data: null,
      error: error.response?.data?.error?.description || error.message,
    };
  }
}

// ============================================================================
// YELLOW PAGES SCRAPING (requires scraping service)
// ============================================================================

/**
 * Search Yellow Pages (placeholder - requires scraping service)
 */
export async function searchYellowPages(
  businessName: string,
  location: string
): Promise<EnrichmentResult> {
  // Note: Yellow Pages doesn't have an official API
  // Would need to use a scraping service like:
  // - ScraperAPI
  // - Bright Data
  // - Apify

  return {
    success: false,
    service: 'yellowpages',
    data: null,
    error: 'Yellow Pages integration not implemented - requires web scraping service',
  };
}

// ============================================================================
// BATCH ENRICHMENT
// ============================================================================

/**
 * Batch enrich multiple businesses
 */
export async function batchEnrichBusinesses(batchSize: number = 10): Promise<{
  processed: number;
  successful: number;
  failed: number;
}> {
  const businesses = await prisma.business.findMany({
    where: {
      enrichedAt: null,
      website: {
        not: null,
      },
      isDuplicate: false,
    },
    take: batchSize,
  });

  const results = {
    processed: 0,
    successful: 0,
    failed: 0,
  };

  for (const business of businesses) {
    const result = await enrichBusiness(business.id);
    results.processed++;

    if (result.success) {
      results.successful++;
    } else {
      results.failed++;
    }

    // Add delay to avoid rate limiting
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  return results;
}
