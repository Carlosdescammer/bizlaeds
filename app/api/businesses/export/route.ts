import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

/**
 * GET /api/businesses/export
 * Export businesses to CSV format matching import_clients_template-2.csv
 *
 * Query Parameters:
 * - format: 'csv' (default)
 * - status: 'approved' | 'pending_review' | 'flagged' (optional filter)
 * - startDate: ISO date string (optional)
 * - endDate: ISO date string (optional)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'csv';
    const status = searchParams.get('status');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Build query filters
    const where: any = {};

    if (status) {
      where.reviewStatus = status;
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

    if (format === 'csv') {
      // Generate CSV matching import_clients_template-2.csv format
      // Headers: First Name,Last Name,Phone,Email,Company Name,Business Number,Street Address,Suburb/Town,Postcode/Zip,State,Country,Note 1

      const csvRows: string[] = [];

      // Add header row
      csvRows.push('First Name,Last Name,Phone,Email,Company Name,Business Number,Street Address,Suburb/Town,Postcode/Zip,State,Country,Note 1');

      // Add data rows
      for (const business of businesses) {
        // Parse contact name into first and last name
        let firstName = '';
        let lastName = '';
        if (business.contactName) {
          const nameParts = business.contactName.trim().split(' ');
          if (nameParts.length > 1) {
            firstName = nameParts[0];
            lastName = nameParts.slice(1).join(' ');
          } else {
            firstName = nameParts[0] || '';
          }
        }

        // Format phone number
        const phone = business.phone || '';

        // Email
        const email = business.email || '';

        // Company name
        const companyName = escapeCsvValue(business.businessName || '');

        // Business number (could be a secondary phone or leave empty)
        const businessNumber = business.website || '';

        // Address components
        const streetAddress = escapeCsvValue(business.address || '');
        const suburbTown = escapeCsvValue(business.city || '');
        const postcodeZip = business.zipCode || '';
        const state = business.state || '';
        const country = business.country || 'USA';

        // Note 1 - Include useful metadata
        const notes = [];
        if (business.businessType) notes.push(`Type: ${business.businessType}`);
        if (business.industry) notes.push(`Industry: ${business.industry}`);
        if (business.googleRating) notes.push(`Rating: ${business.googleRating}⭐`);
        if (business.qualityScore) notes.push(`Quality: ${business.qualityScore}%`);
        if (business.source) notes.push(`Source: ${business.source}`);
        if (business.linkedinUrl) notes.push(`LinkedIn: ${business.linkedinUrl}`);

        const note1 = escapeCsvValue(notes.join(' | '));

        // Build CSV row
        const row = [
          escapeCsvValue(firstName),
          escapeCsvValue(lastName),
          escapeCsvValue(phone),
          escapeCsvValue(email),
          companyName,
          escapeCsvValue(businessNumber),
          streetAddress,
          suburbTown,
          escapeCsvValue(postcodeZip),
          escapeCsvValue(state),
          escapeCsvValue(country),
          note1,
        ].join(',');

        csvRows.push(row);
      }

      const csvContent = csvRows.join('\n');

      // Generate filename with timestamp
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `bizleads_export_${timestamp}.csv`;

      // Return CSV file
      return new NextResponse(csvContent, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      });
    }

    // Default: Return JSON if format not recognized
    return NextResponse.json({
      success: true,
      count: businesses.length,
      businesses,
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
function escapeCsvValue(value: string): string {
  if (!value) return '';

  // Convert to string if not already
  const stringValue = String(value);

  // If value contains comma, quote, or newline, wrap in quotes and escape internal quotes
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }

  return stringValue;
}
