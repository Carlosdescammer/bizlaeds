import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import nodemailer from 'nodemailer';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Create Gmail transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

// Generate email content using AI
async function generateEmailContent(business: any) {
  try {
    // Load all customizable variables from environment
    const photographerName = process.env.PHOTOGRAPHER_NAME || 'Professional Photographer';
    const businessName = process.env.BUSINESS_NAME || 'Our Photography Studio';
    const bookingUrl = process.env.BOOKING_URL || 'https://calendly.com/yourname/consultation';

    // Email template variables
    const serviceName = process.env.EMAIL_SERVICE_NAME || 'professional headshot photography';
    const serviceType = process.env.EMAIL_SERVICE_TYPE || 'business portraits';
    const benefits = process.env.EMAIL_BENEFITS || 'increased LinkedIn engagement, better first impressions, professional branding consistency';
    const usp = process.env.EMAIL_USP || 'specialize in corporate headshots, quick turnaround time';
    const cta = process.env.EMAIL_CTA || 'Book a free consultation to discuss how professional headshots can help your business';
    const tone = process.env.EMAIL_TONE || 'warm and professional';
    const maxWords = process.env.EMAIL_MAX_WORDS || '150';

    const prompt = `Generate a professional, personalized cold email to ${business.businessName}, a ${business.businessType || 'business'} located at ${business.city || business.address || 'their location'}.

PHOTOGRAPHER/BUSINESS INFO:
- Name: ${photographerName}
- Business: ${businessName}
- Service: ${serviceName}
- Specialization: ${serviceType}

EMAIL REQUIREMENTS:
- Introduce yourself as ${photographerName} from ${businessName}
- Mention you noticed their business ${business.googleRating ? `and saw they have great ${business.googleRating}-star reviews` : 'in the area'}
- Explain how your service (${serviceName}) can help their business
- Mention these specific benefits: ${benefits}
- Highlight your unique value: ${usp}
- Keep it concise (3-4 short paragraphs, max ${maxWords} words total)
- Use a ${tone} tone (not salesy or pushy)
- End with this call-to-action: "${cta}"
- IMPORTANT: Include the booking link at the end: ${bookingUrl}

BUSINESS DETAILS:
- Name: ${business.businessName}
- Type: ${business.businessType || 'business'}
- Location: ${business.city || business.address || 'the area'}
${business.googleRating ? `- Rating: ${business.googleRating} stars with ${business.googleReviewCount || 0} reviews` : ''}
${business.website ? `- Website: ${business.website}` : ''}

Return a JSON object with:
{
  "subject": "Email subject line (personalized with their business name or service benefit)",
  "body": "Full email body in plain text with booking link included at the end"
}`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o', // Updated to latest model
      messages: [
        {
          role: 'system',
          content: 'You are an expert at writing warm, personalized cold outreach emails for professional headshot photographers. Your emails are conversational, concise, and focus on building relationships rather than hard selling. You understand that professional headshots help businesses build trust and credibility with their clients.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.8,
    });

    const emailContent = JSON.parse(response.choices[0]?.message?.content || '{}');

    // Log OpenAI usage
    await prisma.apiUsageLog.create({
      data: {
        service: 'openai',
        businessId: business.id,
        requestType: 'email_generation',
        success: true,
        estimatedCost: 0.015, // GPT-4 Turbo cost estimate
      },
    });

    // Update monthly usage
    const month = new Date().toISOString().slice(0, 7);
    await prisma.apiUsage.upsert({
      where: {
        month_service: {
          month,
          service: 'openai',
        },
      },
      update: {
        requestsCount: { increment: 1 },
        estimatedCost: { increment: 0.015 },
      },
      create: {
        month,
        service: 'openai',
        requestsCount: 1,
        estimatedCost: 0.015,
      },
    });

    return emailContent;
  } catch (error: any) {
    console.error('Email generation error:', error);

    await prisma.apiUsageLog.create({
      data: {
        service: 'openai',
        businessId: business.id,
        requestType: 'email_generation',
        success: false,
        estimatedCost: 0,
        errorMessage: error.message,
      },
    });

    throw error;
  }
}

// POST - Generate email draft
export async function POST(request: NextRequest) {
  try {
    const { businessId, action } = await request.json();

    if (!businessId) {
      return NextResponse.json(
        { error: 'Business ID is required' },
        { status: 400 }
      );
    }

    const business = await prisma.business.findUnique({
      where: { id: businessId },
    });

    if (!business) {
      return NextResponse.json(
        { error: 'Business not found' },
        { status: 404 }
      );
    }

    if (action === 'generate') {
      // Generate email draft
      const emailContent = await generateEmailContent(business);

      // Create draft email campaign
      const campaign = await prisma.emailCampaign.create({
        data: {
          businessId: business.id,
          subject: emailContent.subject,
          body: emailContent.body,
        },
      });

      await prisma.activityLog.create({
        data: {
          businessId: business.id,
          action: 'email_generated',
          details: {
            campaignId: campaign.id,
            subject: emailContent.subject,
          },
        },
      });

      return NextResponse.json({
        success: true,
        campaign: {
          id: campaign.id,
          subject: campaign.subject,
          body: campaign.body,
          recipient: business.email,
        },
      });
    }

    if (action === 'send') {
      // Send email
      if (!business.email) {
        return NextResponse.json(
          { error: 'Business has no email address' },
          { status: 400 }
        );
      }

      // Get or create campaign
      const { campaignId, subject, body } = await request.json();

      let campaign;
      if (campaignId) {
        campaign = await prisma.emailCampaign.findUnique({
          where: { id: campaignId },
        });
      }

      if (!campaign) {
        // Generate new email if no campaign exists
        const emailContent = subject && body
          ? { subject, body }
          : await generateEmailContent(business);

        campaign = await prisma.emailCampaign.create({
          data: {
            businessId: business.id,
            subject: emailContent.subject,
            body: emailContent.body,
          },
        });
      }

      // Send email via Gmail
      try {
        await transporter.sendMail({
          from: process.env.GMAIL_USER,
          to: business.email,
          subject: campaign.subject || subject,
          text: campaign.body || body,
        });

        // Update campaign status
        await prisma.emailCampaign.update({
          where: { id: campaign.id },
          data: {
            sent: true,
            sentAt: new Date(),
          },
        });

        await prisma.activityLog.create({
          data: {
            businessId: business.id,
            action: 'email_sent',
            details: {
              campaignId: campaign.id,
              recipient: business.email,
            },
          },
        });

        return NextResponse.json({
          success: true,
          message: 'Email sent successfully',
          campaign: {
            id: campaign.id,
            sent: true,
            sentAt: new Date(),
          },
        });
      } catch (error: any) {
        console.error('Email send error:', error);

        return NextResponse.json(
          { error: 'Failed to send email', message: error.message },
          { status: 500 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Invalid action. Use "generate" or "send"' },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('Email API error:', error);
    return NextResponse.json(
      { error: 'Email operation failed', message: error.message },
      { status: 500 }
    );
  }
}

// GET - Get email campaigns for a business
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get('businessId');
    const status = searchParams.get('status');

    const where: any = {};
    if (businessId) where.businessId = businessId;
    if (status === 'sent') where.sent = true;
    if (status === 'draft') where.sent = false;

    const campaigns = await prisma.emailCampaign.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        business: {
          select: {
            id: true,
            businessName: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json({ campaigns });
  } catch (error: any) {
    console.error('Get campaigns error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch campaigns', message: error.message },
      { status: 500 }
    );
  }
}
