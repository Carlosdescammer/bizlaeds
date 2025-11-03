import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * POST /api/compose-email
 * AI-powered email composition and editing
 */
export async function POST(request: NextRequest) {
  try {
    const { prompt, currentEmail, subject, action } = await request.json();

    if (!prompt) {
      return NextResponse.json(
        { success: false, error: 'Prompt is required' },
        { status: 400 }
      );
    }

    // Build system message based on action
    let systemMessage = 'You are a professional email writing assistant. ';

    switch (action) {
      case 'generate':
        systemMessage += 'Generate a complete, professional email based on the user\'s description. Return ONLY the email body text, no subject line, no metadata, no JSON. Write as if you are the sender.';
        break;
      case 'improve':
        systemMessage += 'Improve the given email to make it better. Return ONLY the improved email body text.';
        break;
      case 'shorten':
        systemMessage += 'Make the email shorter and more concise while keeping key points. Return ONLY the shortened email body text.';
        break;
      case 'expand':
        systemMessage += 'Expand the email with more details and context. Return ONLY the expanded email body text.';
        break;
      case 'tone':
        systemMessage += 'Rewrite the email in the requested tone. Return ONLY the rewritten email body text.';
        break;
    }

    systemMessage += '\n\nIMPORTANT: Return ONLY the email body text. Do not include subject lines, greetings like "Subject:", or any metadata. Just the email content that should go in the message body.';

    // Call OpenAI
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: systemMessage,
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 500,
    });

    const generatedText = completion.choices[0].message.content?.trim() || '';

    // Extract subject if generating new email and no subject provided
    let extractedSubject = subject;
    if (action === 'generate' && !subject) {
      // Ask AI to generate a subject line
      const subjectCompletion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'Generate a concise, professional email subject line (max 8 words). Return ONLY the subject line text, nothing else.',
          },
          {
            role: 'user',
            content: `Generate a subject line for this email:\n\n${generatedText}`,
          },
        ],
        temperature: 0.7,
        max_tokens: 20,
      });

      extractedSubject = subjectCompletion.choices[0].message.content?.trim() || 'Follow Up';
      // Remove quotes if AI added them
      extractedSubject = extractedSubject.replace(/^["']|["']$/g, '');
    }

    return NextResponse.json({
      success: true,
      body: generatedText,
      subject: extractedSubject,
      action,
    });
  } catch (error: any) {
    console.error('Email composition error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to generate email',
      },
      { status: 500 }
    );
  }
}
