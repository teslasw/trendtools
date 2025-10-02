import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// GET /api/tools/age-pension/scenarios/[scenarioId]/incomes - List incomes
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ scenarioId: string }> }
) {
  try {
    const { scenarioId } = await params;
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
    const scenario = await prisma.agePensionScenario.findFirst({
      where: {
        id: scenarioId,
        userId: user.id,
      },
    });

    if (!scenario) {
      return NextResponse.json({ error: "Scenario not found" }, { status: 404 });
    }

    const incomes = await prisma.agePensionIncome.findMany({
      where: { scenarioId: scenarioId },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json({ incomes });
  } catch (error) {
    console.error("Error fetching incomes:", error);
    return NextResponse.json(
      { error: "Failed to fetch incomes" },
      { status: 500 }
    );
  }
}

// POST /api/tools/age-pension/scenarios/[scenarioId]/incomes - Add income
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ scenarioId: string }> }
) {
  try {
    const { scenarioId } = await params;
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
    const scenario = await prisma.agePensionScenario.findFirst({
      where: {
        id: scenarioId,
        userId: user.id,
      },
    });

    if (!scenario) {
      return NextResponse.json({ error: "Scenario not found" }, { status: 404 });
    }

    const data = await req.json();

    const income = await prisma.agePensionIncome.create({
      data: {
        scenarioId: scenarioId,
        category: data.category,
        owner: data.owner,
        description: data.description,
        amount: data.amount,
        frequency: data.frequency || "annual",
      },
    });

    return NextResponse.json({ income });
  } catch (error) {
    console.error("Error creating income:", error);
    return NextResponse.json(
      { error: "Failed to create income" },
      { status: 500 }
    );
  }
}

// PUT /api/tools/age-pension/scenarios/[scenarioId]/incomes/[incomeId] - Update income
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ scenarioId: string; incomeId: string }> }
) {
  try {
    const { scenarioId, incomeId } = await params;
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

    // Verify ownership through scenario
    const scenario = await prisma.agePensionScenario.findFirst({
      where: {
        id: scenarioId,
        userId: user.id,
      },
    });

    if (!scenario) {
      return NextResponse.json({ error: "Scenario not found" }, { status: 404 });
    }

    const data = await req.json();

    const income = await prisma.agePensionIncome.update({
      where: { id: incomeId },
      data: {
        category: data.category,
        owner: data.owner,
        description: data.description,
        amount: data.amount,
        frequency: data.frequency,
      },
    });

    return NextResponse.json({ income });
  } catch (error) {
    console.error("Error updating income:", error);
    return NextResponse.json(
      { error: "Failed to update income" },
      { status: 500 }
    );
  }
}

// DELETE /api/tools/age-pension/scenarios/[scenarioId]/incomes/[incomeId] - Delete income
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ scenarioId: string; incomeId: string }> }
) {
  try {
    const { scenarioId, incomeId } = await params;
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

    // Verify ownership through scenario
    const scenario = await prisma.agePensionScenario.findFirst({
      where: {
        id: scenarioId,
        userId: user.id,
      },
    });

    if (!scenario) {
      return NextResponse.json({ error: "Scenario not found" }, { status: 404 });
    }

    await prisma.agePensionIncome.delete({
      where: { id: incomeId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting income:", error);
    return NextResponse.json(
      { error: "Failed to delete income" },
      { status: 500 }
    );
  }
}