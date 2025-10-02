import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// GET /api/tools/age-pension/scenarios/[scenarioId] - Get scenario details
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

    const scenario = await prisma.agePensionScenario.findFirst({
      where: {
        id: scenarioId,
        userId: user.id,
      },
      include: {
        assets: true,
        incomes: true,
        calculations: {
          orderBy: { calculatedAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!scenario) {
      return NextResponse.json({ error: "Scenario not found" }, { status: 404 });
    }

    return NextResponse.json({ scenario });
  } catch (error) {
    console.error("Error fetching scenario:", error);
    return NextResponse.json(
      { error: "Failed to fetch scenario" },
      { status: 500 }
    );
  }
}

// PUT /api/tools/age-pension/scenarios/[scenarioId] - Update scenario
export async function PUT(
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
    const existingScenario = await prisma.agePensionScenario.findFirst({
      where: {
        id: scenarioId,
        userId: user.id,
      },
    });

    if (!existingScenario) {
      return NextResponse.json({ error: "Scenario not found" }, { status: 404 });
    }

    const data = await req.json();

    const scenario = await prisma.agePensionScenario.update({
      where: { id: scenarioId },
      data: {
        name: data.name,
        dateOfBirth: new Date(data.dateOfBirth),
        partnerDOB: data.partnerDOB ? new Date(data.partnerDOB) : null,
        relationshipStatus: data.relationshipStatus,
        isHomeowner: data.isHomeowner,
        residencyYears: data.residencyYears,
      },
    });

    return NextResponse.json({ scenario });
  } catch (error) {
    console.error("Error updating scenario:", error);
    return NextResponse.json(
      { error: "Failed to update scenario" },
      { status: 500 }
    );
  }
}

// DELETE /api/tools/age-pension/scenarios/[scenarioId] - Delete scenario
export async function DELETE(
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

    await prisma.agePensionScenario.delete({
      where: { id: scenarioId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting scenario:", error);
    return NextResponse.json(
      { error: "Failed to delete scenario" },
      { status: 500 }
    );
  }
}