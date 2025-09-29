import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Starting database seed...");

  // Create default categories
  const categories = [
    { name: "Food & Dining", color: "#FF6B6B", icon: "utensils" },
    { name: "Transportation", color: "#4ECDC4", icon: "car" },
    { name: "Shopping", color: "#45B7D1", icon: "shopping-bag" },
    { name: "Entertainment", color: "#96CEB4", icon: "tv" },
    { name: "Bills & Utilities", color: "#FECA57", icon: "file-text" },
    { name: "Healthcare", color: "#48C9B0", icon: "heart" },
    { name: "Education", color: "#9B59B6", icon: "graduation-cap" },
    { name: "Travel", color: "#3498DB", icon: "plane" },
    { name: "Insurance", color: "#E74C3C", icon: "shield" },
    { name: "Investments", color: "#2ECC71", icon: "trending-up" },
  ];

  for (const category of categories) {
    await prisma.category.upsert({
      where: { name: category.name },
      update: {},
      create: {
        ...category,
        isSystem: true,
      },
    });
  }

  console.log("✅ Categories created");

  // Create default tools
  const tools = [
    {
      name: "Superannuation Calculator",
      slug: "super-calculator",
      description: "Calculate and optimize your superannuation contributions and growth",
      isActive: true,
    },
    {
      name: "Spending Analyzer",
      slug: "spending-analyzer",
      description: "Analyze your spending patterns with AI-powered insights",
      isActive: true,
    },
    {
      name: "Budget Planner",
      slug: "budget-planner",
      description: "Plan and track your monthly budget",
      isActive: true,
    },
    {
      name: "Investment Portfolio",
      slug: "investment-portfolio",
      description: "Track and analyze your investment portfolio",
      isActive: false,
    },
  ];

  for (const tool of tools) {
    await prisma.tool.upsert({
      where: { slug: tool.slug },
      update: {},
      create: tool,
    });
  }

  console.log("✅ Tools created");

  // Create default groups
  const groups = [
    {
      name: "Free Users",
      description: "Free account users with limited access",
      riskLevel: "LOW" as const,
    },
    {
      name: "Advisory Clients",
      description: "Trend Advisory clients with full feature access",
      riskLevel: "MEDIUM" as const,
    },
    {
      name: "Premium Advisory Clients",
      description: "Premium advisory clients with VIP features",
      riskLevel: "HIGH" as const,
    },
  ];

  const createdGroups = [];
  for (const group of groups) {
    const created = await prisma.group.upsert({
      where: { name: group.name },
      update: {},
      create: group,
    });
    createdGroups.push(created);
  }

  console.log("✅ Groups created");

  // Assign tools to groups
  const activeTools = await prisma.tool.findMany({ where: { isActive: true } });

  // Free users get only basic tools (spending analyzer)
  const spendingAnalyzer = await prisma.tool.findFirst({ where: { slug: "spending-analyzer" } });
  if (spendingAnalyzer) {
    await prisma.groupTool.create({
      data: {
        groupId: createdGroups[0].id,
        toolId: spendingAnalyzer.id,
      },
    }).catch(() => {});
  }

  // Advisory clients get all active tools
  await prisma.groupTool.createMany({
    data: activeTools.map((tool) => ({
      groupId: createdGroups[1].id,
      toolId: tool.id,
    })),
    skipDuplicates: true,
  });

  // Premium Advisory clients get all tools (including inactive ones)
  const allTools = await prisma.tool.findMany();
  await prisma.groupTool.createMany({
    data: allTools.map((tool) => ({
      groupId: createdGroups[2].id,
      toolId: tool.id,
    })),
    skipDuplicates: true,
  });

  console.log("✅ Tool permissions assigned to groups");

  // Create demo admin user
  const adminPassword = await bcrypt.hash("admin123", 10);
  const adminUser = await prisma.user.upsert({
    where: { email: "admin@trendadvisory.com" },
    update: {},
    create: {
      email: "admin@trendadvisory.com",
      passwordHash: adminPassword,
      firstName: "Admin",
      lastName: "User",
      role: "ADMIN",
      status: "ACTIVE",
      emailVerified: true,
    },
  });

  console.log("✅ Admin user created (email: admin@trendadvisory.com, password: admin123)");

  // Create demo advisory client user
  const clientPassword = await bcrypt.hash("client123", 10);
  const clientUser = await prisma.user.upsert({
    where: { email: "client@example.com" },
    update: {},
    create: {
      email: "client@example.com",
      passwordHash: clientPassword,
      firstName: "Jane",
      lastName: "Doe",
      role: "CUSTOMER",
      status: "ACTIVE",
      emailVerified: true,
      advisorId: "advisor-001",
    },
  });

  // Add advisory client to Advisory Clients group
  await prisma.userGroup.create({
    data: {
      userId: clientUser.id,
      groupId: createdGroups[1].id, // Advisory Clients group
    },
  }).catch(() => {}); // Ignore if already exists

  console.log("✅ Advisory client created (email: client@example.com, password: client123)");

  // Create demo FREE user
  const freePassword = await bcrypt.hash("free123", 10);
  const freeUser = await prisma.user.upsert({
    where: { email: "freeuser@example.com" },
    update: {},
    create: {
      email: "freeuser@example.com",
      passwordHash: freePassword,
      firstName: "Bob",
      lastName: "Wilson",
      role: "CUSTOMER",
      status: "ACTIVE",
      emailVerified: true,
    },
  });

  // Add free user to Free Users group
  await prisma.userGroup.create({
    data: {
      userId: freeUser.id,
      groupId: createdGroups[0].id, // Free Users group
    },
  }).catch(() => {}); // Ignore if already exists

  console.log("✅ Free user created (email: freeuser@example.com, password: free123)");

  // Create demo premium advisory client
  const premiumPassword = await bcrypt.hash("premium123", 10);
  const premiumUser = await prisma.user.upsert({
    where: { email: "premium@example.com" },
    update: {},
    create: {
      email: "premium@example.com",
      passwordHash: premiumPassword,
      firstName: "Victoria",
      lastName: "Sterling",
      role: "CUSTOMER",
      status: "ACTIVE",
      emailVerified: true,
      advisorId: "advisor-002",
    },
  });

  // Add premium user to Premium Advisory Clients group
  await prisma.userGroup.create({
    data: {
      userId: premiumUser.id,
      groupId: createdGroups[2].id, // Premium Advisory Clients group
    },
  }).catch(() => {}); // Ignore if already exists

  console.log("✅ Premium advisory client created (email: premium@example.com, password: premium123)");

  console.log("✨ Database seed completed successfully!");
}

main()
  .catch((e) => {
    console.error("Error seeding database:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });