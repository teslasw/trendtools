import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || (session.user as any).role !== "ADMIN") {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const advisors = await prisma.advisor.findMany({
      include: {
        _count: {
          select: {
            clients: true,
          },
        },
      },
      orderBy: {
        lastName: "asc",
      },
    });

    return NextResponse.json(advisors);
  } catch (error) {
    console.error("Failed to fetch advisors:", error);
    return NextResponse.json(
      { error: "Failed to fetch advisors" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || (session.user as any).role !== "ADMIN") {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      firstName,
      lastName,
      email,
      phone,
      title,
      credentials,
      bio,
      specialties,
      yearsExperience,
      profileImageUrl,
      calendlyUrl,
      availableHours,
      rating,
      isActive,
    } = body;

    // Check if email already exists
    const existingAdvisor = await prisma.advisor.findUnique({
      where: { email },
    });

    if (existingAdvisor) {
      return NextResponse.json(
        { error: "An advisor with this email already exists" },
        { status: 400 }
      );
    }

    const advisor = await prisma.advisor.create({
      data: {
        firstName,
        lastName,
        email,
        phone,
        title,
        credentials,
        bio,
        specialties: specialties || [],
        yearsExperience,
        profileImageUrl,
        calendlyUrl,
        availableHours,
        rating: rating || 4.9,
        isActive: isActive !== undefined ? isActive : true,
      },
    });

    // Log the action
    await prisma.activityLog.create({
      data: {
        userId: (session.user as any)?.id as string,
        action: "ADVISOR_CREATE",
        entityType: "Advisor",
        entityId: advisor.id,
        metadata: { email: advisor.email },
      },
    });

    return NextResponse.json(advisor);
  } catch (error) {
    console.error("Failed to create advisor:", error);
    return NextResponse.json(
      { error: "Failed to create advisor" },
      { status: 500 }
    );
  }
}