const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const format = await prisma.statementFormat.findFirst({
    where: {
      bankName: 'American Express'
    }
  });

  if (format) {
    console.log('=== FULL EXTRACTION CODE ===');
    console.log(format.extractionCode);
    console.log('=== END ===');
    console.log(`\nLength: ${format.extractionCode?.length || 0} characters`);
  } else {
    console.log('No format found for American Express');
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
