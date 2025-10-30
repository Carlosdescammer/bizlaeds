import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('photo') as File;
    const source = formData.get('source') as string || 'web';

    if (!file) {
      return NextResponse.json(
        { error: 'No photo provided' },
        { status: 400 }
      );
    }

    // Convert image to base64 data URL (Vercel serverless can't write to filesystem)
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64 = buffer.toString('base64');
    const mimeType = file.type || 'image/jpeg';
    const dataUrl = `data:${mimeType};base64,${base64}`;

    const filename = `${uuidv4()}-${file.name}`;

    // Create photo record in database with base64 data URL
    const photo = await prisma.photo.create({
      data: {
        telegramFileId: filename,
        telegramMessageId: BigInt(Date.now()),
        fileUrl: dataUrl, // Store as data URL
        fileSize: buffer.length,
        processed: false,
      },
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        action: 'photo_uploaded',
        details: {
          photoId: photo.id,
          source,
          filename,
          size: buffer.length,
        },
      },
    });

    return NextResponse.json({
      success: true,
      photo: {
        id: photo.id,
        url: dataUrl,
        status: 'queued',
      },
    });
  } catch (error: any) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Upload failed', message: error.message },
      { status: 500 }
    );
  }
}
