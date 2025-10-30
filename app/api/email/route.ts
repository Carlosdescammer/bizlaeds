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
    const prompt = `Generate a professional, personalized cold email to ${business.businessName}, a ${business.businessType || 'business'} located at ${business.address || 'their location'}.

The email should:
- Introduce yourself as a professional photographer
- Mention you noticed their business and were impressed
- Offer to help them improve their online presence with high-quality photos
- Keep it concise (3-4 short paragraphs)
- Be friendly but professional
- Include a clear call-to-action to schedule a free consultation
- Don't be pushy or salesy

Business details:
- Name: ${business.businessName}
- Type: ${business.businessType || 'business'}
- Address: ${business.address || 'N/A'}

Return a JSON object with:
{
  "subject": "Email subject line",
  "body": "Full email body in plain text"
}`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: 'You are a professional business email writer. Generate personalized, effective cold outreach emails.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
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
