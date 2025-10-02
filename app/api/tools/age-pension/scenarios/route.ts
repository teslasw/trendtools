import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// GET /api/tools/age-pension/scenarios - List user's scenarios
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

    const scenarios = await prisma.agePensionScenario.findMany({
      where: { userId: user.id },
      include: {
        calculations: {
          orderBy: { calculatedAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return NextResponse.json({ scenarios });
  } catch (error) {
    console.error("Error fetching scenarios:", error);
    return NextResponse.json(
      { error: "Failed to fetch scenarios" },
      { status: 500 }
    );
  }
}

// POST /api/tools/age-pension/scenarios - Create new scenario
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
    if (!data.name || !data.dateOfBirth || !data.relationshipStatus || data.isHomeowner === undefined || !data.residencyYears) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const scenario = await prisma.agePensionScenario.create({
      data: {
        userId: user.id,
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
    console.error("Error creating scenario:", error);
    return NextResponse.json(
      { error: "Failed to create scenario" },
      { status: 500 }
    );
  }
}