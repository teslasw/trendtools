import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const format = await prisma.statementFormat.findFirst({
    where: { bankName: 'American Express' }
  });

  if (format?.extractionCode) {
    console.log(format.extractionCode);
  } else {
    console.log('No code found');
  }
}

main().finally(() => prisma.$disconnect());
