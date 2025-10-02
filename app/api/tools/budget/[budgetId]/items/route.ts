import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// POST /api/tools/budget/[budgetId]/items - Add budget item
export async function POST(
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

    // Verify budget ownership
    const budget = await prisma.budget.findFirst({
      where: {
        id: budgetId,
        userId: user.id,
      },
    });

    if (!budget) {
      return NextResponse.json({ error: "Budget not found" }, { status: 404 });
    }

    const data = await req.json();

    const item = await prisma.budgetItem.create({
      data: {
        budgetId: budgetId,
        type: data.type,
        category: data.category,
        name: data.name,
        amount: data.amount || 0,
        frequency: data.frequency || "monthly",
        notes: data.notes,
        isCustom: data.isCustom || false,
        sortOrder: data.sortOrder || 0,
      },
    });

    return NextResponse.json({ item });
  } catch (error) {
    console.error("Error creating budget item:", error);
    return NextResponse.json(
      { error: "Failed to create budget item" },
      { status: 500 }
    );
  }
}

// PATCH /api/tools/budget/[budgetId]/items - Batch update items
export async function PATCH(
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

    // Verify budget ownership
    const budget = await prisma.budget.findFirst({
      where: {
        id: budgetId,
        userId: user.id,
      },
    });

    if (!budget) {
      return NextResponse.json({ error: "Budget not found" }, { status: 404 });
    }

    const { items } = await req.json();

    // Update all items in a transaction
    const updates = items.map((item: any) =>
      prisma.budgetItem.update({
        where: { id: item.id },
        data: {
          amount: item.amount,
          frequency: item.frequency,
          notes: item.notes,
        },
      })
    );

    await prisma.$transaction(updates);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error batch updating items:", error);
    return NextResponse.json(
      { error: "Failed to update items" },
      { status: 500 }
    );
  }
}