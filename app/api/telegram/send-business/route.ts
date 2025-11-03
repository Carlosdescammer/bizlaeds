import { NextRequest, NextResponse } from 'next/server';
import { sendLeadAlert } from '@/lib/telegram-alerts';

export async function POST(request: NextRequest) {
  try {
    const { businessId, alertType = 'contact_ready' } = await request.json();

    if (!businessId) {
      return NextResponse.json(
        { success: false, error: 'Business ID is required' },
        { status: 400 }
      );
    }

    // Validate alert type
    const validAlertTypes = ['high_priority', 'duplicate', 'invalid_data', 'enriched', 'contact_ready'];
    if (!validAlertTypes.includes(alertType)) {
      return NextResponse.json(
        { success: false, error: 'Invalid alert type' },
        { status: 400 }
      );
    }

    // Send Telegram alert
    const success = await sendLeadAlert({
      businessId,
      alertType,
    });

    if (!success) {
      return NextResponse.json(
        { success: false, error: 'Failed to send Telegram message' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Business information sent to Telegram successfully',
    });
  } catch (error: any) {
    console.error('Telegram send error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
