import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function createAppleTest() {
  console.log('Creating test business: Apple Inc\n');
  
  const apple = await prisma.business.create({
    data: {
      businessName: 'Apple Inc',
      website: 'apple.com',
      email: 'info@apple.com',
      businessType: 'Technology',
      reviewStatus: 'approved',
    },
  });

  console.log('✅ Created:');
  console.log(`   ID: ${apple.id}`);
  console.log(`   Name: ${apple.businessName}`);
  console.log(`   Website: ${apple.website}\n`);

  await prisma.$disconnect();

  return apple.id;
}

createAppleTest().then(id => {
  console.log('🧪 Now testing LinkedIn enrichment...\n');
  
  import('node:child_process').then(({ execSync }) => {
    try {
      const result = execSync(
        `curl -X POST 'http://localhost:3000/api/businesses/${id}/enrich' -H 'Content-Type: application/json' -d '{"action":"linkedin"}' -s`,
        { encoding: 'utf8' }
      );
      
      console.log('📥 API Response:');
      console.log(JSON.stringify(JSON.parse(result), null, 2));
    } catch (error) {
      console.error('Error:', error.message);
    }
  });
}).catch(console.error);
