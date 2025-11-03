// Telegram alert system for high-priority leads
import axios from 'axios';
import { prisma } from '@/lib/db';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_USER_ID = process.env.TELEGRAM_USER_ID;

export interface TelegramAlertOptions {
  businessId: string;
  alertType: 'high_priority' | 'duplicate' | 'invalid_data' | 'enriched' | 'contact_ready';
  customMessage?: string;
}

/**
 * Send a Telegram alert for a business lead
 */
export async function sendLeadAlert(options: TelegramAlertOptions): Promise<boolean> {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_USER_ID) {
    console.warn('Telegram credentials not configured');
    return false;
  }

  let message = '';
  try {
    const business = await prisma.business.findUnique({
      where: { id: options.businessId },
    });

    if (!business) {
      console.error('Business not found:', options.businessId);
      return false;
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const businessUrl = `${appUrl}/leads/${business.id}`;
    message = formatAlertMessage(business, options.alertType, options.customMessage);

    // Create inline keyboard with action buttons
    // Note: Telegram requires HTTPS URLs for inline keyboard buttons (no localhost)
    const isProduction = appUrl.startsWith('https://');
    const inlineKeyboard = {
      inline_keyboard: [
        [
          { text: '✅ Approve', callback_data: `approve_${business.id}` },
          { text: '❌ Reject', callback_data: `reject_${business.id}` },
        ],
        [
          { text: '📧 Send Email', callback_data: `email_${business.id}` },
          // Only add URL button in production (Telegram doesn't allow localhost URLs)
          ...(isProduction ? [{ text: '🔗 View Details', url: businessUrl }] : []),
        ],
      ],
    };

    const response = await axios.post(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        chat_id: TELEGRAM_USER_ID,
        text: message,
        parse_mode: 'HTML',
        disable_web_page_preview: false,
        reply_markup: inlineKeyboard,
      }
    );

    // Update lead alert record
    await prisma.leadAlert.updateMany({
      where: {
        businessId: options.businessId,
        telegramSent: false,
      },
      data: {
        telegramSent: true,
        telegramSentAt: new Date(),
      },
    });

    return response.data.ok;
  } catch (error: any) {
    console.error('Failed to send Telegram alert:', error);
    if (error.response) {
      console.error('Telegram API error details:', {
        status: error.response.status,
        data: error.response.data,
        message: message,
      });
    }
    return false;
  }
}

/**
 * Escape HTML special characters for Telegram
 */
function escapeHtml(text: string | null | undefined): string {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Format alert message based on type
 */
function formatAlertMessage(
  business: any,
  alertType: string,
  customMessage?: string
): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const businessUrl = `${appUrl}/leads/${business.id}`;

  let emoji = '📢';
  let title = 'Lead Alert';
  let details = '';

  switch (alertType) {
    case 'high_priority':
      emoji = '🔥';
      title = 'HIGH-PRIORITY LEAD';
      details = `
<b>Relevance Score:</b> ${business.relevanceScore || 'N/A'}/100
<b>Lead Priority:</b> ${(business.leadPriority || 'medium').toUpperCase()}
<b>Service Segment:</b> ${escapeHtml(business.serviceSegment) || 'Not classified'}
`;
      break;

    case 'duplicate':
      emoji = '⚠️';
      title = 'Duplicate Detected';
      details = `
<b>Status:</b> Marked as duplicate
<b>May be duplicate of:</b> ID ${escapeHtml(business.duplicateOfId) || 'Unknown'}
`;
      break;

    case 'invalid_data':
      emoji = '❌';
      title = 'Data Quality Issue';
      details = `
<b>Email Valid:</b> ${business.emailValid ? 'Yes' : 'No'}
<b>Domain Valid:</b> ${business.domainValid ? 'Yes' : 'No'}
<b>Is Disposable Email:</b> ${business.isDisposableEmail ? 'Yes' : 'No'}
`;
      break;

    case 'enriched':
      emoji = '✨';
      title = 'Lead Enriched';
      details = `
<b>Enriched by:</b> ${escapeHtml(business.enrichedByService) || 'Google Places'}
<b>Company Size:</b> ${escapeHtml(business.companySize) || 'Unknown'}
<b>Industry:</b> ${escapeHtml(business.industry) || 'Unknown'}
`;
      break;

    case 'contact_ready':
      emoji = '✅';
      title = 'Ready to Contact';
      details = `
<b>All contact methods verified</b>
<b>Email:</b> ${business.email ? 'Valid ✓' : 'Missing'}
<b>Phone:</b> ${business.phone ? 'Valid ✓' : 'Missing'}
<b>Website:</b> ${business.website ? 'Active ✓' : 'Missing'}
`;
      break;
  }

  const contactInfo = [];
  if (business.email) contactInfo.push(`📧 ${escapeHtml(business.email)}`);
  if (business.phone) contactInfo.push(`📞 ${escapeHtml(business.phone)}`);
  if (business.website) contactInfo.push(`🌐 ${escapeHtml(business.website)}`);

  const locationInfo = [];
  if (business.city) locationInfo.push(escapeHtml(business.city));
  if (business.state) locationInfo.push(escapeHtml(business.state));

  const message = `
${emoji} <b>${title}</b>

<b>Business:</b> ${escapeHtml(business.businessName)}
<b>Type:</b> ${escapeHtml(business.businessType) || 'Unknown'}
<b>Industry:</b> ${escapeHtml(business.industry) || 'Not specified'}
${locationInfo.length > 0 ? `<b>Location:</b> ${locationInfo.join(', ')}` : ''}

${details}

${contactInfo.length > 0 ? '<b>Contact:</b>\n' + contactInfo.join('\n') : ''}

${customMessage ? `\n<i>${escapeHtml(customMessage)}</i>\n` : ''}

<a href="${businessUrl}">View Full Details →</a>
  `.trim();

  return message;
}

/**
 * Send batch summary of leads
 */
export async function sendDailySummary(): Promise<boolean> {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_USER_ID) {
    return false;
  }

  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const stats = await prisma.business.groupBy({
      by: ['leadPriority'],
      where: {
        createdAt: {
          gte: today,
        },
      },
      _count: true,
    });

    const highPriorityCount = stats.find((s) => s.leadPriority === 'high')?._count || 0;
    const mediumPriorityCount = stats.find((s) => s.leadPriority === 'medium')?._count || 0;
    const lowPriorityCount = stats.find((s) => s.leadPriority === 'low')?._count || 0;
    const totalCount = highPriorityCount + mediumPriorityCount + lowPriorityCount;

    // Get high-priority leads for today
    const highPriorityLeads = await prisma.business.findMany({
      where: {
        leadPriority: 'high',
        createdAt: {
          gte: today,
        },
        isDuplicate: false,
      },
      take: 5,
      orderBy: {
        relevanceScore: 'desc',
      },
    });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    let message = `
📊 <b>Daily Lead Summary</b>

<b>Total New Leads:</b> ${totalCount}
🔥 High Priority: ${highPriorityCount}
🟡 Medium Priority: ${mediumPriorityCount}
🔵 Low Priority: ${lowPriorityCount}
`;

    if (highPriorityLeads.length > 0) {
      message += `\n\n<b>Top ${highPriorityLeads.length} High-Priority Leads:</b>\n`;

      highPriorityLeads.forEach((lead, index) => {
        message += `
${index + 1}. <b>${lead.businessName}</b>
   ${lead.businessType || 'Unknown type'} | Score: ${lead.relevanceScore}/100
   <a href="${appUrl}/leads/${lead.id}">View →</a>
`;
      });
    }

    message += `\n\n<a href="${appUrl}/leads">View All Leads →</a>`;

    await axios.post(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      chat_id: TELEGRAM_USER_ID,
      text: message.trim(),
      parse_mode: 'HTML',
      disable_web_page_preview: true,
    });

    return true;
  } catch (error) {
    console.error('Failed to send daily summary:', error);
    return false;
  }
}

/**
 * Process pending alerts and send them
 */
export async function processPendingAlerts(): Promise<number> {
  const pendingAlerts = await prisma.leadAlert.findMany({
    where: {
      telegramSent: false,
      priority: {
        in: ['high', 'medium'],
      },
    },
    include: {
      business: true,
    },
    take: 10, // Process max 10 at a time
  });

  let sentCount = 0;

  for (const alert of pendingAlerts) {
    const alertType = alert.alertType.includes('high_priority')
      ? 'high_priority'
      : alert.alertType.includes('duplicate')
      ? 'duplicate'
      : alert.alertType.includes('enriched')
      ? 'enriched'
      : 'contact_ready';

    const success = await sendLeadAlert({
      businessId: alert.businessId,
      alertType: alertType as any,
      customMessage: alert.message,
    });

    if (success) {
      sentCount++;
      // Small delay to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  return sentCount;
}

/**
 * Send alert when a lead becomes contact-ready (all validation passed)
 */
export async function sendContactReadyAlert(businessId: string): Promise<boolean> {
  const business = await prisma.business.findUnique({
    where: { id: businessId },
  });

  if (!business) return false;

  // Check if business is contact-ready
  const isContactReady =
    business.emailValid &&
    business.phone &&
    business.domainValid &&
    !business.isDisposableEmail &&
    !business.isDuplicate;

  if (!isContactReady) return false;

  return await sendLeadAlert({
    businessId,
    alertType: 'contact_ready',
  });
}
