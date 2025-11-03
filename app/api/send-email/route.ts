import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

// Create Gmail transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

/**
 * POST /api/send-email
 * Send an email directly (for compose page)
 */
export async function POST(request: NextRequest) {
  try {
    const { to, subject, body } = await request.json();

    // Validation
    if (!to || !subject || !body) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: to, subject, body' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(to)) {
      return NextResponse.json(
        { success: false, error: 'Invalid email address' },
        { status: 400 }
      );
    }

    // Check Gmail credentials
    if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
      return NextResponse.json(
        {
          success: false,
          error: 'Gmail credentials not configured. Please set GMAIL_USER and GMAIL_APP_PASSWORD in environment variables.',
        },
        { status: 500 }
      );
    }

    // Send email via Gmail
    await transporter.sendMail({
      from: `${process.env.BUSINESS_NAME || 'BizLeads'} <${process.env.GMAIL_USER}>`,
      to,
      subject,
      text: body,
      html: body.replace(/\n/g, '<br>'), // Simple HTML conversion
    });

    return NextResponse.json({
      success: true,
      message: 'Email sent successfully',
      sentTo: to,
      sentAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Send email error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to send email',
        message: error.message,
      },
      { status: 500 }
    );
  }
}
