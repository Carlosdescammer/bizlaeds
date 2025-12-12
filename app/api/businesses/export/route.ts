import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

/**
 * GET /api/businesses/export
 * Export businesses to CSV with all enriched data
 *
 * Query Parameters:
 * - format: 'csv' | 'json' (default: csv)
 * - leadStatus: Filter by lead status
 * - leadPriority: Filter by priority (high/medium/low)
 * - startDate: ISO date string
 * - endDate: ISO date string
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'csv';
    const leadStatus = searchParams.get('leadStatus');
    const leadPriority = searchParams.get('leadPriority');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Build query filters
    const where: any = {};

    if (leadStatus) {
      where.leadStatus = leadStatus;
    }

    if (leadPriority) {
      where.leadPriority = leadPriority;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        where.createdAt.lte = new Date(endDate);
      }
    }

    // Fetch businesses from database
    const businesses = await prisma.business.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    if (format === 'json') {
      // Return JSON export
      return NextResponse.json({
        success: true,
        count: businesses.length,
        exportedAt: new Date().toISOString(),
        businesses: businesses.map(b => ({
          id: b.id,
          businessName: b.businessName,
          contactName: b.contactName,
          email: b.email,
          phone: b.phone,
          website: b.website,
          businessType: b.businessType,
          industry: b.industry,
          address: b.address,
          city: b.city,
          state: b.state,
          zipCode: b.zipCode,
          country: b.country,
          latitude: b.latitude?.toString(),
          longitude: b.longitude?.toString(),
          googlePlaceId: b.googlePlaceId,
          googleRating: b.googleRating?.toString(),
          googleReviewCount: b.googleReviewCount,
          hunterEmailPattern: b.hunterEmailPattern,
          hunterEmailCount: b.hunterEmailCount,
          emailValid: b.emailValid,
          companySize: b.companySize,
          linkedinUrl: b.linkedinUrl,
          twitterHandle: b.twitterHandle,
          facebookUrl: b.facebookUrl,
          logoUrl: b.logoUrl,
          leadScore: b.confidenceScore ? Number(b.confidenceScore) * 100 : null,
          leadPriority: b.leadPriority,
          leadStatus: b.leadStatus,
          createdAt: b.createdAt,
        })),
      });
    }

    // CSV Export - Complete enriched data
    const csvRows: string[] = [];

    // CSV Headers - All enriched fields
    csvRows.push([
      // Contact Information
      'Contact Name',
      'Business Name',
      'Email',
      'Phone',
      'Website',

      // Business Details
      'Business Type',
      'Industry',
      'Company Size',

      // Address
      'Street Address',
      'City',
      'State',
      'Zip Code',
      'Country',
      'Formatted Address',

      // Location Data
      'Latitude',
      'Longitude',
      'Google Place ID',

      // Enrichment Data
      'Google Rating',
      'Google Reviews',
      'Email Pattern',
      'Email Count',
      'Email Valid',

      // Social Profiles
      'LinkedIn',
      'Twitter',
      'Facebook',
      'Company Logo',

      // Lead Information
      'Lead Score',
      'Lead Priority',
      'Lead Status',
      'Last Contacted',
      'Next Follow Up',

      // Metadata
      'Created Date',
      'OCR Confidence',
      'Business ID',
    ].join(','));

    // Add data rows
    for (const b of businesses) {
      const row = [
        // Contact Information
        escapeCsv(b.contactName),
        escapeCsv(b.businessName),
        escapeCsv(b.email),
        escapeCsv(b.phone),
        escapeCsv(b.website),

        // Business Details
        escapeCsv(b.businessType),
        escapeCsv(b.industry),
        escapeCsv(b.companySize),

        // Address
        escapeCsv(b.address),
        escapeCsv(b.city),
        escapeCsv(b.state),
        escapeCsv(b.zipCode),
        escapeCsv(b.country),
        escapeCsv(b.formattedAddress),

        // Location Data
        b.latitude?.toString() || '',
        b.longitude?.toString() || '',
        escapeCsv(b.googlePlaceId),

        // Enrichment Data
        b.googleRating?.toString() || '',
        b.googleReviewCount?.toString() || '',
        escapeCsv(b.hunterEmailPattern),
        b.hunterEmailCount?.toString() || '',
        b.emailValid ? 'Yes' : 'No',

        // Social Profiles
        escapeCsv(b.linkedinUrl),
        escapeCsv(b.twitterHandle),
        escapeCsv(b.facebookUrl),
        escapeCsv(b.logoUrl),

        // Lead Information
        b.confidenceScore ? Math.round(Number(b.confidenceScore) * 100).toString() : '',
        escapeCsv(b.leadPriority),
        escapeCsv(b.leadStatus),
        b.lastContactedAt ? formatDate(b.lastContactedAt) : '',
        b.nextFollowUpAt ? formatDate(b.nextFollowUpAt) : '',

        // Metadata
        formatDate(b.createdAt),
        b.confidenceScore ? (Number(b.confidenceScore) * 100).toFixed(0) + '%' : '',
        escapeCsv(b.id),
      ].join(',');

      csvRows.push(row);
    }

    const csvContent = csvRows.join('\n');

    // Generate filename with timestamp and filters
    const timestamp = new Date().toISOString().split('T')[0];
    let filename = `bizleads_export_${timestamp}`;

    if (leadPriority) filename += `_${leadPriority}`;
    if (leadStatus) filename += `_${leadStatus}`;
    filename += `.csv`;

    // Return CSV file
    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error: any) {
    console.error('Export error:', error);
    return NextResponse.json(
      { error: 'Failed to export businesses', message: error.message },
      { status: 500 }
    );
  }
}

/**
 * Escape CSV value to handle commas, quotes, and newlines
 */
function escapeCsv(value: any): string {
  if (value === null || value === undefined) return '';

  const stringValue = String(value);

  // If value contains comma, quote, or newline, wrap in quotes and escape internal quotes
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }

  return stringValue;
}

/**
 * Format date to readable format
 */
function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toISOString().split('T')[0]; // YYYY-MM-DD format
}
