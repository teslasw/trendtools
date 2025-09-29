import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function testConnection() {
  try {
    console.log("Testing database connection...\n");

    // Count users
    const userCount = await prisma.user.count();
    console.log(`✅ Users in database: ${userCount}`);

    // Count categories
    const categoryCount = await prisma.category.count();
    console.log(`✅ Categories in database: ${categoryCount}`);

    // Count tools
    const toolCount = await prisma.tool.count();
    console.log(`✅ Tools in database: ${toolCount}`);

    // Count groups
    const groupCount = await prisma.group.count();
    console.log(`✅ Groups in database: ${groupCount}`);

    // List users
    const users = await prisma.user.findMany({
      select: {
        email: true,
        role: true,
        status: true,
      },
    });

    console.log("\n📋 Users:");
    users.forEach((user) => {
      console.log(`   - ${user.email} (${user.role}, ${user.status})`);
    });

    console.log("\n✨ Database connection successful!");
  } catch (error) {
    console.error("❌ Database connection failed:", error);
  } finally {
    await prisma.$disconnect();
  }
}

testConnection();