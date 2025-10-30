import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import axios from 'axios';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
const TELEGRAM_USER_ID = process.env.TELEGRAM_USER_ID!;
const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

// Send message to Telegram
async function sendTelegramMessage(chatId: string, text: string, replyMarkup?: any) {
  try {
    await axios.post(`${TELEGRAM_API}/sendMessage`, {
      chat_id: chatId,
      text,
      parse_mode: 'Markdown',
      reply_markup: replyMarkup,
    });
  } catch (error) {
    console.error('Telegram send error:', error);
  }
}

// Download photo from Telegram
async function downloadTelegramPhoto(fileId: string): Promise<Buffer> {
  try {
    // Get file path
    const fileResponse = await axios.get(`${TELEGRAM_API}/getFile`, {
      params: { file_id: fileId },
    });

    const filePath = fileResponse.data.result.file_path;

    // Download file
    const fileUrl = `https://api.telegram.org/file/bot${TELEGRAM_BOT_TOKEN}/${filePath}`;
    const downloadResponse = await axios.get(fileUrl, {
      responseType: 'arraybuffer',
    });

    return Buffer.from(downloadResponse.data);
  } catch (error) {
    console.error('Photo download error:', error);
    throw error;
  }
}

// Save photo and create database record
async function savePhoto(buffer: Buffer, fileId: string, messageId: number) {
  try {
    const { writeFile, mkdir } = await import('fs/promises');
    const { join } = await import('path');

    // Create uploads directory
    const uploadsDir = join(process.cwd(), 'public', 'uploads');
    try {
      await mkdir(uploadsDir, { recursive: true });
    } catch (e) {
      // Directory exists
    }

    // Save file
    const filename = `telegram-${fileId}.jpg`;
    const filepath = join(uploadsDir, filename);
    await writeFile(filepath, buffer);

    // Create database record
    const photo = await prisma.photo.create({
      data: {
        telegramFileId: fileId,
        telegramMessageId: BigInt(messageId),
        fileUrl: `/uploads/${filename}`,
        fileSize: buffer.length,
        processed: false,
      },
    });

    await prisma.activityLog.create({
      data: {
        action: 'photo_uploaded',
        details: {
          photoId: photo.id,
          source: 'telegram',
          messageId,
        },
      },
    });

    return photo;
  } catch (error) {
    console.error('Save photo error:', error);
    throw error;
  }
}

// Process photo immediately
async function processPhoto(photoId: string) {
  try {
    const response = await axios.post(
      `${process.env.NEXT_PUBLIC_APP_URL}/api/process`,
      { photoId }
    );
    return response.data;
  } catch (error) {
    console.error('Process photo error:', error);
    return { success: false, error: 'Processing failed' };
  }
}

// Handle webhook updates
export async function POST(request: NextRequest) {
  try {
    const update = await request.json();

    // Only process messages from authorized user
    const chatId = update.message?.chat?.id?.toString();
    if (chatId !== TELEGRAM_USER_ID) {
      return NextResponse.json({ ok: true }); // Ignore unauthorized users
    }

    // Handle photo messages
    if (update.message?.photo) {
      const photo = update.message.photo[update.message.photo.length - 1]; // Get highest resolution
      const messageId = update.message.message_id;

      try {
        // Download and save photo
        const buffer = await downloadTelegramPhoto(photo.file_id);
        const savedPhoto = await savePhoto(buffer, photo.file_id, messageId);

        // Send confirmation
        await sendTelegramMessage(
          chatId,
          '📸 Photo received! Processing...'
        );

        // Process photo
        const result = await processPhoto(savedPhoto.id);

        if (result.success && result.business) {
          // Send success message with business info
          await sendTelegramMessage(
            chatId,
            `✅ *Business Found!*\n\n` +
            `📌 *${result.business.name}*\n` +
            `🏢 Type: ${result.business.type || 'Unknown'}\n` +
            `📊 Confidence: ${Math.round((result.business.confidence || 0) * 100)}%\n\n` +
            `The business has been added to your dashboard for review.`,
            {
              inline_keyboard: [
                [
                  {
                    text: '👀 View Details',
                    url: `${process.env.NEXT_PUBLIC_APP_URL}/leads/${result.business.id}`,
                  },
                ],
              ],
            }
          );

          // Store callback data
          await prisma.telegramCallback.create({
            data: {
              callbackId: `business_${result.business.id}`,
              businessId: result.business.id,
              action: 'view_business',
              data: result.business,
            },
          });
        } else {
          // Send error message
          await sendTelegramMessage(
            chatId,
            '⚠️ Could not extract business information from this photo.\n\n' +
            'Please make sure the photo clearly shows:\n' +
            '• Business name\n' +
            '• Address or location\n' +
            '• Contact information'
          );
        }
      } catch (error: any) {
        console.error('Photo handling error:', error);
        await sendTelegramMessage(
          chatId,
          `❌ Error processing photo: ${error.message}`
        );
      }
    }

    // Handle callback queries (button presses)
    if (update.callback_query) {
      const callbackData = update.callback_query.data;
      const callbackId = update.callback_query.id;

      try {
        const callback = await prisma.telegramCallback.findUnique({
          where: { callbackId: callbackData },
        });

        if (callback) {
          // Mark as processed
          await prisma.telegramCallback.update({
            where: { callbackId: callbackData },
            data: { processed: true },
          });

          // Answer callback query
          await axios.post(`${TELEGRAM_API}/answerCallbackQuery`, {
            callback_query_id: callbackId,
            text: 'Opening details...',
          });
        }
      } catch (error) {
        console.error('Callback handling error:', error);
      }
    }

    // Handle text commands
    if (update.message?.text) {
      const text = update.message.text.toLowerCase();

      if (text === '/start') {
        await sendTelegramMessage(
          chatId,
          '👋 *Welcome to Business Leads Bot!*\n\n' +
          'Send me photos of business storefronts, signs, or cards, and I\'ll:\n' +
          '• Extract business information\n' +
          '• Find contact details\n' +
          '• Add them to your leads database\n\n' +
          'Just send a photo to get started!'
        );
      } else if (text === '/status') {
        // Get processing status
        const pending = await prisma.photo.count({
          where: { processed: false, processingError: null },
        });
        const processed = await prisma.photo.count({
          where: { processed: true, businessId: { not: null } },
        });

        await sendTelegramMessage(
          chatId,
          `📊 *Status*\n\n` +
          `⏳ Pending: ${pending}\n` +
          `✅ Processed: ${processed}\n\n` +
          `[View Dashboard](${process.env.NEXT_PUBLIC_APP_URL})`
        );
      } else if (text === '/help') {
        await sendTelegramMessage(
          chatId,
          '*Available Commands:*\n\n' +
          '/start - Welcome message\n' +
          '/status - Check processing status\n' +
          '/help - Show this help message\n\n' +
          '*How to use:*\n' +
          '1. Take a photo of a business\n' +
          '2. Send it to this bot\n' +
          '3. Wait for processing\n' +
          '4. Review on your dashboard'
        );
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }
}

// GET - Setup webhook or check status
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    if (action === 'setup') {
      // Set webhook URL
      const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/telegram/webhook`;

      const response = await axios.post(`${TELEGRAM_API}/setWebhook`, {
        url: webhookUrl,
        allowed_updates: ['message', 'callback_query'],
      });

      return NextResponse.json({
        success: true,
        webhook: webhookUrl,
        response: response.data,
      });
    }

    // Get webhook info
    const response = await axios.get(`${TELEGRAM_API}/getWebhookInfo`);

    return NextResponse.json({
      webhookInfo: response.data.result,
    });
  } catch (error: any) {
    console.error('Webhook setup error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
