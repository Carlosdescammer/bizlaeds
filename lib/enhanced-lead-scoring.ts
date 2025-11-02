// PHASE 3: Enhanced Lead Scoring with Hunter.io Enrichment Data
import { Business } from '@prisma/client';

export interface LeadScoreBreakdown {
  totalScore: number;
  maxScore: number;
  categories: {
    contactQuality: {
      score: number;
      maxScore: number;
      factors: string[];
    };
    emailQuality: {
      score: number;
      maxScore: number;
      factors: string[];
    };
    companyData: {
      score: number;
      maxScore: number;
      factors: string[];
    };
    enrichmentDepth: {
      score: number;
      maxScore: number;
      factors: string[];
    };
    industryRelevance: {
      score: number;
      maxScore: number;
      factors: string[];
    };
  };
  priority: 'high' | 'medium' | 'low';
  recommendations: string[];
}

/**
 * Calculate comprehensive lead score using Hunter enrichment data
 */
export function calculateEnhancedLeadScore(business: Partial<Business>): LeadScoreBreakdown {
  const breakdown: LeadScoreBreakdown = {
    totalScore: 0,
    maxScore: 100,
    categories: {
      contactQuality: { score: 0, maxScore: 25, factors: [] },
      emailQuality: { score: 0, maxScore: 25, factors: [] },
      companyData: { score: 0, maxScore: 20, factors: [] },
      enrichmentDepth: { score: 0, maxScore: 15, factors: [] },
      industryRelevance: { score: 0, maxScore: 15, factors: [] },
    },
    priority: 'low',
    recommendations: [],
  };

  // ========================================================================
  // 1. CONTACT QUALITY (25 points max)
  // ========================================================================

  // Email exists and verified (10 points)
  if (business.email) {
    breakdown.categories.contactQuality.score += 5;
    breakdown.categories.contactQuality.factors.push('Has email address (+5)');

    if (business.hunterVerificationStatus === 'valid') {
      breakdown.categories.contactQuality.score += 5;
      breakdown.categories.contactQuality.factors.push('Email verified as valid (+5)');
    } else if (business.hunterVerificationStatus) {
      breakdown.categories.contactQuality.score += 2;
      breakdown.categories.contactQuality.factors.push(
        `Email verification: ${business.hunterVerificationStatus} (+2)`
      );
    }
  } else {
    breakdown.recommendations.push('Find email address using Hunter Domain Search');
  }

  // Phone number (5 points)
  if (business.phone || business.contactPhoneNumber) {
    breakdown.categories.contactQuality.score += 5;
    breakdown.categories.contactQuality.factors.push('Has phone number (+5)');
  }

  // Contact person identified (5 points)
  if (business.contactName) {
    breakdown.categories.contactQuality.score += 3;
    breakdown.categories.contactQuality.factors.push('Contact person identified (+3)');

    // Bonus for position/title (2 points)
    if (business.contactPosition) {
      breakdown.categories.contactQuality.score += 2;
      breakdown.categories.contactQuality.factors.push(
        `Has job title: ${business.contactPosition} (+2)`
      );
    }
  } else if (business.email && business.hunterEmailCount && business.hunterEmailCount > 0) {
    breakdown.recommendations.push(
      'Use Hunter Email Finder to identify decision maker by name'
    );
  }

  // Seniority level (bonus for decision makers)
  if (business.contactSeniority) {
    const seniorityBonus =
      business.contactSeniority.toLowerCase().includes('executive') ||
      business.contactSeniority.toLowerCase().includes('director') ||
      business.contactSeniority.toLowerCase().includes('senior')
        ? 3
        : 1;
    breakdown.categories.contactQuality.score += seniorityBonus;
    breakdown.categories.contactQuality.factors.push(
      `Seniority: ${business.contactSeniority} (+${seniorityBonus})`
    );
  }

  // ========================================================================
  // 2. EMAIL QUALITY (25 points max)
  // ========================================================================

  if (business.email) {
    // Email confidence score (10 points)
    if (business.emailConfidence) {
      const confidencePoints = Math.round((business.emailConfidence / 100) * 10);
      breakdown.categories.emailQuality.score += confidencePoints;
      breakdown.categories.emailQuality.factors.push(
        `Email confidence: ${business.emailConfidence}% (+${confidencePoints})`
      );
    }

    // Email deliverability (10 points)
    if (business.emailDeliverability === 'deliverable') {
      breakdown.categories.emailQuality.score += 10;
      breakdown.categories.emailQuality.factors.push('Email is deliverable (+10)');
    } else if (business.emailDeliverability === 'risky') {
      breakdown.categories.emailQuality.score += 3;
      breakdown.categories.emailQuality.factors.push('Email is risky (+3)');
      breakdown.recommendations.push('Consider finding alternative contact email');
    } else if (business.emailDeliverability === 'undeliverable') {
      breakdown.categories.emailQuality.factors.push('Email is undeliverable (0)');
      breakdown.recommendations.push('Find new email address - current one is invalid');
    }

    // Not generic email (5 points)
    if (!business.isGenericEmail) {
      breakdown.categories.emailQuality.score += 5;
      breakdown.categories.emailQuality.factors.push('Direct contact email (+5)');
    } else {
      breakdown.categories.emailQuality.factors.push('Generic email address (0)');
      breakdown.recommendations.push('Find direct contact email for better response rates');
    }

    // Not disposable email (bonus)
    if (!business.isDisposableEmail) {
      // This is expected, no points
    } else {
      breakdown.recommendations.push('Disposable email - likely not a real lead');
    }
  } else {
    breakdown.recommendations.push('No email found - use Hunter Domain Search');
  }

  // ========================================================================
  // 3. COMPANY DATA (20 points max)
  // ========================================================================

  // Has website (5 points)
  if (business.website) {
    breakdown.categories.companyData.score += 5;
    breakdown.categories.companyData.factors.push('Has website (+5)');

    // Domain is valid (3 points)
    if (business.domainValid) {
      breakdown.categories.companyData.score += 3;
      breakdown.categories.companyData.factors.push('Domain is valid (+3)');
    }
  } else {
    breakdown.recommendations.push('Add company website for better enrichment');
  }

  // Company size (5 points)
  if (business.companySize) {
    breakdown.categories.companyData.score += 5;
    breakdown.categories.companyData.factors.push(`Company size: ${business.companySize} (+5)`);
  }

  // Social media presence (7 points total)
  let socialPoints = 0;
  if (business.linkedinUrl) {
    socialPoints += 4;
    breakdown.categories.companyData.factors.push('Has LinkedIn (+4)');
  }
  if (business.twitterHandle) {
    socialPoints += 2;
    breakdown.categories.companyData.factors.push('Has Twitter (+2)');
  }
  if (business.facebookUrl) {
    socialPoints += 1;
    breakdown.categories.companyData.factors.push('Has Facebook (+1)');
  }
  breakdown.categories.companyData.score += Math.min(socialPoints, 7);

  if (!business.linkedinUrl && business.website) {
    breakdown.recommendations.push('Enrich with LinkedIn company profile');
  }

  // ========================================================================
  // 4. ENRICHMENT DEPTH (15 points max)
  // ========================================================================

  // Hunter email count available (3 points)
  if (business.hunterEmailCount && business.hunterEmailCount > 0) {
    breakdown.categories.enrichmentDepth.score += 3;
    breakdown.categories.enrichmentDepth.factors.push(
      `${business.hunterEmailCount} emails available in Hunter (+3)`
    );

    if (business.hunterEmailCount >= 10) {
      breakdown.categories.enrichmentDepth.score += 2;
      breakdown.categories.enrichmentDepth.factors.push('Large team - more contacts available (+2)');
    }
  }

  // Has enrichment data (5 points)
  if (business.hunterEnrichedAt || business.enrichedAt) {
    breakdown.categories.enrichmentDepth.score += 5;
    breakdown.categories.enrichmentDepth.factors.push('Enriched with external data (+5)');
  } else if (business.website) {
    breakdown.recommendations.push('Run auto-enrichment to get more lead data');
  }

  // Contact details available (5 points)
  let contactDepth = 0;
  if (business.contactPosition) contactDepth++;
  if (business.contactSeniority) contactDepth++;
  if (business.contactDepartment) contactDepth++;
  if (business.contactLinkedin) contactDepth++;
  if (business.contactLocation) contactDepth++;

  if (contactDepth > 0) {
    breakdown.categories.enrichmentDepth.score += contactDepth;
    breakdown.categories.enrichmentDepth.factors.push(
      `${contactDepth} contact attributes known (+${contactDepth})`
    );
  }

  // Recently enriched (2 point bonus for fresh data)
  if (business.hunterEnrichedAt) {
    const daysSinceEnrichment =
      (Date.now() - new Date(business.hunterEnrichedAt).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceEnrichment < 7) {
      breakdown.categories.enrichmentDepth.score += 2;
      breakdown.categories.enrichmentDepth.factors.push('Recently enriched - data is fresh (+2)');
    } else if (daysSinceEnrichment > 90) {
      breakdown.recommendations.push('Data is stale - consider re-enriching');
    }
  }

  // ========================================================================
  // 5. INDUSTRY RELEVANCE (15 points max)
  // ========================================================================

  // Photography-relevant industries
  const highValueIndustries = ['medical', 'healthcare', 'legal', 'law', 'real estate', 'corporate'];
  const relevantIndustries = [
    'education',
    'entertainment',
    'events',
    'hospitality',
    'restaurant',
    'retail',
    'fashion',
    'beauty',
    'fitness',
    'marketing',
    'technology',
  ];

  if (business.industry) {
    const industryLower = business.industry.toLowerCase();

    if (highValueIndustries.some((ind) => industryLower.includes(ind))) {
      breakdown.categories.industryRelevance.score += 15;
      breakdown.categories.industryRelevance.factors.push(
        `High-value industry: ${business.industry} (+15)`
      );
    } else if (relevantIndustries.some((ind) => industryLower.includes(ind))) {
      breakdown.categories.industryRelevance.score += 10;
      breakdown.categories.industryRelevance.factors.push(
        `Relevant industry: ${business.industry} (+10)`
      );
    } else {
      breakdown.categories.industryRelevance.score += 5;
      breakdown.categories.industryRelevance.factors.push(`Industry: ${business.industry} (+5)`);
    }
  } else {
    breakdown.categories.industryRelevance.factors.push('Industry unknown (0)');
    breakdown.recommendations.push('Classify business industry for better targeting');
  }

  // Geographic location (bonus for local)
  if (business.city || business.state) {
    breakdown.categories.industryRelevance.score += 5;
    const location = [business.city, business.state].filter(Boolean).join(', ');
    breakdown.categories.industryRelevance.factors.push(`Location: ${location} (+5)`);
  }

  // ========================================================================
  // CALCULATE TOTALS
  // ========================================================================

  breakdown.totalScore =
    breakdown.categories.contactQuality.score +
    breakdown.categories.emailQuality.score +
    breakdown.categories.companyData.score +
    breakdown.categories.enrichmentDepth.score +
    breakdown.categories.industryRelevance.score;

  // Determine priority
  if (breakdown.totalScore >= 75) {
    breakdown.priority = 'high';
  } else if (breakdown.totalScore >= 50) {
    breakdown.priority = 'medium';
  } else {
    breakdown.priority = 'low';
  }

  // Cap scores at their max values
  Object.keys(breakdown.categories).forEach((key) => {
    const category = breakdown.categories[key as keyof typeof breakdown.categories];
    if (category.score > category.maxScore) {
      category.score = category.maxScore;
    }
  });

  return breakdown;
}

/**
 * Get lead quality label
 */
export function getLeadQualityLabel(score: number): {
  label: string;
  color: string;
  description: string;
} {
  if (score >= 85) {
    return {
      label: 'Excellent',
      color: 'green',
      description: 'Hot lead - high-quality contact with verified details',
    };
  } else if (score >= 70) {
    return {
      label: 'Good',
      color: 'blue',
      description: 'Qualified lead - good data quality, worth pursuing',
    };
  } else if (score >= 50) {
    return {
      label: 'Fair',
      color: 'yellow',
      description: 'Potential lead - needs more enrichment',
    };
  } else if (score >= 30) {
    return {
      label: 'Poor',
      color: 'orange',
      description: 'Weak lead - missing key information',
    };
  } else {
    return {
      label: 'Very Poor',
      color: 'red',
      description: 'Low quality - needs significant enrichment',
    };
  }
}
