import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ advisorId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || (session.user as any).role !== "ADMIN") {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { advisorId } = await params;

    const advisor = await prisma.advisor.findUnique({
      where: { id: advisorId },
      include: {
        clients: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            status: true,
          },
        },
      },
    });

    if (!advisor) {
      return NextResponse.json(
        { error: "Advisor not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(advisor);
  } catch (error) {
    console.error("Failed to fetch advisor:", error);
    return NextResponse.json(
      { error: "Failed to fetch advisor" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ advisorId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || (session.user as any).role !== "ADMIN") {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { advisorId } = await params;
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

    // If email is being changed, check for duplicates
    if (email) {
      const existingAdvisor = await prisma.advisor.findFirst({
        where: {
          email,
          NOT: { id: advisorId },
        },
      });

      if (existingAdvisor) {
        return NextResponse.json(
          { error: "An advisor with this email already exists" },
          { status: 400 }
        );
      }
    }

    const updateData: any = {};
    if (firstName !== undefined) updateData.firstName = firstName;
    if (lastName !== undefined) updateData.lastName = lastName;
    if (email !== undefined) updateData.email = email;
    if (phone !== undefined) updateData.phone = phone;
    if (title !== undefined) updateData.title = title;
    if (credentials !== undefined) updateData.credentials = credentials;
    if (bio !== undefined) updateData.bio = bio;
    if (specialties !== undefined) updateData.specialties = specialties;
    if (yearsExperience !== undefined) updateData.yearsExperience = yearsExperience;
    if (profileImageUrl !== undefined) updateData.profileImageUrl = profileImageUrl;
    if (calendlyUrl !== undefined) updateData.calendlyUrl = calendlyUrl;
    if (availableHours !== undefined) updateData.availableHours = availableHours;
    if (rating !== undefined) updateData.rating = rating;
    if (isActive !== undefined) updateData.isActive = isActive;

    const advisor = await prisma.advisor.update({
      where: { id: advisorId },
      data: updateData,
      include: {
        _count: {
          select: {
            clients: true,
          },
        },
      },
    });

    // Log the action
    await prisma.activityLog.create({
      data: {
        userId: (session.user as any)?.id as string,
        action: "ADVISOR_UPDATE",
        entityType: "Advisor",
        entityId: advisorId,
        metadata: updateData,
      },
    });

    return NextResponse.json(advisor);
  } catch (error) {
    console.error("Failed to update advisor:", error);
    return NextResponse.json(
      { error: "Failed to update advisor" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ advisorId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || (session.user as any).role !== "ADMIN") {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { advisorId } = await params;

    // Check if advisor has any clients
    const advisor = await prisma.advisor.findUnique({
      where: { id: advisorId },
      include: {
        _count: {
          select: {
            clients: true,
          },
        },
      },
    });

    if (!advisor) {
      return NextResponse.json(
        { error: "Advisor not found" },
        { status: 404 }
      );
    }

    if (advisor._count.clients > 0) {
      return NextResponse.json(
        { error: "Cannot delete advisor with assigned clients. Please reassign clients first." },
        { status: 400 }
      );
    }

    await prisma.advisor.delete({
      where: { id: advisorId },
    });

    // Log the action
    await prisma.activityLog.create({
      data: {
        userId: (session.user as any)?.id as string,
        action: "ADVISOR_DELETE",
        entityType: "Advisor",
        entityId: advisorId,
        metadata: { email: advisor.email },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete advisor:", error);
    return NextResponse.json(
      { error: "Failed to delete advisor" },
      { status: 500 }
    );
  }
}