# BizLeads - AI-Powered Business Lead Management Platform

A comprehensive business lead generation and management platform built with Next.js 16, featuring AI-powered data enrichment, OCR business card scanning, and automated lead qualification.

## Overview

BizLeads is an intelligent lead management system that helps businesses capture, enrich, and qualify leads from multiple sources. It combines modern web technologies with AI services to automate tedious data entry and provide deep business insights.

## Key Features

### 1. Business Card OCR Scanning
- **AI-Powered Text Extraction**: Uses Google Vision API to extract text from business card images
- **Smart Field Detection**: Automatically identifies and extracts:
  - Business name and contact name
  - Email addresses and phone numbers
  - Website URLs and physical addresses
  - Job titles and industry classification
- **Batch Processing**: Upload and process multiple business cards at once
- **Data Validation**: Automatic validation and normalization of extracted data

### 2. AI-Powered Lead Enrichment
- **Google Maps Integration**: Fetch business details, ratings, and location data
- **LinkedIn Company Data**: Retrieve company profiles, employee counts, and industry information
- **Email Verification**: Validate email addresses using Hunter.io
- **OpenAI Enhancement**: Generate business descriptions and categorizations
- **Industry Detection**: Automatic industry classification based on business data

### 3. Automated Lead Scoring
- **Multi-Factor Scoring**: Analyzes completeness, relevance, and data quality
- **Priority Ranking**: Automatically prioritizes leads based on quality indicators
- **Custom Scoring Rules**: Configurable scoring criteria for different business needs

### 4. Real-Time Notifications
- **Telegram Integration**: Instant notifications for new leads and important updates
- **Email Alerts**: Automated email notifications for lead actions
- **Customizable Triggers**: Set up notifications for specific events

### 5. Advanced Search & Filtering
- **Full-Text Search**: Search across all business fields
- **Multi-Criteria Filtering**: Filter by industry, location, status, and more
- **Saved Searches**: Save and reuse common search queries
- **Export Capabilities**: Export filtered results to CSV or JSON

### 6. Data Quality Management
- **Automatic Deduplication**: Detects and merges duplicate business entries
- **Data Validation**: Validates phone numbers, emails, and URLs
- **Quality Scoring**: Tracks data completeness and accuracy
- **Review Workflow**: Manual review system for flagged entries

### 7. API Usage Tracking
- **Cost Monitoring**: Track API usage and estimated costs
- **Usage Limits**: Set alerts for approaching service limits
- **Service Analytics**: Detailed logs for all API interactions
- **Budget Management**: Monitor spending across all integrated services

## Tech Stack

### Frontend
- **Next.js 16.0.1**: React framework with App Router
- **TypeScript**: Type-safe development
- **Tailwind CSS**: Utility-first CSS framework
- **Shadcn UI**: Modern component library

### Backend
- **Next.js API Routes**: Serverless API endpoints
- **Prisma ORM**: Type-safe database access
- **PostgreSQL**: Primary database (Neon serverless)

### AI & Enrichment Services
- **Google Vision API**: OCR for business card scanning
- **Google Maps API**: Business location and details
- **OpenAI API**: AI-powered text generation and analysis
- **Hunter.io**: Email verification and finding
- **LinkedIn APIs**: Company profile enrichment via RapidAPI

### Authentication & Deployment
- **Stack Auth**: Modern authentication solution
- **Vercel**: Deployment and hosting
- **GitHub**: Version control and CI/CD

## Getting Started

### Prerequisites

- Node.js 18+ and npm/yarn/pnpm
- PostgreSQL database (or Neon account)
- API keys for integrated services (see Environment Variables)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/Carlosdescammer/bizlaeds.git
cd bizleads-webapp
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
```

4. Configure your `.env.local` file with required API keys (see below)

5. Run database migrations:
```bash
npx prisma migrate deploy
npx prisma generate
```

6. Start the development server:
```bash
npm run dev
```

7. Open [http://localhost:3000](http://localhost:3000)

## Environment Variables

Create a `.env.local` file with the following variables:

```bash
# Database
DATABASE_URL="postgresql://user:password@host/database"

# OpenAI
OPENAI_API_KEY="sk-..."

# Google Services
GOOGLE_MAPS_API_KEY="AIza..."
GOOGLE_VISION_API_KEY="AIza..."  # Can use same key as Maps

# Hunter.io
HUNTER_API_KEY="..."

# RapidAPI (for LinkedIn)
RAPIDAPI_KEY="..."

# Telegram (optional)
TELEGRAM_BOT_TOKEN="..."
TELEGRAM_USER_ID="..."

# Gmail (optional)
GMAIL_USER="your-email@gmail.com"
GMAIL_APP_PASSWORD="..."

# Stack Auth
NEXT_PUBLIC_STACK_PROJECT_ID="..."
NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY="..."
STACK_SECRET_SERVER_KEY="..."

# App Config
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### Getting API Keys

1. **Google APIs**: [Google Cloud Console](https://console.cloud.google.com/)
   - Enable Vision API and Maps API
   - Create API key with appropriate restrictions

2. **OpenAI**: [OpenAI Platform](https://platform.openai.com/)
   - Create API key from API keys section

3. **Hunter.io**: [Hunter.io](https://hunter.io/api)
   - Sign up and get API key from dashboard

4. **RapidAPI**: [RapidAPI Hub](https://rapidapi.com/)
   - Subscribe to LinkedIn APIs (Real-Time Scraper or Fresh Profile Data)

5. **Stack Auth**: [Stack Auth](https://stack-auth.com/)
   - Create project and get credentials

6. **Telegram** (optional): [BotFather](https://t.me/botfather)
   - Create bot and get token

## API Endpoints

### Business Management
- `POST /api/businesses` - Create new business
- `GET /api/businesses` - List businesses with filtering
- `GET /api/businesses/:id` - Get business details
- `PUT /api/businesses/:id` - Update business
- `DELETE /api/businesses/:id` - Delete business
- `POST /api/businesses/:id/enrich` - Enrich business data

### Business Card OCR
- `POST /api/business-card` - Upload and process business card(s)
- `GET /api/business-card` - Get OCR statistics

### Usage Tracking
- `GET /api/usage` - Get API usage statistics
- `POST /api/usage` - Create usage alert
- `DELETE /api/usage` - Clear old alerts

### Search
- `POST /api/search` - Advanced business search

## Project Structure

```
bizleads-webapp/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   ├── businesses/        # Business pages
│   └── page.tsx          # Home page
├── lib/                   # Core library code
│   ├── ocr-processor.ts  # OCR processing logic
│   ├── enrichment-apis.ts # API integrations
│   ├── business-processor.ts # Business logic
│   └── db.ts             # Database client
├── prisma/               # Database schema and migrations
│   └── schema.prisma     # Prisma schema
├── components/           # React components
├── public/              # Static assets
└── docs/                # Documentation
    └── OCR-SETUP.md     # OCR setup guide
```

## Features in Detail

### OCR Business Card Processing

Upload business card images (single or batch) and automatically extract:
- Contact information (name, email, phone)
- Company details (name, website, address)
- Job title and industry
- Social media profiles

See [OCR-SETUP.md](./OCR-SETUP.md) for detailed setup instructions.

### Lead Enrichment Pipeline

1. **Data Collection**: Capture lead from various sources
2. **Validation**: Verify email, phone, and website
3. **Enrichment**: Fetch additional data from external APIs
4. **Scoring**: Calculate lead quality score
5. **Deduplication**: Check for existing records
6. **Notification**: Alert team of new qualified leads

### API Usage Monitoring

Track usage across all services:
- **Google Vision OCR**: 1,000 images/month free, then $1.50/1k
- **Google Maps API**: 200 requests/month free
- **OpenAI API**: $5/month budget monitoring
- **Hunter.io**: 50 requests/month free
- **LinkedIn APIs**: RapidAPI subscription tracking

Access dashboard at `/api/usage` to monitor spending and set alerts.

## Database Schema

Key models:
- **Business**: Core business entity with all lead data
- **ApiUsageLog**: Detailed logs of all API calls
- **ApiUsage**: Monthly aggregated usage statistics
- **UsageAlert**: Configured usage alerts and warnings

See `prisma/schema.prisma` for full schema definition.

## Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Import project in Vercel
3. Add environment variables in Vercel dashboard
4. Deploy

```bash
vercel --prod
```

### Manual Deployment

1. Build the application:
```bash
npm run build
```

2. Start production server:
```bash
npm start
```

## Development

### Running Tests

```bash
npm test
```

### Database Management

```bash
# Create migration
npx prisma migrate dev --name migration_name

# Apply migrations
npx prisma migrate deploy

# Open Prisma Studio
npx prisma studio
```

### Code Quality

```bash
# Lint code
npm run lint

# Format code
npm run format
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is proprietary software. All rights reserved.

## Support

For issues and questions:
- Create an issue on GitHub
- Contact: [your-email@example.com]

## Acknowledgments

- Built with [Next.js](https://nextjs.org/)
- UI components from [Shadcn UI](https://ui.shadcn.com/)
- Authentication by [Stack Auth](https://stack-auth.com/)
- Deployed on [Vercel](https://vercel.com/)

---

**Version**: 1.0.0
**Last Updated**: 2025-01-01
**Status**: Production Ready
