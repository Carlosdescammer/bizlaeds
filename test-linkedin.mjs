import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testLinkedIn() {
  console.log('🔍 Checking for businesses to test...\n');

  const businesses = await prisma.business.findMany({
    take: 5,
    select: {
      id: true,
      businessName: true,
      website: true,
      email: true,
      linkedinUrl: true,
    },
  });

  if (businesses.length === 0) {
    console.log('❌ No businesses found in database');
    console.log('Let\'s create a test business...\n');

    // Create a test business with Apple's website
    const testBusiness = await prisma.business.create({
      data: {
        businessName: 'Apple Inc',
        website: 'apple.com',
        email: 'info@apple.com',
        businessType: 'Technology',
        reviewStatus: 'approved',
      },
    });

    console.log('✅ Created test business:');
    console.log(`   Name: ${testBusiness.businessName}`);
    console.log(`   ID: ${testBusiness.id}`);
    console.log(`   Website: ${testBusiness.website}\n`);

    await prisma.$disconnect();

    console.log('🧪 Now run this command to test LinkedIn enrichment:');
    console.log(`\ncurl -X POST "http://localhost:3000/api/businesses/${testBusiness.id}/enrich" \\`);
    console.log(`  -H "Content-Type: application/json" \\`);
    console.log(`  -d '{"action": "linkedin"}'\n`);

    return;
  }

  console.log('📋 Sample businesses:\n');
  businesses.forEach((b, i) => {
    console.log(`${i + 1}. ${b.businessName}`);
    console.log(`   ID: ${b.id}`);
    console.log(`   Website: ${b.website || 'None'}`);
    console.log(`   Email: ${b.email || 'None'}`);
    console.log(`   LinkedIn: ${b.linkedinUrl || 'None'}`);
    console.log('');
  });

  // Find a business with website but no LinkedIn URL
  const testBusiness = businesses.find(b => b.website && !b.linkedinUrl) || businesses[0];

  console.log(`\n🎯 Best candidate for testing: ${testBusiness.businessName}`);
  console.log(`   ID: ${testBusiness.id}`);
  console.log(`   Website: ${testBusiness.website || 'N/A'}\n`);

  await prisma.$disconnect();

  console.log('🧪 Run this command to test LinkedIn enrichment:');
  console.log(`\ncurl -X POST "http://localhost:3000/api/businesses/${testBusiness.id}/enrich" \\`);
  console.log(`  -H "Content-Type: application/json" \\`);
  console.log(`  -d '{"action": "linkedin"}'\n`);
}

testLinkedIn().catch(console.error);
