import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const photoReference = searchParams.get('photo_reference');
    const maxwidth = searchParams.get('maxwidth') || '400';

    if (!photoReference) {
      return NextResponse.json({ error: 'Photo reference is required' }, { status: 400 });
    }

    if (!process.env.GOOGLE_MAPS_API_KEY) {
      return NextResponse.json({ error: 'Google Maps API key not configured' }, { status: 500 });
    }

    // Fetch the photo from Google Places API
    const photoUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=${maxwidth}&photo_reference=${photoReference}&key=${process.env.GOOGLE_MAPS_API_KEY}`;

    const response = await fetch(photoUrl);

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch photo from Google' },
        { status: response.status }
      );
    }

    // Get the image data
    const imageBuffer = await response.arrayBuffer();
    const contentType = response.headers.get('content-type') || 'image/jpeg';

    // Return the image with proper headers
    return new NextResponse(imageBuffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400', // Cache for 24 hours
      },
    });
  } catch (error: any) {
    console.error('Google Photo proxy error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch photo', message: error.message },
      { status: 500 }
    );
  }
}
