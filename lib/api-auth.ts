import { NextRequest, NextResponse } from "next/server";
import { createClient } from "./supabase/server";
import jwt from "jsonwebtoken";
import { getDb } from "./db";

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
 * Supports both Supabase Auth session (web) and JWT tokens (mobile)
 */
export async function authenticateApi(
  request: NextRequest
): Promise<{ user: ApiUser | null; error?: string }> {
  // First, try to get Supabase Auth session (for web app)
  const supabase = await createClient();
  const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

  if (!authError && authUser) {
    // Get user from database to get role and other details
    const db = await getDb();
    const { data: dbUser, error: dbError } = await db
      .from("User")
      .select("id, email, role, status, firstName, lastName")
      .eq("id", authUser.id)
      .single();

    if (!dbError && dbUser && dbUser.status !== "SUSPENDED") {
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
  const db = await getDb();
  const { data: dbUser, error: dbError } = await db
    .from("User")
    .select("id, email, role, status, firstName, lastName")
    .eq("id", user.id)
    .single();

  if (dbError || !dbUser || dbUser.status === "SUSPENDED") {
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