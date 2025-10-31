import axios from 'axios';
import fs from 'fs';

const GOOGLE_API_KEY = 'AIzaSyB9mztWPNN_daayvfDcpdch3iiRzviullQ';

async function testVisionAPI() {
  console.log('🧪 Testing Google Vision API...\n');
  
  // Create a simple test image (1x1 white pixel PNG in base64)
  const testImageBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';
  
  try {
    console.log('Sending test request to Google Vision API...\n');
    
    const response = await axios.post(
      `https://vision.googleapis.com/v1/images:annotate?key=${GOOGLE_API_KEY}`,
      {
        requests: [{
          image: { content: testImageBase64 },
          features: [{ type: 'TEXT_DETECTION', maxResults: 1 }]
        }]
      }
    );

    console.log('✅ SUCCESS! Google Vision API is enabled and working!');
    console.log('📥 Response:', JSON.stringify(response.data, null, 2));
    console.log('\n✨ Your Google Maps API key works for Vision API too!');
    console.log('No additional setup needed - OCR is ready to use!\n');
    
  } catch (error) {
    if (error.response?.status === 403) {
      console.log('❌ Google Vision API is NOT enabled for this API key\n');
      console.log('📋 To enable it:');
      console.log('1. Go to: https://console.cloud.google.com/apis/library/vision.googleapis.com');
      console.log('2. Click "ENABLE"');
      console.log('3. Wait 1-2 minutes for activation\n');
    } else {
      console.error('❌ Error:', error.response?.status, error.response?.statusText);
      console.error('📥 Details:', JSON.stringify(error.response?.data, null, 2));
    }
  }
}

testVisionAPI().catch(console.error);
