import axios from 'axios';

const RAPIDAPI_KEY = 'd33edf8110mshfe0f925e654598bp101c17jsn383f5665a799';

async function testFreshAPI() {
  console.log('🧪 Testing Fresh LinkedIn Profile Data API...\n');
  
  try {
    console.log('Test: Get Company by URL');
    console.log('LinkedIn URL: https://www.linkedin.com/company/apple\n');
    
    const response = await axios.get(
      'https://fresh-linkedin-profile-data.p.rapidapi.com/get-company-by-linkedinurl',
      {
        params: { linkedin_url: 'https://www.linkedin.com/company/apple' },
        headers: {
          'X-RapidAPI-Key': RAPIDAPI_KEY,
          'X-RapidAPI-Host': 'fresh-linkedin-profile-data.p.rapidapi.com',
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

testFreshAPI().catch(console.error);
