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
      name: "Standard Clients",
      description: "Regular retail clients with standard access",
      riskLevel: "LOW" as const,
    },
    {
      name: "Premium Clients",
      description: "High-value clients with premium features",
      riskLevel: "MEDIUM" as const,
    },
    {
      name: "VIP Clients",
      description: "VIP clients with full access to all tools",
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

  // Standard clients get basic tools
  await prisma.groupTool.createMany({
    data: activeTools.slice(0, 2).map((tool) => ({
      groupId: createdGroups[0].id,
      toolId: tool.id,
    })),
    skipDuplicates: true,
  });

  // Premium clients get more tools
  await prisma.groupTool.createMany({
    data: activeTools.slice(0, 3).map((tool) => ({
      groupId: createdGroups[1].id,
      toolId: tool.id,
    })),
    skipDuplicates: true,
  });

  // VIP clients get all tools
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

  // Create demo customer user
  const customerPassword = await bcrypt.hash("customer123", 10);
  const customerUser = await prisma.user.upsert({
    where: { email: "customer@example.com" },
    update: {},
    create: {
      email: "customer@example.com",
      passwordHash: customerPassword,
      firstName: "John",
      lastName: "Smith",
      role: "CUSTOMER",
      status: "ACTIVE",
      emailVerified: true,
    },
  });

  // Add customer to Standard Clients group
  await prisma.userGroup.create({
    data: {
      userId: customerUser.id,
      groupId: createdGroups[0].id,
    },
  }).catch(() => {}); // Ignore if already exists

  console.log("✅ Customer user created (email: customer@example.com, password: customer123)");

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