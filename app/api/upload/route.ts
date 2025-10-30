import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
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

    // Create uploads directory if it doesn't exist
    const uploadsDir = join(process.cwd(), 'public', 'uploads');
    try {
      await mkdir(uploadsDir, { recursive: true });
    } catch (e) {
      // Directory might already exist
    }

    // Generate unique filename
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const filename = `${uuidv4()}-${file.name}`;
    const filepath = join(uploadsDir, filename);

    // Save file
    await writeFile(filepath, buffer);

    // Create photo record in database
    const photo = await prisma.photo.create({
      data: {
        telegramFileId: filename, // Using filename as unique ID for web uploads
        telegramMessageId: BigInt(Date.now()), // Timestamp as message ID
        fileUrl: `/uploads/${filename}`,
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
        url: `/uploads/${filename}`,
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
