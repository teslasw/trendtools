import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateApi, apiResponse, apiError } from "@/lib/api-auth";
import { z } from "zod";

// GET /api/user/profile - Get current user profile
export async function GET(request: NextRequest) {
  const { user, error } = await authenticateApi(request);

  if (!user) {
    return apiError(error || "Authentication required", "AUTH_REQUIRED", 401);
  }

  try {
    const profile = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        image: true,
        role: true,
        status: true,
        createdAt: true,
        userGroups: {
          include: {
            group: {
              select: {
                id: true,
                name: true,
                description: true,
                riskLevel: true,
              },
            },
          },
        },
      },
    });

    if (!profile) {
      return apiError("User not found", "NOT_FOUND", 404);
    }

    // TODO: Implement user preferences in a separate table
    const userPreferences = {
      notifications: true,
      emailUpdates: true,
      twoFactor: false,
    };

    return apiResponse({
      id: profile.id,
      email: profile.email,
      firstName: profile.firstName,
      lastName: profile.lastName,
      phone: profile.phone,
      image: profile.image,
      role: profile.role,
      status: profile.status,
      memberSince: profile.createdAt,
      groups: profile.userGroups.map(ug => ({
        id: ug.group.id,
        name: ug.group.name,
        description: ug.group.description,
        riskLevel: ug.group.riskLevel,
      })),
      preferences: userPreferences,
    });
  } catch (error) {
    console.error("Profile fetch error:", error);
    return apiError("Failed to fetch profile", "SERVER_ERROR", 500);
  }
}

// PUT /api/user/profile - Update user profile
const updateProfileSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  phone: z.string().optional(),
  dateOfBirth: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  country: z.string().optional(),
});

export async function PUT(request: NextRequest) {
  const { user, error } = await authenticateApi(request);

  if (!user) {
    return apiError(error || "Authentication required", "AUTH_REQUIRED", 401);
  }

  try {
    const body = await request.json();

    // Validate request
    const validation = updateProfileSchema.safeParse(body);
    if (!validation.success) {
      return apiError("Invalid request data", "VALIDATION_ERROR", 400, validation.error.errors);
    }

    const data = validation.data;

    // Update profile
    const updatedProfile = await prisma.user.update({
      where: { id: user.id },
      data: {
        ...(data.firstName && { firstName: data.firstName }),
        ...(data.lastName && { lastName: data.lastName }),
        ...(data.phone && { phone: data.phone }),
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        image: true,
        role: true,
        status: true,
      },
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: user.id,
        action: "UPDATE_PROFILE",
        metadata: {
          fields: Object.keys(data),
        },
      },
    });

    return apiResponse({
      message: "Profile updated successfully",
      profile: updatedProfile,
    });
  } catch (error) {
    console.error("Profile update error:", error);
    return apiError("Failed to update profile", "SERVER_ERROR", 500);
  }
}