import axios from 'axios';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;

if (!RAPIDAPI_KEY) {
  console.error('❌ Error: RAPIDAPI_KEY not found in .env.local');
  process.exit(1);
}

async function testDirectAPI() {
  console.log('🧪 Testing LinkedIn API directly...\n');
  
  try {
    console.log('Test 1: Real-Time LinkedIn Scraper - Get Company By Domain');
    console.log('URL: https://linkedin-data-api.p.rapidapi.com/get-company-by-domain');
    console.log('Domain: apple.com\n');
    
    const response = await axios.get(
      'https://linkedin-data-api.p.rapidapi.com/get-company-by-domain',
      {
        params: { domain: 'apple.com' },
        headers: {
          'X-RapidAPI-Key': RAPIDAPI_KEY,
          'X-RapidAPI-Host': 'linkedin-data-api.p.rapidapi.com',
        },
      }
    );

    console.log('✅ Response Status:', response.status);
    console.log('📥 Data:', JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.error('❌ Error:', error.response?.status, error.response?.statusText);
    console.error('📥 Error Data:', JSON.stringify(error.response?.data, null, 2));
  }
}

testDirectAPI().catch(console.error);
