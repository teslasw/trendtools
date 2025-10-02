import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { generateApiToken, generateRefreshToken, apiResponse, apiError } from "@/lib/api-auth";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate request
    const validation = loginSchema.safeParse(body);
    if (!validation.success) {
      return apiError("Invalid request data", "VALIDATION_ERROR", 400, validation.error.errors);
    }

    const { email, password } = validation.data;

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        userGroups: {
          include: {
            group: true,
          },
        },
      },
    });

    if (!user || !user.passwordHash) {
      return apiError("Invalid credentials", "AUTH_INVALID", 401);
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      return apiError("Invalid credentials", "AUTH_INVALID", 401);
    }

    // Check if account is active
    if (user.status === "SUSPENDED") {
      return apiError("Account is suspended", "ACCOUNT_SUSPENDED", 403);
    }

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: user.id,
        action: "SIGN_IN",
        metadata: {
          method: "api",
          ip: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip"),
        },
      },
    });

    // Generate tokens
    const token = generateApiToken({
      id: user.id,
      email: user.email,
      role: user.role,
      firstName: user.firstName || undefined,
      lastName: user.lastName || undefined,
    });

    const refreshToken = generateRefreshToken(user.id);

    // Return user data and tokens
    return apiResponse({
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        groups: user.userGroups.map(ug => ({
          id: ug.group.id,
          name: ug.group.name,
          riskLevel: ug.group.riskLevel,
        })),
      },
      token,
      refreshToken,
    });
  } catch (error) {
    console.error("Login error:", error);
    return apiError("An error occurred during login", "SERVER_ERROR", 500);
  }
}