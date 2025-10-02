import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// GET /api/tools/age-pension/scenarios/[scenarioId]/assets - List assets
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

    const assets = await prisma.agePensionAsset.findMany({
      where: { scenarioId: scenarioId },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json({ assets });
  } catch (error) {
    console.error("Error fetching assets:", error);
    return NextResponse.json(
      { error: "Failed to fetch assets" },
      { status: 500 }
    );
  }
}

// POST /api/tools/age-pension/scenarios/[scenarioId]/assets - Add asset
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

    const asset = await prisma.agePensionAsset.create({
      data: {
        scenarioId: scenarioId,
        category: data.category,
        owner: data.owner,
        description: data.description,
        amount: data.amount,
        isExempt: data.isExempt || false,
      },
    });

    return NextResponse.json({ asset });
  } catch (error) {
    console.error("Error creating asset:", error);
    return NextResponse.json(
      { error: "Failed to create asset" },
      { status: 500 }
    );
  }
}

// PUT /api/tools/age-pension/scenarios/[scenarioId]/assets/[assetId] - Update asset
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ scenarioId: string; assetId: string }> }
) {
  try {
    const { scenarioId, assetId } = await params;
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

    const asset = await prisma.agePensionAsset.update({
      where: { id: assetId },
      data: {
        category: data.category,
        owner: data.owner,
        description: data.description,
        amount: data.amount,
        isExempt: data.isExempt,
      },
    });

    return NextResponse.json({ asset });
  } catch (error) {
    console.error("Error updating asset:", error);
    return NextResponse.json(
      { error: "Failed to update asset" },
      { status: 500 }
    );
  }
}

// DELETE /api/tools/age-pension/scenarios/[scenarioId]/assets/[assetId] - Delete asset
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ scenarioId: string; assetId: string }> }
) {
  try {
    const { scenarioId, assetId } = await params;
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

    await prisma.agePensionAsset.delete({
      where: { id: assetId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting asset:", error);
    return NextResponse.json(
      { error: "Failed to delete asset" },
      { status: 500 }
    );
  }
}