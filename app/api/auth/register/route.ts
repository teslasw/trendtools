import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, firstName, lastName, phone } = body;

    // Validate input
    if (!email || !password || !firstName || !lastName) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "User with this email already exists" },
        { status: 400 }
      );
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        firstName,
        lastName,
        phone: phone || null,
        role: "CUSTOMER",
        status: "ACTIVE",
        emailVerified: false,
      },
    });

    // Add user to default group (Standard Clients)
    const defaultGroup = await prisma.group.findFirst({
      where: { name: "Standard Clients" },
    });

    if (defaultGroup) {
      await prisma.userGroup.create({
        data: {
          userId: user.id,
          groupId: defaultGroup.id,
        },
      });
    }

    // Log registration activity
    await prisma.activityLog.create({
      data: {
        userId: user.id,
        action: "REGISTRATION",
        metadata: {
          method: "email",
        },
      },
    });

    return NextResponse.json(
      {
        message: "User created successfully",
        userId: user.id
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "An error occurred during registration" },
      { status: 500 }
    );
  }
}