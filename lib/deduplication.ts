// Deduplication logic for businesses
import { prisma } from '@/lib/db';
import { createHash, normalizeEmail, normalizePhone, extractDomain } from './data-quality';

export interface DeduplicationResult {
  isDuplicate: boolean;
  duplicateOfId: string | null;
  matchReason: string | null;
  confidence: number;
}

/**
 * Check if a business is a duplicate based on multiple factors
 */
export async function checkDuplicate(business: {
  email?: string | null;
  phone?: string | null;
  website?: string | null;
  businessName?: string | null;
  address?: string | null;
  id?: string; // Current business ID (to exclude from search)
}): Promise<DeduplicationResult> {
  const results: Array<{ id: string; reason: string; confidence: number }> = [];

  // 1. Check email hash match (highest confidence)
  if (business.email) {
    const normalizedEmail = normalizeEmail(business.email);
    const emailHash = createHash(normalizedEmail);

    if (emailHash) {
      const emailMatches = await prisma.business.findMany({
        where: {
          emailHash,
          id: business.id ? { not: business.id } : undefined,
        },
        select: { id: true },
      });

      emailMatches.forEach((match) => {
        results.push({
          id: match.id,
          reason: 'Email match',
          confidence: 95,
        });
      });
    }
  }

  // 2. Check phone hash match (high confidence)
  if (business.phone) {
    const normalizedPhone = normalizePhone(business.phone);
    const phoneHash = createHash(normalizedPhone);

    if (phoneHash) {
      const phoneMatches = await prisma.business.findMany({
        where: {
          phoneHash,
          id: business.id ? { not: business.id } : undefined,
        },
        select: { id: true },
      });

      phoneMatches.forEach((match) => {
        results.push({
          id: match.id,
          reason: 'Phone match',
          confidence: 90,
        });
      });
    }
  }

  // 3. Check domain hash match (medium confidence)
  if (business.website) {
    const domain = extractDomain(business.website);
    const domainHash = createHash(domain);

    if (domainHash) {
      const domainMatches = await prisma.business.findMany({
        where: {
          domainHash,
          id: business.id ? { not: business.id } : undefined,
        },
        select: { id: true },
      });

      domainMatches.forEach((match) => {
        results.push({
          id: match.id,
          reason: 'Domain match',
          confidence: 75,
        });
      });
    }
  }

  // 4. Check business name + address match (medium-low confidence)
  if (business.businessName && business.address) {
    const nameAddressMatches = await prisma.business.findMany({
      where: {
        businessName: business.businessName,
        address: business.address,
        id: business.id ? { not: business.id } : undefined,
      },
      select: { id: true },
    });

    nameAddressMatches.forEach((match) => {
      results.push({
        id: match.id,
        reason: 'Name and address match',
        confidence: 70,
      });
    });
  }

  // If no matches found
  if (results.length === 0) {
    return {
      isDuplicate: false,
      duplicateOfId: null,
      matchReason: null,
      confidence: 0,
    };
  }

  // Find the highest confidence match
  const bestMatch = results.reduce((best, current) => {
    return current.confidence > best.confidence ? current : best;
  });

  return {
    isDuplicate: bestMatch.confidence >= 70, // Threshold for considering it a duplicate
    duplicateOfId: bestMatch.id,
    matchReason: bestMatch.reason,
    confidence: bestMatch.confidence,
  };
}

/**
 * Process a business for deduplication
 * Updates the business record with deduplication info
 */
export async function processDuplication(businessId: string): Promise<DeduplicationResult> {
  const business = await prisma.business.findUnique({
    where: { id: businessId },
  });

  if (!business) {
    throw new Error('Business not found');
  }

  const result = await checkDuplicate({
    id: business.id,
    email: business.email,
    phone: business.phone,
    website: business.website,
    businessName: business.businessName,
    address: business.address,
  });

  // Update the business record
  await prisma.business.update({
    where: { id: businessId },
    data: {
      isDuplicate: result.isDuplicate,
      duplicateOfId: result.duplicateOfId,
    },
  });

  return result;
}

/**
 * Find and merge duplicate businesses
 * Keeps the oldest record and marks newer ones as duplicates
 */
export async function findAndMarkDuplicates(): Promise<{
  totalChecked: number;
  duplicatesFound: number;
  duplicateIds: string[];
}> {
  const allBusinesses = await prisma.business.findMany({
    select: {
      id: true,
      email: true,
      phone: true,
      website: true,
      businessName: true,
      address: true,
      createdAt: true,
    },
    orderBy: {
      createdAt: 'asc', // Oldest first
    },
  });

  const duplicateIds: string[] = [];
  const processedHashes = new Set<string>();

  for (const business of allBusinesses) {
    // Create a unique identifier for this business
    const identifiers = [
      business.email ? normalizeEmail(business.email) : null,
      business.phone ? normalizePhone(business.phone) : null,
      business.website ? extractDomain(business.website) : null,
    ].filter(Boolean);

    // Check if we've seen any of these identifiers before
    let isDupe = false;
    for (const identifier of identifiers) {
      if (identifier && processedHashes.has(identifier)) {
        isDupe = true;
        break;
      }
    }

    if (isDupe) {
      const result = await checkDuplicate(business);

      if (result.isDuplicate && result.duplicateOfId) {
        // Mark as duplicate
        await prisma.business.update({
          where: { id: business.id },
          data: {
            isDuplicate: true,
            duplicateOfId: result.duplicateOfId,
          },
        });

        duplicateIds.push(business.id);
      }
    } else {
      // Add identifiers to processed set
      identifiers.forEach((id) => id && processedHashes.add(id));
    }
  }

  return {
    totalChecked: allBusinesses.length,
    duplicatesFound: duplicateIds.length,
    duplicateIds,
  };
}
