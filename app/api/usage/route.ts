import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// Free tier limits
const LIMITS = {
  openai: {
    monthly_budget: 5.0, // $5/month free tier
    warning_threshold: 0.8, // 80%
    critical_threshold: 0.94, // 94%
  },
  google_maps: {
    monthly_requests: 200, // Free tier
    warning_threshold: 0.8,
    critical_threshold: 0.94,
  },
  google_vision_ocr: {
    monthly_requests: 1000, // First 1000 images/month free
    warning_threshold: 0.8,
    critical_threshold: 0.94,
  },
  hunter_io: {
    monthly_credits: 50, // Free tier credits (not requests!)
    warning_threshold: 0.8,
    critical_threshold: 0.94,
  },
  linkedin_realtime_api: {
    monthly_budget: 10.0, // RapidAPI subscription
    warning_threshold: 0.8,
    critical_threshold: 0.94,
  },
  linkedin_fresh_api: {
    monthly_budget: 10.0, // RapidAPI subscription
    warning_threshold: 0.8,
    critical_threshold: 0.94,
  },
};

// Calculate usage percentage and status
function calculateUsageStatus(service: string, usage: any) {
  const limits = LIMITS[service as keyof typeof LIMITS];
  if (!limits) return { percentage: 0, status: 'unknown', limit: 0 };

  let percentage = 0;
  let limit = 0;

  if ('monthly_budget' in limits) {
    // Cost-based (OpenAI, LinkedIn APIs)
    percentage = (usage.estimatedCost || 0) / limits.monthly_budget;
    limit = limits.monthly_budget;
  } else if ('monthly_credits' in limits) {
    // Credit-based (Hunter.io)
    percentage = (usage.estimatedCost || 0) / limits.monthly_credits;
    limit = limits.monthly_credits;
  } else if ('monthly_requests' in limits) {
    // Request-based (Google Maps, Vision)
    percentage = (usage.requestsCount || 0) / limits.monthly_requests;
    limit = limits.monthly_requests;
  }

  let status = 'ok';
  if (percentage >= limits.critical_threshold) {
    status = 'critical';
  } else if (percentage >= limits.warning_threshold) {
    status = 'warning';
  }

  return {
    percentage: Math.min(percentage * 100, 100),
    status,
    limit,
  };
}

// GET - Get usage statistics
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month') || new Date().toISOString().slice(0, 7);

    // Get current month usage for all services
    const usageData = await prisma.apiUsage.findMany({
      where: { month },
    });

    // Get recent alerts
    const alerts = await prisma.usageAlert.findMany({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    // Get usage logs for the month
    const logs = await prisma.apiUsageLog.findMany({
      where: {
        createdAt: {
          gte: new Date(`${month}-01`),
          lt: new Date(new Date(`${month}-01`).setMonth(new Date(`${month}-01`).getMonth() + 1)),
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        business: {
          select: {
            id: true,
            businessName: true,
          },
        },
      },
    });

    // Calculate status for each service
    const services = [
      'openai',
      'google_maps',
      'google_vision_ocr',
      'hunter_io',
      'linkedin_realtime_api',
      'linkedin_fresh_api',
    ];
    const usageStats = services.map((service) => {
      const usage = usageData.find((u) => u.service === service) || {
        requestsCount: 0,
        estimatedCost: 0,
      };

      const status = calculateUsageStatus(service, usage);

      return {
        service,
        requestsCount: usage.requestsCount,
        estimatedCost: usage.estimatedCost,
        percentage: status.percentage,
        status: status.status,
        limit: status.limit,
      };
    });

    // Calculate totals
    const totalCost = usageData.reduce((sum, u) => sum + Number(u.estimatedCost || 0), 0);
    const totalRequests = usageData.reduce((sum, u) => sum + (u.requestsCount || 0), 0);

    // Get live Hunter.io account info
    let hunterLiveData = null;
    try {
      if (process.env.HUNTER_API_KEY) {
        const hunterResponse = await fetch(
          `https://api.hunter.io/v2/account?api_key=${process.env.HUNTER_API_KEY}`
        );
        if (hunterResponse.ok) {
          const hunterData = await hunterResponse.json();
          hunterLiveData = {
            credits: {
              used: hunterData.data?.requests?.credits?.used || 0,
              available: hunterData.data?.requests?.credits?.available || 50,
              total: (hunterData.data?.requests?.credits?.used || 0) + (hunterData.data?.requests?.credits?.available || 50),
            },
            searches: {
              used: hunterData.data?.requests?.searches?.used || 0,
              available: hunterData.data?.requests?.searches?.available || 25,
            },
            verifications: {
              used: hunterData.data?.requests?.verifications?.used || 0,
              available: hunterData.data?.requests?.verifications?.available || 50,
            },
            resetDate: hunterData.data?.reset_date || null,
            plan: hunterData.data?.plan_name || 'Free',
          };
        }
      }
    } catch (error) {
      console.error('Failed to fetch Hunter.io live data:', error);
    }

    return NextResponse.json({
      month,
      services: usageStats,
      totals: {
        cost: totalCost,
        requests: totalRequests,
      },
      alerts,
      recentLogs: logs,
      hunterLive: hunterLiveData,
    });
  } catch (error: any) {
    console.error('Usage stats error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch usage stats', message: error.message },
      { status: 500 }
    );
  }
}

// POST - Create manual usage alert
export async function POST(request: NextRequest) {
  try {
    const { service, alertLevel, message, thresholdPercentage } = await request.json();

    const alert = await prisma.usageAlert.create({
      data: {
        service,
        alertLevel,
        message,
        thresholdPercentage,
      },
    });

    return NextResponse.json({
      success: true,
      alert,
    });
  } catch (error: any) {
    console.error('Create alert error:', error);
    return NextResponse.json(
      { error: 'Failed to create alert', message: error.message },
      { status: 500 }
    );
  }
}

// DELETE - Clear old alerts
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '30');

    const result = await prisma.usageAlert.deleteMany({
      where: {
        createdAt: {
          lt: new Date(Date.now() - days * 24 * 60 * 60 * 1000),
        },
      },
    });

    return NextResponse.json({
      success: true,
      deleted: result.count,
    });
  } catch (error: any) {
    console.error('Delete alerts error:', error);
    return NextResponse.json(
      { error: 'Failed to delete alerts', message: error.message },
      { status: 500 }
    );
  }
}
