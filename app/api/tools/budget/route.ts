import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// GET /api/tools/budget - List user's budgets
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const budgets = await prisma.budget.findMany({
      where: { userId: user.id },
      include: {
        items: {
          orderBy: { sortOrder: 'asc' },
        },
        _count: {
          select: { items: true },
        },
      },
      orderBy: [
        { isActive: 'desc' },
        { updatedAt: 'desc' },
      ],
    });

    return NextResponse.json({ budgets });
  } catch (error) {
    console.error("Error fetching budgets:", error);
    return NextResponse.json(
      { error: "Failed to fetch budgets" },
      { status: 500 }
    );
  }
}

// POST /api/tools/budget - Create new budget
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const data = await req.json();

    // Validate required fields
    if (!data.name) {
      return NextResponse.json(
        { error: "Budget name is required" },
        { status: 400 }
      );
    }

    // Deactivate other budgets if this one is set as active
    if (data.isActive) {
      await prisma.budget.updateMany({
        where: { userId: user.id, isActive: true },
        data: { isActive: false },
      });
    }

    const budget = await prisma.budget.create({
      data: {
        userId: user.id,
        name: data.name,
        description: data.description,
        period: data.period || "monthly",
        isActive: data.isActive !== undefined ? data.isActive : true,
      },
      include: {
        items: true,
      },
    });

    return NextResponse.json({ budget });
  } catch (error) {
    console.error("Error creating budget:", error);
    return NextResponse.json(
      { error: "Failed to create budget" },
      { status: 500 }
    );
  }
}