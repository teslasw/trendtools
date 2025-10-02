import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// GET /api/tools/budget/[budgetId] - Get budget with all items
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ budgetId: string }> }
) {
  try {
    const { budgetId } = await params;
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

    const budget = await prisma.budget.findFirst({
      where: {
        id: budgetId,
        userId: user.id,
      },
      include: {
        items: {
          orderBy: [
            { type: 'asc' },
            { category: 'asc' },
            { sortOrder: 'asc' },
          ],
        },
      },
    });

    if (!budget) {
      return NextResponse.json({ error: "Budget not found" }, { status: 404 });
    }

    return NextResponse.json({ budget });
  } catch (error) {
    console.error("Error fetching budget:", error);
    return NextResponse.json(
      { error: "Failed to fetch budget" },
      { status: 500 }
    );
  }
}

// PUT /api/tools/budget/[budgetId] - Update budget
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ budgetId: string }> }
) {
  try {
    const { budgetId } = await params;
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

    // Verify ownership
    const existingBudget = await prisma.budget.findFirst({
      where: {
        id: budgetId,
        userId: user.id,
      },
    });

    if (!existingBudget) {
      return NextResponse.json({ error: "Budget not found" }, { status: 404 });
    }

    const data = await req.json();

    // If setting as active, deactivate others
    if (data.isActive && !existingBudget.isActive) {
      await prisma.budget.updateMany({
        where: { userId: user.id, isActive: true },
        data: { isActive: false },
      });
    }

    const budget = await prisma.budget.update({
      where: { id: budgetId },
      data: {
        name: data.name,
        description: data.description,
        period: data.period,
        isActive: data.isActive,
      },
      include: {
        items: {
          orderBy: [
            { type: 'asc' },
            { category: 'asc' },
            { sortOrder: 'asc' },
          ],
        },
      },
    });

    return NextResponse.json({ budget });
  } catch (error) {
    console.error("Error updating budget:", error);
    return NextResponse.json(
      { error: "Failed to update budget" },
      { status: 500 }
    );
  }
}

// DELETE /api/tools/budget/[budgetId] - Delete budget
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ budgetId: string }> }
) {
  try {
    const { budgetId } = await params;
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

    // Verify ownership
    const budget = await prisma.budget.findFirst({
      where: {
        id: budgetId,
        userId: user.id,
      },
    });

    if (!budget) {
      return NextResponse.json({ error: "Budget not found" }, { status: 404 });
    }

    await prisma.budget.delete({
      where: { id: budgetId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting budget:", error);
    return NextResponse.json(
      { error: "Failed to delete budget" },
      { status: 500 }
    );
  }
}