# Hunter.io API Integration Guide

Complete guide to using the enhanced Hunter.io integration in BizLeads webapp.

## 📋 Table of Contents

1. [Overview](#overview)
2. [Phase 1: Quick Wins](#phase-1-quick-wins)
3. [Phase 2: Power Features](#phase-2-power-features)
4. [Phase 3: Advanced Features](#phase-3-advanced-features)
5. [API Endpoints](#api-endpoints)
6. [Usage Examples](#usage-examples)
7. [Cost Management](#cost-management)

---

## Overview

The Hunter.io integration provides comprehensive email finding, verification, and enrichment capabilities across three phases:

- **Phase 1**: Quick wins (Email Count, Bulk Verification, Company Enrichment)
- **Phase 2**: Power features (Email Finder, Email Enrichment, Discover API)
- **Phase 3**: Advanced automation (Auto-enrichment, Enhanced Lead Scoring)

---

## Phase 1: Quick Wins

### 1. Email Count (FREE)

Get the number of available emails for a domain without using credits.

**Endpoint**: `POST /api/hunter`

```json
{
  "action": "email-count",
  "domain": "stripe.com"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "total": 872,
    "personal": 850,
    "generic": 22,
    "department": {
      "sales": 150,
      "engineering": 300,
      "marketing": 100
    }
  }
}
```

**Use Case**: Check if it's worth searching a domain before spending credits.

---

### 2. Domain Search

Find all email addresses for a company domain.

**Endpoint**: `POST /api/hunter`

```json
{
  "action": "domain-search",
  "businessId": "uuid",
  "domain": "stripe.com",
  "limit": 10,
  "type": "personal",
  "seniority": "executive",
  "department": "sales"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "domain": "stripe.com",
    "organization": "Stripe",
    "pattern": "{first}{l}",
    "emails": [
      {
        "value": "patrick@stripe.com",
        "type": "personal",
        "confidence": 95,
        "firstName": "Patrick",
        "lastName": "Collison",
        "position": "CEO",
        "seniority": "executive",
        "department": "executive",
        "linkedin": "https://linkedin.com/in/patrickcollison",
        "verification": {
          "status": "valid",
          "date": "2025-01-01"
        }
      }
    ]
  }
}
```

**Auto-saves**: Best email, contact info, and company details to business record.

---

### 3. Email Verifier

Verify the deliverability of an email address.

**Endpoint**: `POST /api/hunter`

```json
{
  "action": "email-verifier",
  "businessId": "uuid",
  "email": "patrick@stripe.com"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "status": "valid",
    "result": "deliverable",
    "score": 100,
    "email": "patrick@stripe.com",
    "regexp": true,
    "gibberish": false,
    "disposable": false,
    "webmail": false,
    "mxRecords": true,
    "smtpServer": true,
    "smtpCheck": true,
    "acceptAll": false,
    "block": false
  }
}
```

**Cost**: 0.5 credits per verification

---

### 4. Bulk Email Verification

Verify multiple emails at once with rate limiting.

**Endpoint**: `POST /api/hunter`

```json
{
  "action": "bulk-verify",
  "emails": [
    "email1@company.com",
    "email2@company.com",
    "email3@company.com"
  ]
}
```

**Response**:
```json
{
  "success": true,
  "results": [
    {
      "email": "email1@company.com",
      "verification": { ... }
    }
  ],
  "summary": {
    "total": 3,
    "valid": 2,
    "invalid": 0,
    "risky": 1,
    "unknown": 0
  }
}
```

**Use Case**: Clean your lead list before email campaigns.

---

### 5. Company Enrichment

Get company information from a domain.

**Endpoint**: `POST /api/hunter`

```json
{
  "action": "company-enrichment",
  "businessId": "uuid",
  "domain": "stripe.com"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "domain": "stripe.com",
    "companyName": "Stripe",
    "linkedinUrl": "https://linkedin.com/company/stripe",
    "twitterHandle": "@stripe"
  }
}
```

---

## Phase 2: Power Features

### 1. Email Finder

Find a specific person's email address by name.

**Endpoint**: `POST /api/hunter`

```json
{
  "action": "email-finder",
  "businessId": "uuid",
  "domain": "stripe.com",
  "firstName": "Patrick",
  "lastName": "Collison",
  "companyName": "Stripe",
  "linkedin": "https://linkedin.com/in/patrickcollison"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "email": "patrick@stripe.com",
    "firstName": "Patrick",
    "lastName": "Collison",
    "confidence": 95,
    "position": "CEO",
    "seniority": "executive",
    "department": "executive",
    "linkedin": "https://linkedin.com/in/patrickcollison",
    "verification": {
      "status": "valid",
      "date": "2025-01-01"
    }
  }
}
```

**Use Case**: Target specific decision makers (CEO, Marketing Director, etc.).

---

### 2. Email Enrichment

Get full contact profile from an email address.

**Endpoint**: `POST /api/hunter`

```json
{
  "action": "email-enrichment",
  "businessId": "uuid",
  "email": "patrick@stripe.com"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "email": "patrick@stripe.com",
    "firstName": "Patrick",
    "lastName": "Collison",
    "fullName": "Patrick Collison",
    "position": "CEO",
    "seniority": "executive",
    "department": "executive",
    "linkedin": "https://linkedin.com/in/patrickcollison",
    "twitter": "@patrickc",
    "companyName": "Stripe",
    "companyDomain": "stripe.com",
    "location": "San Francisco, CA",
    "timezone": "America/Los_Angeles"
  }
}
```

**Use Case**: Enrich existing email addresses with full contact profiles.

---

### 3. Discover API (FREE)

Find companies matching specific criteria.

**Endpoint**: `POST /api/hunter`

```json
{
  "action": "discover",
  "query": "law firms in New York",
  "location": "New York, NY",
  "industry": "Legal Services",
  "minEmployees": 50,
  "maxEmployees": 200,
  "technology": "Salesforce",
  "limit": 10,
  "offset": 0
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "companies": [
      {
        "domain": "lawfirm.com",
        "companyName": "Law Firm LLP",
        "industry": "Legal Services",
        "employeeCount": "50-200",
        "location": "New York, NY",
        "founded": 1995
      }
    ],
    "total": 150,
    "offset": 0,
    "limit": 10
  }
}
```

**Use Case**: Proactive lead generation - find new businesses to target.

---

## Phase 3: Advanced Features

### 1. Auto-Enrichment

Automatically enrich a business with all available Hunter.io data.

**Endpoint**: `POST /api/auto-enrich`

```json
{
  "action": "enrich-one",
  "businessId": "uuid"
}
```

**What it does**:
1. Email Count (FREE)
2. Company Enrichment
3. Domain Search (finds best email)
4. Email Verification
5. Email Enrichment (full profile)
6. Enhanced Lead Scoring

**Response**:
```json
{
  "success": true,
  "enrichments": {
    "emailCount": true,
    "domainSearch": true,
    "emailVerification": true,
    "emailEnrichment": true,
    "companyEnrichment": true
  },
  "errors": [],
  "leadScore": 87
}
```

---

### 2. Batch Auto-Enrichment

Enrich multiple businesses at once.

**Endpoint**: `POST /api/auto-enrich`

```json
{
  "action": "enrich-batch",
  "businessIds": ["uuid1", "uuid2", "uuid3"]
}
```

**Response**:
```json
{
  "success": true,
  "results": [
    {
      "businessId": "uuid1",
      "success": true,
      "enrichments": { ... },
      "leadScore": 87
    }
  ],
  "summary": {
    "total": 3,
    "successful": 2,
    "failed": 1
  }
}
```

---

### 3. Auto-Enrich Pending

Enrich all businesses that haven't been enriched yet.

**Endpoint**: `POST /api/auto-enrich`

```json
{
  "action": "enrich-pending",
  "limit": 50
}
```

**Use Case**: Run nightly to keep all leads enriched and up-to-date.

---

### 4. Enhanced Lead Scoring

Calculate comprehensive lead score using enrichment data.

**Endpoint**: `POST /api/auto-enrich`

```json
{
  "action": "calculate-score",
  "businessId": "uuid"
}
```

**Response**:
```json
{
  "success": true,
  "score": 87,
  "priority": "high",
  "quality": {
    "label": "Excellent",
    "color": "green",
    "description": "Hot lead - high-quality contact with verified details"
  },
  "breakdown": {
    "contactQuality": {
      "score": 23,
      "maxScore": 25,
      "factors": [
        "Has email address (+5)",
        "Email verified as valid (+5)",
        "Has phone number (+5)",
        "Contact person identified (+3)",
        "Has job title: CEO (+2)",
        "Seniority: executive (+3)"
      ]
    },
    "emailQuality": {
      "score": 25,
      "maxScore": 25,
      "factors": [
        "Email confidence: 95% (+10)",
        "Email is deliverable (+10)",
        "Direct contact email (+5)"
      ]
    },
    "companyData": {
      "score": 18,
      "maxScore": 20,
      "factors": [
        "Has website (+5)",
        "Domain is valid (+3)",
        "Company size: 50-200 (+5)",
        "Has LinkedIn (+4)",
        "Has Twitter (+2)"
      ]
    },
    "enrichmentDepth": {
      "score": 13,
      "maxScore": 15,
      "factors": [
        "872 emails available in Hunter (+3)",
        "Large team - more contacts available (+2)",
        "Enriched with external data (+5)",
        "5 contact attributes known (+5)"
      ]
    },
    "industryRelevance": {
      "score": 15,
      "maxScore": 15,
      "factors": [
        "High-value industry: Legal (+15)",
        "Location: New York, NY (+5)"
      ]
    }
  },
  "recommendations": []
}
```

**Scoring Categories**:
- **Contact Quality** (25 pts): Email, phone, contact person, position, seniority
- **Email Quality** (25 pts): Confidence, deliverability, direct vs generic
- **Company Data** (20 pts): Website, domain validity, size, social media
- **Enrichment Depth** (15 pts): Email count, enrichment data, contact details
- **Industry Relevance** (15 pts): Industry fit, geographic location

**Priority Levels**:
- **High** (75-100): Hot leads, immediate follow-up
- **Medium** (50-74): Qualified leads, worth pursuing
- **Low** (0-49): Needs more enrichment or low quality

---

### 5. Enrichment Statistics

Get overview of enrichment status across all leads.

**Endpoint**: `GET /api/auto-enrich?action=stats`

**Response**:
```json
{
  "success": true,
  "stats": {
    "total": 500,
    "enriched": 350,
    "verified": 300,
    "withEmail": 400,
    "enrichmentRate": 70,
    "verificationRate": 75,
    "priorityDistribution": {
      "high": 100,
      "medium": 250,
      "low": 150
    },
    "averageScores": {
      "high": 85,
      "medium": 62,
      "low": 35
    }
  }
}
```

---

## API Endpoints Summary

### `/api/hunter` (Main Hunter.io API)

| Action | Method | Description | Cost | Phase |
|--------|--------|-------------|------|-------|
| `email-count` | POST | Get email count for domain | FREE | 1 |
| `domain-search` | POST | Find all emails for domain | 1 credit | 1 |
| `email-verifier` | POST | Verify single email | 0.5 credit | 1 |
| `bulk-verify` | POST | Verify multiple emails | 0.5 credit each | 1 |
| `company-enrichment` | POST | Get company info | 1 credit | 1 |
| `email-finder` | POST | Find specific person's email | 1 credit | 2 |
| `email-enrichment` | POST | Enrich email with profile | 1 credit | 2 |
| `discover` | POST | Find companies by criteria | FREE | 2 |
| `account-info` | GET/POST | Get Hunter account usage | FREE | - |

### `/api/auto-enrich` (Auto-Enrichment & Scoring)

| Action | Method | Description | Phase |
|--------|--------|-------------|-------|
| `enrich-one` | POST | Auto-enrich single business | 3 |
| `enrich-batch` | POST | Auto-enrich multiple businesses | 3 |
| `enrich-pending` | POST | Enrich all pending businesses | 3 |
| `calculate-score` | POST | Calculate enhanced lead score | 3 |
| `recalculate-all-scores` | POST | Recalculate all scores | 3 |
| `stats` | GET | Get enrichment statistics | 3 |

---

## Usage Examples

### Example 1: Complete Lead Enrichment Workflow

```typescript
// Step 1: Check email count (FREE)
const countResult = await fetch('/api/hunter', {
  method: 'POST',
  body: JSON.stringify({
    action: 'email-count',
    domain: 'company.com'
  })
});
// Result: 50 emails available

// Step 2: Run auto-enrichment
const enrichResult = await fetch('/api/auto-enrich', {
  method: 'POST',
  body: JSON.stringify({
    action: 'enrich-one',
    businessId: 'uuid'
  })
});
// Automatically finds email, verifies, enriches, and scores

// Step 3: Get enhanced score details
const scoreResult = await fetch('/api/auto-enrich', {
  method: 'POST',
  body: JSON.stringify({
    action: 'calculate-score',
    businessId: 'uuid'
  })
});
// Result: Score 87, High Priority, Excellent Quality
```

### Example 2: Find Specific Decision Maker

```typescript
// Find the CEO's email
const result = await fetch('/api/hunter', {
  method: 'POST',
  body: JSON.stringify({
    action: 'email-finder',
    businessId: 'uuid',
    domain: 'company.com',
    firstName: 'John',
    lastName: 'Smith',
    companyName: 'Company Inc'
  })
});
// Result: john.smith@company.com (95% confidence)
```

### Example 3: Discover New Leads

```typescript
// Find law firms in NYC with 50-200 employees
const result = await fetch('/api/hunter', {
  method: 'POST',
  body: JSON.stringify({
    action: 'discover',
    query: 'law firms',
    location: 'New York, NY',
    minEmployees: 50,
    maxEmployees: 200,
    limit: 50
  })
});
// Result: 150 matching companies found
```

### Example 4: Nightly Enrichment Job

```typescript
// Enrich all businesses that haven't been enriched yet
const result = await fetch('/api/auto-enrich', {
  method: 'POST',
  body: JSON.stringify({
    action: 'enrich-pending',
    limit: 100
  })
});
// Automatically enriches up to 100 pending businesses
```

---

## Cost Management

### Free Endpoints
- `email-count`: Check available emails
- `discover`: Find companies
- `account-info`: Check usage stats
- `stats`: Enrichment statistics

### Paid Endpoints (1 credit each)
- `domain-search`: Find emails
- `email-finder`: Find specific person
- `email-enrichment`: Enrich email
- `company-enrichment`: Enrich company

### Paid Endpoints (0.5 credits each)
- `email-verifier`: Verify single email
- `bulk-verify`: 0.5 credits per email

### Cost Optimization Tips

1. **Always start with `email-count`** (FREE) - Check if domain has emails before searching
2. **Use `discover`** (FREE) - Find new leads without using credits
3. **Verify strategically** - Only verify emails you plan to contact
4. **Batch operations** - Use bulk verification instead of individual verifies
5. **Auto-enrichment** - Combines multiple operations efficiently
6. **Rate limiting** - Built-in delays prevent hitting API limits

### Typical Costs per Lead

| Workflow | Operations | Credits | Cost* |
|----------|------------|---------|-------|
| Basic | Email Count + Domain Search | 1 | $0.001 |
| Standard | + Email Verification | 1.5 | $0.0015 |
| Complete | + Email Enrichment + Company | 3 | $0.003 |
| Auto-Enrich | All operations | ~3-4 | $0.003-0.004 |

*Based on Hunter.io pricing (varies by plan)

---

## Database Fields

New fields added to `businesses` table:

### Hunter Enrichment
- `hunterEmailPattern`: Email pattern (e.g., "{first}{l}")
- `hunterEmailCount`: Total emails available
- `hunterVerificationStatus`: valid/invalid/risky
- `hunterVerificationScore`: 0-100
- `hunterVerifiedAt`: Verification timestamp
- `hunterEnrichedAt`: Enrichment timestamp

### Contact Details
- `contactPosition`: Job title
- `contactSeniority`: executive/senior/junior
- `contactDepartment`: Department name
- `contactLinkedin`: LinkedIn profile URL
- `contactTwitter`: Twitter handle
- `contactPhoneNumber`: Phone number
- `contactLocation`: City, State
- `contactTimezone`: Timezone

### Email Quality
- `emailConfidence`: 0-100 confidence score
- `emailDeliverability`: deliverable/undeliverable/risky
- `emailRiskLevel`: low/medium/high

---

## Rate Limits

Hunter.io rate limits (per second):
- Domain Search, Email Finder, Enrichment: **15 req/sec**
- Email Verifier: **10 req/sec**
- Discover: **5 req/sec**

Our implementation includes:
- Automatic rate limiting
- Batch processing with delays
- Request queuing
- Error handling and retries

---

## Best Practices

1. **Progressive Enrichment**
   - Start with free endpoints
   - Only use paid endpoints when needed
   - Use auto-enrichment for comprehensive data

2. **Data Freshness**
   - Re-enrich every 30-90 days
   - Monitor `hunterEnrichedAt` timestamps
   - Run nightly enrichment jobs

3. **Lead Scoring**
   - Recalculate scores after enrichment
   - Use scores to prioritize outreach
   - Focus on high-priority (75+) leads first

4. **Error Handling**
   - Check `success` field in responses
   - Handle rate limit errors gracefully
   - Log failed enrichments for retry

5. **Cost Control**
   - Monitor API usage in Hunter dashboard
   - Set monthly budget alerts
   - Use free endpoints whenever possible

---

## Next Steps

1. **Test the APIs** - Use the examples above to test each endpoint
2. **Enable Auto-Enrichment** - Set up nightly jobs to enrich pending leads
3. **Customize Scoring** - Adjust weights in `enhanced-lead-scoring.ts`
4. **Monitor Usage** - Track costs and enrichment rates
5. **Optimize Workflow** - Find the right balance of enrichment vs cost

---

## Support

- Hunter.io API Docs: https://hunter.io/api-documentation
- Hunter.io Dashboard: https://hunter.io/users/api
- Internal Issues: Create GitHub issue with [hunter] tag

---

**Updated**: January 2025
**Version**: 2.0.0
