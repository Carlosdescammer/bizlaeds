# OCR Business Card Scanning - Setup Guide

## ✅ Current Status
- **Code:** ✅ Fully implemented and deployed
- **API Key:** ✅ Added to environment variables
- **Google Vision API:** ❌ **Needs to be enabled** (2-minute setup)

## 🚀 Quick Setup (Only 2 steps!)

### Step 1: Enable Google Vision API
1. Go to: **https://console.cloud.google.com/apis/library/vision.googleapis.com**
2. Click the **"ENABLE"** button
3. Wait 1-2 minutes for activation

### Step 2: Test It!
Once enabled, run:
```bash
node test-vision-api.mjs
```

If you see "✅ SUCCESS!", you're ready to go!

## 📖 How to Use OCR

### Option 1: Single Business Card
```bash
POST /api/business-card
Content-Type: application/json

{
  "image": "data:image/jpeg;base64,/9j/4AAQSkZJRg...",
  "userId": "optional-user-id"
}
```

### Option 2: Batch Processing
```bash
POST /api/business-card
Content-Type: application/json

{
  "images": [
    {
      "id": "card1",
      "data": "data:image/jpeg;base64,/9j/4AAQSkZJRg..."
    },
    {
      "id": "card2",
      "data": "data:image/jpeg;base64,iVBORw0KGgoAAAANSUhEUgAA..."
    }
  ],
  "userId": "optional-user-id"
}
```

## 🔍 What OCR Extracts

The system automatically detects and extracts:
- ✉️ **Email addresses**
- 📞 **Phone numbers** (all formats)
- 🌐 **Website URLs**
- 👤 **Contact name** (person on card)
- 🏢 **Business name**
- 💼 **Job title**
- 📍 **Physical address**
- 🏭 **Industry** (auto-detected from keywords)

## 💡 What Happens After Extraction

1. **Text Detection:** Google Vision API extracts all text from image
2. **Smart Parsing:** AI identifies field types (email, phone, etc.)
3. **Data Quality:** Runs through validation & normalization
4. **Deduplication:** Checks for existing businesses
5. **Auto-Enrichment:** Attempts to find LinkedIn, website data
6. **Lead Scoring:** Calculates relevance score (0-100)
7. **Database Save:** Creates business record with all data

## 📊 API Response Example

### Success Response:
```json
{
  "success": true,
  "businessId": "f4c40763-488f-4d10-94a3-c2b95c92fd74",
  "extractedData": {
    "businessName": "Apple Inc",
    "contactName": "Tim Cook",
    "email": "tcook@apple.com",
    "phone": "+1 (408) 996-1010",
    "website": "apple.com",
    "jobTitle": "CEO",
    "address": "1 Apple Park Way",
    "industry": "technology"
  }
}
```

### Error Response:
```json
{
  "success": false,
  "error": "Could not extract sufficient business information from the image"
}
```

## 💰 Pricing

Google Vision API costs approximately:
- **$1.50** per 1,000 images (first 1,000/month free)
- **$0.0015** per business card

Your current Google Maps API key is already configured to work with Vision API once you enable it!

## 🧪 Testing

### Test with a sample image:
```bash
# Create test business card
curl -X POST 'http://localhost:3001/api/business-card' \
  -H 'Content-Type: application/json' \
  -d '{
    "image": "data:image/png;base64,YOUR_BASE64_IMAGE_HERE"
  }'
```

### Check OCR statistics:
```bash
curl http://localhost:3001/api/business-card
```

Returns:
```json
{
  "totalOCRProcessed": 15,
  "successfulOCR": 12,
  "failedOCR": 3,
  "successRate": 80,
  "totalCost": 0.0225
}
```

## 🔧 Troubleshooting

### "Vision API not enabled"
→ Go to https://console.cloud.google.com/apis/library/vision.googleapis.com and click ENABLE

### "Could not extract text"
→ Make sure image is clear and high quality
→ Business cards should be well-lit and in focus

### "No text detected"
→ Image might be too blurry
→ Try increasing image resolution

## 📚 Production URLs

- **Local:** http://localhost:3001/api/business-card
- **Production:** https://bizleads-webapp-7emm6om3c-jean-oreliens-projects.vercel.app/api/business-card

## ⚡ Next Steps

1. **Enable Vision API** (link above)
2. **Test with sample card**
3. **Integrate with your workflow**
4. **Monitor usage via /api/business-card GET endpoint**

That's it! OCR is ready to use once you enable the Vision API.
