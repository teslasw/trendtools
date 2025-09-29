import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || (session.user as any).role !== "ADMIN") {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { userId } = await params;
    const body = await request.json();
    const { status, role, firstName, lastName, phone, advisorId, groupIds } = body;

    const updateData: any = {};
    if (status !== undefined) updateData.status = status;
    if (role !== undefined) updateData.role = role;
    if (firstName !== undefined) updateData.firstName = firstName;
    if (lastName !== undefined) updateData.lastName = lastName;
    if (phone !== undefined) updateData.phone = phone;
    if (advisorId !== undefined) updateData.advisorId = advisorId;

    // Handle group updates separately
    if (groupIds !== undefined) {
      // First, remove all existing group associations
      await prisma.userGroup.deleteMany({
        where: { userId },
      });

      // Then, create new group associations
      if (groupIds.length > 0) {
        await prisma.userGroup.createMany({
          data: groupIds.map((groupId: string) => ({
            userId,
            groupId,
          })),
        });
      }
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      include: {
        userGroups: {
          include: {
            group: true,
          },
        },
        advisor: true,
      },
    });

    // Log the action
    await prisma.activityLog.create({
      data: {
        userId: (session.user as any)?.id as string,
        action: "USER_UPDATE",
        entityType: "User",
        entityId: userId,
        metadata: updateData,
      },
    });

    return NextResponse.json(user);
  } catch (error) {
    console.error("Failed to update user:", error);
    return NextResponse.json(
      { error: "Failed to update user" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || (session.user as any).role !== "ADMIN") {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { userId } = await params;

    // Don't allow deleting yourself
    if (userId === (session.user as any)?.id) {
      return NextResponse.json(
        { error: "Cannot delete your own account" },
        { status: 400 }
      );
    }

    await prisma.user.delete({
      where: { id: userId },
    });

    // Log the action
    await prisma.activityLog.create({
      data: {
        userId: (session.user as any)?.id as string,
        action: "USER_DELETE",
        entityType: "User",
        entityId: userId,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete user:", error);
    return NextResponse.json(
      { error: "Failed to delete user" },
      { status: 500 }
    );
  }
}