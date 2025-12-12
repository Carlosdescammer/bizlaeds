/**
 * Simple Lead Scoring and Insights
 * Provides basic scoring and recommendations for leads
 */

type Business = {
  email?: string | null;
  phone?: string | null;
  website?: string | null;
  googleRating?: number | null;
  googleReviewCount?: number | null;
  googlePlaceId?: string | null;
  hunterEnrichedAt?: string | null;
  emailValid?: boolean | null;
  createdAt?: string;
  leadStatus?: string | null;
  confidenceScore?: number | null;
  lastContactedAt?: string | null;
  nextFollowUpAt?: string | null;
};

/**
 * Calculate lead score (0-100)
 */
export function calculateLeadScore(business: Business): number {
  let score = 0;

  // Email (30 points)
  if (business.email && business.emailValid) {
    score += 30;
  } else if (business.email) {
    score += 15;
  }

  // Website (15 points)
  if (business.website) {
    score += 15;
  }

  // Phone (10 points)
  if (business.phone) {
    score += 10;
  }

  // Google rating (20 points)
  if (business.googleRating && business.googleRating > 0) {
    score += Math.round((business.googleRating / 5) * 20);
  }

  // Has location data (10 points)
  if (business.googlePlaceId) {
    score += 10;
  }

  // Recently added (5 points)
  if (business.createdAt) {
    const daysSinceCreated = (Date.now() - new Date(business.createdAt).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceCreated <= 7) {
      score += 5;
    }
  }

  // Enriched data (10 points)
  if (business.hunterEnrichedAt) {
    score += 10;
  }

  return Math.min(100, Math.round(score));
}

/**
 * Get timing recommendation for follow-up
 */
export function getTimingRecommendation(business: Business): {
  timing: string;
  urgency: 'high' | 'medium' | 'low';
  reason: string;
} {
  const score = calculateLeadScore(business);

  // Check if already contacted
  if (business.lastContactedAt) {
    const daysSinceContact = (Date.now() - new Date(business.lastContactedAt).getTime()) / (1000 * 60 * 60 * 24);

    if (daysSinceContact > 14) {
      return {
        timing: 'Follow up this week',
        urgency: 'medium',
        reason: `Last contacted ${Math.round(daysSinceContact)} days ago`
      };
    }

    if (business.nextFollowUpAt) {
      const daysUntilFollowUp = (new Date(business.nextFollowUpAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24);

      if (daysUntilFollowUp < 0) {
        return {
          timing: 'Follow up overdue',
          urgency: 'high',
          reason: 'Scheduled follow-up has passed'
        };
      }

      return {
        timing: `Follow up in ${Math.round(daysUntilFollowUp)} days`,
        urgency: 'low',
        reason: 'Follow-up scheduled'
      };
    }
  }

  // New lead - timing based on score
  if (score >= 80) {
    return {
      timing: 'Contact today',
      urgency: 'high',
      reason: 'High-quality lead with complete information'
    };
  }

  if (score >= 50) {
    return {
      timing: 'Contact within 2-3 days',
      urgency: 'medium',
      reason: 'Good lead with solid contact information'
    };
  }

  return {
    timing: 'Contact within a week',
    urgency: 'low',
    reason: 'Need to gather more information'
  };
}

/**
 * Generate business insights
 */
export function generateBusinessInsights(business: Business): string[] {
  const insights: string[] = [];

  // Rating insights
  if (business.googleRating) {
    if (business.googleRating >= 4.5) {
      insights.push(`Excellent reputation with ${business.googleRating}⭐ rating`);
    } else if (business.googleRating >= 4.0) {
      insights.push(`Good reputation with ${business.googleRating}⭐ rating`);
    } else if (business.googleRating < 3.0) {
      insights.push(`Lower rating (${business.googleRating}⭐) - might need reputation management`);
    }
  }

  // Review count insights
  if (business.googleReviewCount) {
    if (business.googleReviewCount > 100) {
      insights.push(`Well-established with ${business.googleReviewCount} reviews`);
    } else if (business.googleReviewCount > 20) {
      insights.push(`Growing presence with ${business.googleReviewCount} reviews`);
    } else if (business.googleReviewCount < 5) {
      insights.push(`New or small business with only ${business.googleReviewCount} reviews`);
    }
  }

  // Email validation insights
  if (business.emailValid === true) {
    insights.push('Verified email address - ready to contact');
  } else if (business.email && business.emailValid === false) {
    insights.push('Email may be invalid - verify before sending');
  }

  // Completeness insights
  const hasCompleteInfo = business.email && business.phone && business.website;
  if (hasCompleteInfo) {
    insights.push('Complete contact information available');
  } else {
    const missing: string[] = [];
    if (!business.email) missing.push('email');
    if (!business.phone) missing.push('phone');
    if (!business.website) missing.push('website');
    insights.push(`Missing: ${missing.join(', ')}`);
  }

  return insights;
}

/**
 * Get recommended actions
 */
export function getRecommendedActions(business: Business): string[] {
  const actions: string[] = [];
  const score = calculateLeadScore(business);

  // High-priority actions
  if (score >= 80 && !business.lastContactedAt) {
    actions.push('Send initial outreach email');
    actions.push('Add to high-priority follow-up list');
  }

  // Data enrichment actions
  if (!business.email) {
    actions.push('Find email address using Hunter.io');
  }

  if (!business.phone) {
    actions.push('Look up phone number via Google Business');
  }

  if (!business.website) {
    actions.push('Search for company website');
  }

  // Verification actions
  if (business.email && business.emailValid === null) {
    actions.push('Verify email address deliverability');
  }

  // Follow-up actions
  if (business.lastContactedAt && !business.nextFollowUpAt) {
    actions.push('Schedule follow-up date');
  }

  // Research actions
  if (!business.googleReviewCount) {
    actions.push('Research company reviews and reputation');
  }

  // Default action if none apply
  if (actions.length === 0) {
    actions.push('Review lead information and plan outreach');
  }

  return actions;
}

/**
 * Get talking points for outreach
 */
export function getTalkingPoints(business: Business): string[] {
  const points: string[] = [];

  // Rating-based talking points
  if (business.googleRating && business.googleRating >= 4.5) {
    points.push(`Noticed your excellent ${business.googleRating}⭐ rating`);
  }

  // Review-based talking points
  if (business.googleReviewCount && business.googleReviewCount > 50) {
    points.push(`Impressed by your ${business.googleReviewCount} customer reviews`);
  }

  // Location-based talking points
  if (business.googlePlaceId) {
    points.push('Local business serving the community');
  }

  // Generic talking points
  points.push('Would love to learn more about your business needs');
  points.push('Explore how we can help you grow');

  return points;
}
