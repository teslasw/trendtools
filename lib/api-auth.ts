import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "./auth";
import jwt from "jsonwebtoken";
import { prisma } from "./prisma";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production";

export interface ApiUser {
  id: string;
  email: string;
  role: string;
  firstName?: string;
  lastName?: string;
}

/**
 * Generate JWT token for mobile/API access
 */
export function generateApiToken(user: ApiUser): string {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
    },
    JWT_SECRET,
    { expiresIn: "30d" }
  );
}

/**
 * Generate refresh token
 */
export function generateRefreshToken(userId: string): string {
  return jwt.sign(
    { id: userId, type: "refresh" },
    JWT_SECRET,
    { expiresIn: "90d" }
  );
}

/**
 * Verify JWT token
 */
export function verifyApiToken(token: string): ApiUser | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    return {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
    };
  } catch (error) {
    return null;
  }
}

/**
 * API authentication middleware
 * Supports both NextAuth session (web) and JWT tokens (mobile)
 */
export async function authenticateApi(
  request: NextRequest
): Promise<{ user: ApiUser | null; error?: string }> {
  // First, try to get NextAuth session (for web app)
  const session = await getServerSession(authOptions);
  if (session?.user) {
    return {
      user: {
        id: (session.user as any).id,
        email: session.user.email!,
        role: (session.user as any).role,
        firstName: session.user.name?.split(" ")[0],
        lastName: session.user.name?.split(" ")[1],
      },
    };
  }

  // If no session, check for Bearer token (for mobile/API)
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return { user: null, error: "No authentication provided" };
  }

  const token = authHeader.substring(7);
  const user = verifyApiToken(token);

  if (!user) {
    return { user: null, error: "Invalid or expired token" };
  }

  // Verify user still exists and is active
  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      id: true,
      email: true,
      role: true,
      status: true,
      firstName: true,
      lastName: true
    },
  });

  if (!dbUser || dbUser.status === "SUSPENDED") {
    return { user: null, error: "User account is not active" };
  }

  return {
    user: {
      id: dbUser.id,
      email: dbUser.email,
      role: dbUser.role,
      firstName: dbUser.firstName || undefined,
      lastName: dbUser.lastName || undefined,
    },
  };
}

/**
 * Create API response with proper headers
 */
export function apiResponse(
  data: any,
  status: number = 200,
  headers: Record<string, string> = {}
): NextResponse {
  return NextResponse.json(data, {
    status,
    headers: {
      "Content-Type": "application/json",
      "X-API-Version": "1.0",
      ...headers,
    },
  });
}

/**
 * Create API error response
 */
export function apiError(
  message: string,
  code: string = "ERROR",
  status: number = 400,
  details?: any
): NextResponse {
  return apiResponse(
    {
      error: {
        code,
        message,
        details,
      },
    },
    status
  );
}

/**
 * Rate limiting helper
 */
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

export function checkRateLimit(
  identifier: string,
  limit: number = 100,
  windowMs: number = 60000
): boolean {
  const now = Date.now();
  const userLimit = rateLimitMap.get(identifier);

  if (!userLimit || userLimit.resetTime < now) {
    rateLimitMap.set(identifier, {
      count: 1,
      resetTime: now + windowMs,
    });
    return true;
  }

  if (userLimit.count >= limit) {
    return false;
  }

  userLimit.count++;
  return true;
}