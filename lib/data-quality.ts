// Data quality, normalization, and validation utilities
import crypto from 'crypto';

// ============================================================================
// NORMALIZATION
// ============================================================================

/**
 * Normalize email address (lowercase, trim)
 */
export function normalizeEmail(email: string | null | undefined): string | null {
  if (!email) return null;
  return email.trim().toLowerCase();
}

/**
 * Normalize phone number (remove all non-digits except + for international)
 */
export function normalizePhone(phone: string | null | undefined): string | null {
  if (!phone) return null;

  // Remove all non-digit characters except '+' at the start
  let normalized = phone.trim().replace(/[^\d+]/g, '');

  // If it starts with +, keep it; otherwise remove any + signs
  if (normalized.startsWith('+')) {
    normalized = '+' + normalized.substring(1).replace(/\+/g, '');
  } else {
    normalized = normalized.replace(/\+/g, '');
  }

  return normalized || null;
}

/**
 * Normalize business name (trim, proper casing, remove extra whitespace)
 */
export function normalizeBusinessName(name: string | null | undefined): string | null {
  if (!name) return null;

  // Trim and collapse multiple spaces
  let normalized = name.trim().replace(/\s+/g, ' ');

  // Title case (capitalize first letter of each word)
  normalized = normalized.toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());

  return normalized;
}

/**
 * Normalize address (trim, collapse spaces, standard casing)
 */
export function normalizeAddress(address: string | null | undefined): string | null {
  if (!address) return null;

  // Trim and collapse multiple spaces
  let normalized = address.trim().replace(/\s+/g, ' ');

  // Standardize abbreviations (St., Ave., etc.)
  normalized = normalized
    .replace(/\bStreet\b/gi, 'St')
    .replace(/\bAvenue\b/gi, 'Ave')
    .replace(/\bRoad\b/gi, 'Rd')
    .replace(/\bBoulevard\b/gi, 'Blvd')
    .replace(/\bDrive\b/gi, 'Dr')
    .replace(/\bLane\b/gi, 'Ln')
    .replace(/\bCourt\b/gi, 'Ct')
    .replace(/\bSuite\b/gi, 'Ste');

  return normalized;
}

// ============================================================================
// HASHING (for deduplication)
// ============================================================================

/**
 * Create SHA-256 hash of a string for deduplication
 */
export function createHash(value: string | null | undefined): string | null {
  if (!value) return null;
  return crypto.createHash('sha256').update(value.toLowerCase()).digest('hex');
}

/**
 * Extract domain from email or website
 */
export function extractDomain(emailOrWebsite: string | null | undefined): string | null {
  if (!emailOrWebsite) return null;

  try {
    // If it's an email
    if (emailOrWebsite.includes('@')) {
      return emailOrWebsite.split('@')[1].toLowerCase();
    }

    // If it's a URL
    let url = emailOrWebsite.trim();
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }

    const domain = new URL(url).hostname.toLowerCase();
    return domain.replace(/^www\./, '');
  } catch {
    return null;
  }
}

// ============================================================================
// EMAIL VALIDATION
// ============================================================================

/**
 * List of disposable email domains
 */
const DISPOSABLE_EMAIL_DOMAINS = [
  'tempmail.com',
  '10minutemail.com',
  'guerrillamail.com',
  'mailinator.com',
  'throwaway.email',
  'temp-mail.org',
  'getnada.com',
  'fakeinbox.com',
  'trashmail.com',
  'yopmail.com',
];

/**
 * List of generic/role-based email prefixes
 */
const GENERIC_EMAIL_PREFIXES = [
  'info',
  'contact',
  'admin',
  'support',
  'sales',
  'hello',
  'noreply',
  'no-reply',
  'help',
  'office',
  'team',
  'inquiries',
  'general',
];

/**
 * Check if email is disposable
 */
export function isDisposableEmail(email: string | null | undefined): boolean {
  if (!email) return false;

  const domain = extractDomain(email);
  if (!domain) return false;

  return DISPOSABLE_EMAIL_DOMAINS.some((disposable) => domain.includes(disposable));
}

/**
 * Check if email is generic/role-based
 */
export function isGenericEmail(email: string | null | undefined): boolean {
  if (!email) return false;

  const prefix = email.split('@')[0]?.toLowerCase();
  if (!prefix) return false;

  return GENERIC_EMAIL_PREFIXES.includes(prefix);
}

/**
 * Basic email format validation
 */
export function isValidEmailFormat(email: string | null | undefined): boolean {
  if (!email) return false;

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Comprehensive email validation
 */
export function validateEmail(email: string | null | undefined): {
  valid: boolean;
  isDisposable: boolean;
  isGeneric: boolean;
} {
  return {
    valid: isValidEmailFormat(email),
    isDisposable: isDisposableEmail(email),
    isGeneric: isGenericEmail(email),
  };
}

// ============================================================================
// DOMAIN VALIDATION
// ============================================================================

/**
 * Check if domain is valid format
 */
export function isValidDomainFormat(domain: string | null | undefined): boolean {
  if (!domain) return false;

  const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?\.[a-zA-Z]{2,}$/;
  return domainRegex.test(domain);
}

/**
 * Check if domain is active (has DNS records)
 */
export async function isDomainActive(domain: string | null | undefined): Promise<boolean> {
  if (!domain) return false;

  try {
    // Use a simple HTTP HEAD request to check if domain responds
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(`https://${domain}`, {
      method: 'HEAD',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    return response.ok || response.status === 301 || response.status === 302;
  } catch {
    return false;
  }
}

// ============================================================================
// INDUSTRY & RELEVANCE
// ============================================================================

/**
 * Photography-relevant industries
 */
export const RELEVANT_INDUSTRIES = [
  'Medical',
  'Healthcare',
  'Corporate',
  'Legal',
  'Law',
  'Real Estate',
  'Education',
  'Entertainment',
  'Events',
  'Hospitality',
  'Restaurant',
  'Retail',
  'Fashion',
  'Beauty',
  'Fitness',
  'Sports',
  'Non-Profit',
  'Agency',
  'Marketing',
  'Technology',
];

/**
 * Industries to filter out
 */
export const IRRELEVANT_INDUSTRIES = [
  'Construction',
  'Manufacturing',
  'Automotive',
  'Plumbing',
  'HVAC',
  'Roofing',
  'Landscaping',
];

/**
 * Check if industry is relevant to photography services
 */
export function isRelevantIndustry(industry: string | null | undefined): boolean {
  if (!industry) return true; // Unknown industries get benefit of doubt

  const normalizedIndustry = industry.toLowerCase();

  // Check if it's explicitly irrelevant
  if (IRRELEVANT_INDUSTRIES.some((irr) => normalizedIndustry.includes(irr.toLowerCase()))) {
    return false;
  }

  // Check if it's explicitly relevant
  if (RELEVANT_INDUSTRIES.some((rel) => normalizedIndustry.includes(rel.toLowerCase()))) {
    return true;
  }

  // Unknown industries: neutral
  return true;
}

// ============================================================================
// SERVICE SEGMENTATION
// ============================================================================

/**
 * Determine service segment based on business type and industry
 */
export function determineServiceSegment(
  businessType: string | null | undefined,
  industry: string | null | undefined
): string | null {
  const combined = `${businessType || ''} ${industry || ''}`.toLowerCase();

  // Headshots segment
  if (
    combined.includes('corporate') ||
    combined.includes('professional') ||
    combined.includes('real estate') ||
    combined.includes('legal') ||
    combined.includes('law') ||
    combined.includes('lawyer') ||
    combined.includes('attorney')
  ) {
    return 'headshots';
  }

  // Events segment
  if (
    combined.includes('medical') ||
    combined.includes('healthcare') ||
    combined.includes('hospital') ||
    combined.includes('clinic') ||
    combined.includes('conference') ||
    combined.includes('event')
  ) {
    return 'events';
  }

  // Branding segment
  if (
    combined.includes('entrepreneur') ||
    combined.includes('agency') ||
    combined.includes('marketing') ||
    combined.includes('startup') ||
    combined.includes('small business')
  ) {
    return 'branding';
  }

  return null;
}

// ============================================================================
// LEAD SCORING
// ============================================================================

/**
 * Calculate relevance score based on data quality and relevance
 */
export function calculateRelevanceScore(business: {
  email?: string | null;
  phone?: string | null;
  website?: string | null;
  industry?: string | null;
  businessType?: string | null;
  emailValid?: boolean | null;
  domainValid?: boolean | null;
  isDisposableEmail?: boolean;
  isGenericEmail?: boolean;
}): number {
  let score = 0;

  // Contact methods (+30 max)
  if (business.email && business.emailValid) score += 15;
  if (business.phone) score += 10;
  if (business.website && business.domainValid) score += 5;

  // Data quality (+20 max)
  if (business.email && !business.isDisposableEmail) score += 10;
  if (business.email && !business.isGenericEmail) score += 10;

  // Industry relevance (+50 max)
  if (isRelevantIndustry(business.industry)) {
    score += 30;

    // Bonus for high-value industries
    const highValueIndustries = ['medical', 'legal', 'corporate', 'real estate'];
    if (highValueIndustries.some((hv) => business.industry?.toLowerCase().includes(hv))) {
      score += 20;
    }
  }

  return Math.min(score, 100);
}
