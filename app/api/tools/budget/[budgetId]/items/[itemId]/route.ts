import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// PUT /api/tools/budget/[budgetId]/items/[itemId] - Update item
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ budgetId: string; itemId: string }> }
) {
  try {
    const { budgetId, itemId } = await params;
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

    const item = await prisma.budgetItem.update({
      where: { id: itemId },
      data: {
        name: data.name,
        amount: data.amount,
        frequency: data.frequency,
        notes: data.notes,
        sortOrder: data.sortOrder,
      },
    });

    return NextResponse.json({ item });
  } catch (error) {
    console.error("Error updating budget item:", error);
    return NextResponse.json(
      { error: "Failed to update budget item" },
      { status: 500 }
    );
  }
}

// DELETE /api/tools/budget/[budgetId]/items/[itemId] - Delete item
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ budgetId: string; itemId: string }> }
) {
  try {
    const { budgetId, itemId } = await params;
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

    await prisma.budgetItem.delete({
      where: { id: itemId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting budget item:", error);
    return NextResponse.json(
      { error: "Failed to delete budget item" },
      { status: 500 }
    );
  }
}