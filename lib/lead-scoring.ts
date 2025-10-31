// Lead scoring and intelligence utilities

export interface LeadScore {
  total: number;
  level: 'hot' | 'warm' | 'cold';
  color: string;
  label: string;
  breakdown: {
    hasEmail: number;
    hasPhone: number;
    hasWebsite: number;
    hasGoodRating: number;
    hasManyReviews: number;
    hasBusinessHours: number;
    isCurrentlyOpen: number;
    hasPhotos: number;
  };
}

export interface TimingRecommendation {
  status: 'open' | 'closed' | 'unknown';
  statusColor: string;
  message: string;
  bestCallTime?: string;
  nextOpenTime?: string;
}

export interface BusinessInsight {
  icon: string;
  text: string;
  type: 'positive' | 'neutral' | 'negative';
}

export function calculateLeadScore(business: any): LeadScore {
  const rating = business.googleRating ? Number(business.googleRating) : 0;

  const breakdown = {
    hasEmail: business.email ? 20 : 0,
    hasPhone: business.phone ? 20 : 0,
    hasWebsite: business.website ? 15 : 0,
    hasGoodRating: (rating && rating >= 4.0) ? 15 : 0,
    hasManyReviews: (business.googleReviewCount && business.googleReviewCount > 10) ? 10 : 0,
    hasBusinessHours: business.googleBusinessHours ? 10 : 0,
    isCurrentlyOpen: business.googleBusinessHours?.open_now ? 5 : 0,
    hasPhotos: business.googlePhotosData ? 5 : 0,
  };

  const total = Object.values(breakdown).reduce((sum, val) => sum + val, 0);

  let level: 'hot' | 'warm' | 'cold';
  let color: string;
  let label: string;

  if (total >= 80) {
    level = 'hot';
    color = 'text-red-600 bg-red-50 border-red-200';
    label = 'Hot Lead';
  } else if (total >= 60) {
    level = 'warm';
    color = 'text-orange-600 bg-orange-50 border-orange-200';
    label = 'Warm Lead';
  } else {
    level = 'cold';
    color = 'text-blue-600 bg-blue-50 border-blue-200';
    label = 'Cold Lead';
  }

  return { total, level, color, label, breakdown };
}

export function getTimingRecommendation(business: any): TimingRecommendation {
  if (!business.googleBusinessHours) {
    return {
      status: 'unknown',
      statusColor: 'text-gray-600',
      message: 'Business hours unknown',
    };
  }

  const isOpen = business.googleBusinessHours.open_now;
  const hours = business.googleBusinessHours.weekday_text;

  if (isOpen) {
    // Find closing time today
    const today = new Date().getDay();
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const todayName = days[today];
    const todayHours = hours?.find((h: string) => h.startsWith(todayName));

    let closingTime = '';
    if (todayHours) {
      const match = todayHours.match(/–\s*(.+?)$/);
      if (match) closingTime = match[1];
    }

    return {
      status: 'open',
      statusColor: 'text-green-600',
      message: closingTime ? `Open Now - Closes at ${closingTime}` : 'Open Now',
      bestCallTime: 'Now is a good time to call!',
    };
  } else {
    // Find next opening time
    return {
      status: 'closed',
      statusColor: 'text-red-600',
      message: 'Currently Closed',
      nextOpenTime: 'Check business hours below for next opening',
    };
  }
}

export function generateBusinessInsights(business: any): BusinessInsight[] {
  const insights: BusinessInsight[] = [];

  // Rating insights
  if (business.googleRating) {
    const rating = Number(business.googleRating);
    if (rating >= 4.5) {
      insights.push({
        icon: '⭐',
        text: `Excellent ${rating.toFixed(1)}-star rating suggests high quality service`,
        type: 'positive',
      });
    } else if (rating >= 4.0) {
      insights.push({
        icon: '⭐',
        text: `Good ${rating.toFixed(1)}-star rating indicates reliable service`,
        type: 'positive',
      });
    } else if (rating < 3.5) {
      insights.push({
        icon: '⚠️',
        text: `Lower rating (${rating.toFixed(1)}) may indicate service issues`,
        type: 'negative',
      });
    }
  }

  // Review count insights
  if (business.googleReviewCount) {
    if (business.googleReviewCount > 50) {
      insights.push({
        icon: '💬',
        text: `${business.googleReviewCount} reviews indicate established, active business`,
        type: 'positive',
      });
    } else if (business.googleReviewCount > 10) {
      insights.push({
        icon: '💬',
        text: `${business.googleReviewCount} reviews show moderate customer engagement`,
        type: 'neutral',
      });
    }
  }

  // Business hours insights
  if (business.googleBusinessHours?.weekday_text) {
    const hours = business.googleBusinessHours.weekday_text;
    const openDays = hours.filter((h: string) => !h.includes('Closed')).length;

    if (openDays >= 6) {
      insights.push({
        icon: '📅',
        text: `Open ${openDays} days/week - highly accessible to customers`,
        type: 'positive',
      });
    } else if (openDays <= 3) {
      insights.push({
        icon: '📅',
        text: `Limited hours (${openDays} days/week) - may be harder to reach`,
        type: 'neutral',
      });
    }
  }

  // Price level insights
  if (business.googlePriceLevel) {
    const priceLabels = ['Budget', 'Budget-Friendly', 'Mid-Range', 'Premium', 'Luxury'];
    const label = priceLabels[business.googlePriceLevel - 1] || 'Unknown';
    insights.push({
      icon: '💰',
      text: `${label} pricing - ${business.googlePriceLevel <= 2 ? 'price-conscious' : 'quality-focused'} clientele`,
      type: 'neutral',
    });
  }

  // Contact completeness
  const contactMethods = [
    business.phone ? 'phone' : null,
    business.email ? 'email' : null,
    business.website ? 'website' : null,
  ].filter(Boolean);

  if (contactMethods.length === 3) {
    insights.push({
      icon: '📞',
      text: 'All contact methods available - easy to reach',
      type: 'positive',
    });
  } else if (contactMethods.length === 0) {
    insights.push({
      icon: '❌',
      text: 'No contact information - needs enrichment',
      type: 'negative',
    });
  }

  // Location insights
  if (business.address && business.address.includes('Suite')) {
    insights.push({
      icon: '🏢',
      text: 'Suite location suggests professional office space',
      type: 'neutral',
    });
  }

  // Photos insight
  if (business.googlePhotosData && Array.isArray(business.googlePhotosData)) {
    insights.push({
      icon: '📸',
      text: `${business.googlePhotosData.length} professional photos show active online presence`,
      type: 'positive',
    });
  }

  return insights;
}

export function getRecommendedActions(business: any, timing: TimingRecommendation): string[] {
  const actions: string[] = [];

  // Timing-based actions
  if (timing.status === 'open') {
    actions.push('☎️ Call now while they\'re open');
  } else {
    actions.push('📧 Send email to review when they open');
  }

  // Contact-based actions
  if (business.email) {
    actions.push(`📧 Email ${business.email.split('@')[0]}@... (likely decision-maker)`);
  }

  if (business.website) {
    actions.push('🌐 Visit website for additional contact info');
  }

  // Rating-based actions
  if (business.googleRating && business.googleRating >= 4.5) {
    actions.push('⭐ Reference their excellent rating in outreach');
  }

  // Enrichment actions
  if (!business.email && business.website) {
    actions.push('🔍 Use Hunter.io to find email addresses');
  }

  if (!business.googleEnrichedAt || !business.googleRating) {
    actions.push('🔄 Enrich with Google Places for more data');
  }

  return actions.slice(0, 5); // Limit to top 5 actions
}

export function getTalkingPoints(business: any): string[] {
  const points: string[] = [];

  if (business.googleRating) {
    const rating = Number(business.googleRating);
    if (rating >= 4.0) {
      points.push(`"Noticed your ${rating.toFixed(1)}-star rating - clearly your customers value your service"`);
    }
  }

  if (business.address) {
    const area = business.city || business.address.split(',')[1]?.trim() || 'the area';
    points.push(`"I work with businesses in ${area}"`);
  }

  if (business.googlePhotosData && business.googlePhotosData.length > 5) {
    points.push('"Your professional online presence caught my attention"');
  }

  if (business.businessType) {
    points.push(`"I specialize in helping ${business.businessType.toLowerCase()} businesses"`);
  }

  return points;
}
