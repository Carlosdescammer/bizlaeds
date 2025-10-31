// Business processing middleware - applies data quality checks on create/update
import { prisma } from '@/lib/db';
import {
  normalizeEmail,
  normalizePhone,
  normalizeBusinessName,
  normalizeAddress,
  createHash,
  extractDomain,
  validateEmail,
  isValidDomainFormat,
  isDomainActive,
  isRelevantIndustry,
  determineServiceSegment,
  calculateRelevanceScore,
} from './data-quality';
import { checkDuplicate } from './deduplication';

export interface BusinessInput {
  userId?: string | null;
  businessName: string;
  businessType?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zipCode?: string | null;
  country?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  industry?: string | null;
  dataSource?: string | null;
  sourceUrl?: string | null;
  // Any other fields...
  [key: string]: any;
}

export interface ProcessedBusiness extends BusinessInput {
  // Normalized fields
  normalizedEmail: string | null;
  normalizedPhone: string | null;

  // Hash fields
  emailHash: string | null;
  phoneHash: string | null;
  domainHash: string | null;

  // Email validation
  emailValid: boolean | null;
  isDisposableEmail: boolean;
  isGenericEmail: boolean;

  // Domain validation
  domainValid: boolean | null;
  domainActive: boolean | null;

  // Deduplication
  isDuplicate: boolean;
  duplicateOfId: string | null;

  // Segmentation
  serviceSegment: string | null;
  relevanceScore: number;

  // Lead priority (auto-calculated)
  leadPriority: string;
}

/**
 * Process a business input and enrich it with data quality fields
 */
export async function processBusinessData(
  input: BusinessInput,
  existingBusinessId?: string
): Promise<ProcessedBusiness> {
  const processed: any = { ...input };

  // ============================================================================
  // NORMALIZATION
  // ============================================================================

  // Normalize business name
  if (input.businessName) {
    processed.businessName = normalizeBusinessName(input.businessName) || input.businessName;
  }

  // Normalize email
  processed.normalizedEmail = normalizeEmail(input.email);

  // Normalize phone
  processed.normalizedPhone = normalizePhone(input.phone);

  // Normalize address
  if (input.address) {
    processed.address = normalizeAddress(input.address) || input.address;
  }

  // ============================================================================
  // HASHING
  // ============================================================================

  processed.emailHash = createHash(processed.normalizedEmail);
  processed.phoneHash = createHash(processed.normalizedPhone);

  // Extract and hash domain
  const domain = extractDomain(input.website || input.email);
  processed.domainHash = createHash(domain);

  // ============================================================================
  // EMAIL VALIDATION
  // ============================================================================

  const emailValidation = validateEmail(input.email);
  processed.emailValid = emailValidation.valid;
  processed.isDisposableEmail = emailValidation.isDisposable;
  processed.isGenericEmail = emailValidation.isGeneric;
  processed.emailValidatedAt = new Date();

  // ============================================================================
  // DOMAIN VALIDATION
  // ============================================================================

  if (domain) {
    processed.domainValid = isValidDomainFormat(domain);

    // Check if domain is active (async, may take time)
    // Only check for new businesses or if domain changed
    if (processed.domainValid) {
      try {
        processed.domainActive = await isDomainActive(domain);
      } catch {
        processed.domainActive = null;
      }
    } else {
      processed.domainActive = false;
    }

    processed.domainValidatedAt = new Date();
  } else {
    processed.domainValid = null;
    processed.domainActive = null;
  }

  // ============================================================================
  // DEDUPLICATION
  // ============================================================================

  const duplicationResult = await checkDuplicate({
    id: existingBusinessId,
    email: input.email,
    phone: input.phone,
    website: input.website,
    businessName: input.businessName,
    address: input.address,
  });

  processed.isDuplicate = duplicationResult.isDuplicate;
  processed.duplicateOfId = duplicationResult.duplicateOfId;

  // ============================================================================
  // SEGMENTATION
  // ============================================================================

  processed.serviceSegment = determineServiceSegment(input.businessType, input.industry);

  // ============================================================================
  // RELEVANCE SCORING
  // ============================================================================

  processed.relevanceScore = calculateRelevanceScore({
    email: input.email,
    phone: input.phone,
    website: input.website,
    industry: input.industry,
    businessType: input.businessType,
    emailValid: processed.emailValid,
    domainValid: processed.domainValid,
    isDisposableEmail: processed.isDisposableEmail,
    isGenericEmail: processed.isGenericEmail,
  });

  // ============================================================================
  // AUTO-PRIORITIZATION
  // ============================================================================

  // Determine lead priority based on relevance score and data quality
  if (processed.relevanceScore >= 80 && !processed.isDuplicate) {
    processed.leadPriority = 'high';
  } else if (processed.relevanceScore >= 60 && !processed.isDuplicate) {
    processed.leadPriority = 'medium';
  } else {
    processed.leadPriority = 'low';
  }

  // Mark duplicates as low priority
  if (processed.isDuplicate) {
    processed.leadPriority = 'low';
    processed.leadStatus = 'duplicate';
  } else {
    processed.leadStatus = 'new';
  }

  return processed as ProcessedBusiness;
}

/**
 * Create a business with automatic data quality processing
 */
export async function createProcessedBusiness(input: BusinessInput) {
  const processed = await processBusinessData(input);

  const business = await prisma.business.create({
    data: processed as any,
  });

  // If it's a high-priority lead, create an alert
  if (processed.leadPriority === 'high' && !processed.isDuplicate) {
    await createLeadAlert(business.id, 'high_priority_lead');
  }

  return business;
}

/**
 * Update a business with automatic data quality processing
 */
export async function updateProcessedBusiness(businessId: string, input: Partial<BusinessInput>) {
  const processed = await processBusinessData(input as BusinessInput, businessId);

  const business = await prisma.business.update({
    where: { id: businessId },
    data: processed as any,
  });

  // If priority changed to high, create an alert
  if (processed.leadPriority === 'high' && !processed.isDuplicate) {
    // Check if alert already exists
    const existingAlert = await prisma.leadAlert.findFirst({
      where: {
        businessId,
        alertType: 'high_priority_lead',
      },
    });

    if (!existingAlert) {
      await createLeadAlert(businessId, 'high_priority_lead');
    }
  }

  return business;
}

/**
 * Create a lead alert for Telegram/email notifications
 */
async function createLeadAlert(businessId: string, alertType: string) {
  const business = await prisma.business.findUnique({
    where: { id: businessId },
  });

  if (!business) return;

  let message = '';
  let priority = 'medium';

  switch (alertType) {
    case 'high_priority_lead':
      message = `🔥 High-Priority Lead: ${business.businessName}`;
      priority = 'high';
      break;
    case 'duplicate_detected':
      message = `⚠️ Duplicate Detected: ${business.businessName}`;
      priority = 'low';
      break;
    case 'invalid_data':
      message = `❌ Invalid Data: ${business.businessName}`;
      priority = 'medium';
      break;
  }

  await prisma.leadAlert.create({
    data: {
      businessId,
      alertType,
      priority,
      message,
    },
  });
}

/**
 * Batch process existing businesses for data quality
 */
export async function batchProcessBusinesses(batchSize: number = 50) {
  const businesses = await prisma.business.findMany({
    where: {
      OR: [
        { emailHash: null },
        { normalizedEmail: null },
        { relevanceScore: null },
      ],
    },
    take: batchSize,
  });

  const results = {
    processed: 0,
    errors: 0,
    highPriorityFound: 0,
    duplicatesFound: 0,
  };

  for (const business of businesses) {
    try {
      const processed = await processBusinessData(business, business.id);

      await prisma.business.update({
        where: { id: business.id },
        data: processed as any,
      });

      results.processed++;

      if (processed.leadPriority === 'high') {
        results.highPriorityFound++;
        await createLeadAlert(business.id, 'high_priority_lead');
      }

      if (processed.isDuplicate) {
        results.duplicatesFound++;
      }
    } catch (error) {
      console.error(`Error processing business ${business.id}:`, error);
      results.errors++;
    }
  }

  return results;
}
