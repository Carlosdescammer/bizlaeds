import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

// Configuration
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic'];

export async function POST(request: NextRequest) {
  const uploadStartTime = Date.now();

  try {
    console.log('[UPLOAD] Starting upload process...');

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('photo') as File;
    const source = formData.get('source') as string || 'web';

    // Validation 1: Check if file exists
    if (!file) {
      console.error('[UPLOAD] ❌ No file provided');
      return NextResponse.json(
        {
          error: 'No photo provided',
          debug: 'No file was attached to the upload request'
        },
        { status: 400 }
      );
    }

    console.log(`[UPLOAD] File received: ${file.name}, type: ${file.type}, size: ${file.size} bytes`);

    // Validation 2: Check file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      console.error(`[UPLOAD] ❌ Invalid file type: ${file.type}`);
      return NextResponse.json(
        {
          error: 'Invalid file type',
          debug: `Only images are allowed. Got: ${file.type}. Allowed: ${ALLOWED_TYPES.join(', ')}`,
          fileType: file.type,
          allowedTypes: ALLOWED_TYPES
        },
        { status: 400 }
      );
    }

    // Validation 3: Check file size
    if (file.size > MAX_FILE_SIZE) {
      console.error(`[UPLOAD] ❌ File too large: ${(file.size / 1024 / 1024).toFixed(2)}MB`);
      return NextResponse.json(
        {
          error: 'File too large',
          debug: `Maximum file size is ${MAX_FILE_SIZE / 1024 / 1024}MB. Your file is ${(file.size / 1024 / 1024).toFixed(2)}MB`,
          fileSize: file.size,
          maxSize: MAX_FILE_SIZE
        },
        { status: 400 }
      );
    }

    // Validation 4: Check if file is empty
    if (file.size === 0) {
      console.error('[UPLOAD] ❌ Empty file');
      return NextResponse.json(
        {
          error: 'Empty file',
          debug: 'The uploaded file is empty (0 bytes)'
        },
        { status: 400 }
      );
    }

    console.log('[UPLOAD] ✅ File validation passed');

    // Convert image to base64 data URL
    console.log('[UPLOAD] Converting to base64...');
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64 = buffer.toString('base64');
    const mimeType = file.type || 'image/jpeg';
    const dataUrl = `data:${mimeType};base64,${base64}`;

    console.log(`[UPLOAD] ✅ Converted to base64 (${(base64.length / 1024).toFixed(2)}KB)`);

    const filename = `${uuidv4()}-${file.name}`;

    // Create photo record in database
    console.log('[UPLOAD] Saving to database...');
    const photo = await prisma.photo.create({
      data: {
        fileUrl: dataUrl,
        fileSize: buffer.length,
        processed: false,
      },
    });

    const uploadDuration = Date.now() - uploadStartTime;
    console.log(`[UPLOAD] ✅ Upload successful! Photo ID: ${photo.id}, Duration: ${uploadDuration}ms`);

    return NextResponse.json({
      success: true,
      photo: {
        id: photo.id,
        url: dataUrl,
        status: 'queued',
      },
      debug: {
        filename,
        size: file.size,
        type: file.type,
        uploadDuration: `${uploadDuration}ms`
      }
    });
  } catch (error: any) {
    const uploadDuration = Date.now() - uploadStartTime;
    console.error(`[UPLOAD] ❌ Upload failed after ${uploadDuration}ms:`, error);
    console.error('[UPLOAD] Error stack:', error.stack);

    return NextResponse.json(
      {
        error: 'Upload failed',
        message: error.message,
        debug: {
          errorType: error.name,
          errorMessage: error.message,
          uploadDuration: `${uploadDuration}ms`,
          stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        }
      },
      { status: 500 }
    );
  }
}
