// Comprehensive Hunter.io API service
import axios from 'axios';

const HUNTER_API_KEY = process.env.HUNTER_API_KEY;
const HUNTER_BASE_URL = 'https://api.hunter.io/v2';

export interface HunterEmailResult {
  value: string;
  type: string;
  confidence: number;
  firstName?: string;
  lastName?: string;
  position?: string;
  seniority?: string;
  department?: string;
  linkedin?: string;
  twitter?: string;
  phoneNumber?: string;
  verification?: {
    date: string;
    status: string;
  };
  sources?: Array<{
    domain: string;
    uri: string;
    extracted_on: string;
  }>;
}

export interface HunterDomainSearchResult {
  domain: string;
  disposable: boolean;
  webmail: boolean;
  pattern: string;
  organization: string;
  emails: HunterEmailResult[];
  linkedinUrl?: string;
  twitterHandle?: string;
}

export interface HunterEmailVerificationResult {
  status: string; // valid, invalid, accept_all, webmail, disposable, unknown
  result: string; // deliverable, undeliverable, risky, unknown
  score: number;
  email: string;
  regexp: boolean;
  gibberish: boolean;
  disposable: boolean;
  webmail: boolean;
  mxRecords: boolean;
  smtpServer: boolean;
  smtpCheck: boolean;
  acceptAll: boolean;
  block: boolean;
  sources?: Array<{ domain: string; uri: string }>;
}

export interface HunterEmailCountResult {
  total: number;
  personal: number;
  generic: number;
  department?: {
    [key: string]: number;
  };
  seniority?: {
    [key: string]: number;
  };
}

export interface HunterEmailFinderResult {
  email: string;
  firstName: string;
  lastName: string;
  confidence: number;
  position?: string;
  seniority?: string;
  department?: string;
  linkedin?: string;
  twitter?: string;
  phoneNumber?: string;
  companyName?: string;
  verification?: {
    date: string;
    status: string;
  };
  sources?: Array<{ domain: string; uri: string }>;
}

export interface HunterEmailEnrichmentResult {
  email: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  position?: string;
  seniority?: string;
  department?: string;
  linkedin?: string;
  twitter?: string;
  phoneNumber?: string;
  companyName?: string;
  companyDomain?: string;
  companyIndustry?: string;
  location?: string;
  city?: string;
  state?: string;
  country?: string;
  timezone?: string;
}

export interface HunterCompanyEnrichmentResult {
  domain: string;
  companyName: string;
  industry?: string;
  description?: string;
  foundedYear?: number;
  employeeCount?: string;
  revenue?: string;
  headquarters?: {
    city?: string;
    state?: string;
    country?: string;
  };
  technologies?: string[];
  linkedinUrl?: string;
  twitterHandle?: string;
  facebookUrl?: string;
  logoUrl?: string;
}

export interface HunterDiscoverResult {
  companies: Array<{
    domain: string;
    companyName: string;
    industry?: string;
    employeeCount?: string;
    location?: string;
    founded?: number;
  }>;
  total: number;
  offset: number;
  limit: number;
}

// ============================================================================
// PHASE 1: Quick Wins
// ============================================================================

/**
 * Get email count for a domain (FREE)
 * Shows how many emails are available before using credits
 */
export async function getEmailCount(domain: string): Promise<{
  success: boolean;
  data?: HunterEmailCountResult;
  error?: string;
}> {
  if (!HUNTER_API_KEY) {
    return { success: false, error: 'Hunter API key not configured' };
  }

  try {
    const response = await axios.get(`${HUNTER_BASE_URL}/email-count`, {
      params: {
        domain,
        api_key: HUNTER_API_KEY,
      },
    });

    return {
      success: true,
      data: response.data.data,
    };
  } catch (error: any) {
    console.error('Hunter Email Count error:', error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data?.errors?.[0]?.details || error.message,
    };
  }
}

/**
 * Domain Search - Find all emails for a domain
 * Enhanced with better error handling and pagination
 */
export async function domainSearch(
  domain: string,
  options?: {
    limit?: number;
    offset?: number;
    type?: 'personal' | 'generic';
    seniority?: string;
    department?: string;
  }
): Promise<{
  success: boolean;
  data?: HunterDomainSearchResult;
  error?: string;
}> {
  if (!HUNTER_API_KEY) {
    return { success: false, error: 'Hunter API key not configured' };
  }

  try {
    const response = await axios.get(`${HUNTER_BASE_URL}/domain-search`, {
      params: {
        domain,
        limit: options?.limit || 10,
        offset: options?.offset || 0,
        type: options?.type,
        seniority: options?.seniority,
        department: options?.department,
        api_key: HUNTER_API_KEY,
      },
    });

    return {
      success: true,
      data: response.data.data,
    };
  } catch (error: any) {
    console.error('Hunter Domain Search error:', error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data?.errors?.[0]?.details || error.message,
    };
  }
}

/**
 * Verify single email address
 */
export async function verifyEmail(email: string): Promise<{
  success: boolean;
  data?: HunterEmailVerificationResult;
  error?: string;
}> {
  if (!HUNTER_API_KEY) {
    return { success: false, error: 'Hunter API key not configured' };
  }

  try {
    const response = await axios.get(`${HUNTER_BASE_URL}/email-verifier`, {
      params: {
        email,
        api_key: HUNTER_API_KEY,
      },
    });

    return {
      success: true,
      data: response.data.data,
    };
  } catch (error: any) {
    console.error('Hunter Email Verifier error:', error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data?.errors?.[0]?.details || error.message,
    };
  }
}

/**
 * Bulk verify multiple email addresses
 * Processes emails in parallel with rate limiting
 */
export async function bulkVerifyEmails(emails: string[]): Promise<{
  success: boolean;
  results: Array<{
    email: string;
    verification?: HunterEmailVerificationResult;
    error?: string;
  }>;
  summary: {
    total: number;
    valid: number;
    invalid: number;
    risky: number;
    unknown: number;
  };
}> {
  const results = [];
  const summary = {
    total: emails.length,
    valid: 0,
    invalid: 0,
    risky: 0,
    unknown: 0,
  };

  // Process in batches to respect rate limits (10 req/sec)
  const batchSize = 10;
  for (let i = 0; i < emails.length; i += batchSize) {
    const batch = emails.slice(i, i + batchSize);

    const batchResults = await Promise.all(
      batch.map(async (email) => {
        const result = await verifyEmail(email);

        if (result.success && result.data) {
          // Categorize results
          if (result.data.result === 'deliverable') summary.valid++;
          else if (result.data.result === 'undeliverable') summary.invalid++;
          else if (result.data.result === 'risky') summary.risky++;
          else summary.unknown++;

          return {
            email,
            verification: result.data,
          };
        } else {
          summary.unknown++;
          return {
            email,
            error: result.error,
          };
        }
      })
    );

    results.push(...batchResults);

    // Wait 1 second between batches to respect rate limits
    if (i + batchSize < emails.length) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  return {
    success: true,
    results,
    summary,
  };
}

/**
 * Get company enrichment data from domain
 */
export async function enrichCompany(domain: string): Promise<{
  success: boolean;
  data?: HunterCompanyEnrichmentResult;
  error?: string;
}> {
  if (!HUNTER_API_KEY) {
    return { success: false, error: 'Hunter API key not configured' };
  }

  try {
    const response = await axios.get(`${HUNTER_BASE_URL}/domain-search`, {
      params: {
        domain,
        limit: 1, // We only need company data, not emails
        api_key: HUNTER_API_KEY,
      },
    });

    const data = response.data.data;

    return {
      success: true,
      data: {
        domain: data.domain,
        companyName: data.organization,
        linkedinUrl: data.linkedin_url,
        twitterHandle: data.twitter,
        // Note: Full enrichment data requires Hunter's enrichment API
        // This uses the domain-search endpoint which provides basic company info
      },
    };
  } catch (error: any) {
    console.error('Hunter Company Enrichment error:', error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data?.errors?.[0]?.details || error.message,
    };
  }
}

// ============================================================================
// PHASE 2: Power Features
// ============================================================================

/**
 * Find email address for a specific person
 */
export async function findEmail(
  domain: string,
  firstName: string,
  lastName: string,
  options?: {
    companyName?: string;
    linkedin?: string;
  }
): Promise<{
  success: boolean;
  data?: HunterEmailFinderResult;
  error?: string;
}> {
  if (!HUNTER_API_KEY) {
    return { success: false, error: 'Hunter API key not configured' };
  }

  try {
    const params: any = {
      domain,
      first_name: firstName,
      last_name: lastName,
      api_key: HUNTER_API_KEY,
    };

    if (options?.companyName) params.company = options.companyName;
    if (options?.linkedin) params.linkedin_url = options.linkedin;

    const response = await axios.get(`${HUNTER_BASE_URL}/email-finder`, {
      params,
    });

    return {
      success: true,
      data: {
        email: response.data.data.email,
        firstName: response.data.data.first_name,
        lastName: response.data.data.last_name,
        confidence: response.data.data.confidence,
        position: response.data.data.position,
        seniority: response.data.data.seniority,
        department: response.data.data.department,
        linkedin: response.data.data.linkedin,
        twitter: response.data.data.twitter,
        phoneNumber: response.data.data.phone_number,
        verification: response.data.data.verification,
        sources: response.data.data.sources,
      },
    };
  } catch (error: any) {
    console.error('Hunter Email Finder error:', error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data?.errors?.[0]?.details || error.message,
    };
  }
}

/**
 * Enrich email with full contact profile
 */
export async function enrichEmail(email: string): Promise<{
  success: boolean;
  data?: HunterEmailEnrichmentResult;
  error?: string;
}> {
  if (!HUNTER_API_KEY) {
    return { success: false, error: 'Hunter API key not configured' };
  }

  try {
    // Hunter's enrichment uses domain-search with email filter
    const domain = email.split('@')[1];
    const response = await axios.get(`${HUNTER_BASE_URL}/domain-search`, {
      params: {
        domain,
        limit: 100,
        api_key: HUNTER_API_KEY,
      },
    });

    // Find the specific email in results
    const emails = response.data.data.emails || [];
    const emailData = emails.find((e: any) => e.value === email);

    if (!emailData) {
      return {
        success: false,
        error: 'Email not found in Hunter database',
      };
    }

    return {
      success: true,
      data: {
        email: emailData.value,
        firstName: emailData.first_name,
        lastName: emailData.last_name,
        fullName: `${emailData.first_name} ${emailData.last_name}`,
        position: emailData.position,
        seniority: emailData.seniority,
        department: emailData.department,
        linkedin: emailData.linkedin,
        twitter: emailData.twitter,
        phoneNumber: emailData.phone_number,
        companyName: response.data.data.organization,
        companyDomain: domain,
      },
    };
  } catch (error: any) {
    console.error('Hunter Email Enrichment error:', error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data?.errors?.[0]?.details || error.message,
    };
  }
}

/**
 * Discover companies matching criteria (FREE)
 */
export async function discoverCompanies(options: {
  query?: string;
  location?: string;
  industry?: string;
  minEmployees?: number;
  maxEmployees?: number;
  technology?: string;
  limit?: number;
  offset?: number;
}): Promise<{
  success: boolean;
  data?: HunterDiscoverResult;
  error?: string;
}> {
  if (!HUNTER_API_KEY) {
    return { success: false, error: 'Hunter API key not configured' };
  }

  try {
    const params: any = {
      api_key: HUNTER_API_KEY,
      limit: options.limit || 10,
      offset: options.offset || 0,
    };

    if (options.query) params.query = options.query;
    if (options.location) params.location = options.location;
    if (options.industry) params.industry = options.industry;
    if (options.minEmployees) params.min_employees = options.minEmployees;
    if (options.maxEmployees) params.max_employees = options.maxEmployees;
    if (options.technology) params.technology = options.technology;

    const response = await axios.get(`${HUNTER_BASE_URL}/discover`, {
      params,
    });

    return {
      success: true,
      data: {
        companies: response.data.data.companies || [],
        total: response.data.meta.results,
        offset: response.data.meta.offset,
        limit: response.data.meta.limit,
      },
    };
  } catch (error: any) {
    console.error('Hunter Discover error:', error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data?.errors?.[0]?.details || error.message,
    };
  }
}

/**
 * Get Hunter account information
 */
export async function getAccountInfo(): Promise<{
  success: boolean;
  data?: {
    requests: {
      searches: { used: number; available: number };
      verifications: { used: number; available: number };
    };
    resetDate: string;
  };
  error?: string;
}> {
  if (!HUNTER_API_KEY) {
    return { success: false, error: 'Hunter API key not configured' };
  }

  try {
    const response = await axios.get(`${HUNTER_BASE_URL}/account`, {
      params: {
        api_key: HUNTER_API_KEY,
      },
    });

    return {
      success: true,
      data: {
        requests: response.data.data.requests,
        resetDate: response.data.data.reset_date,
      },
    };
  } catch (error: any) {
    console.error('Hunter Account Info error:', error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data?.errors?.[0]?.details || error.message,
    };
  }
}
