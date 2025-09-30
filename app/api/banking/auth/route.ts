import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { basiqClient } from "@/lib/basiq";

// POST /api/banking/auth - Get Basiq Connect token
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    // Check if user has an advisor (required for bank connections)
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { advisorId: true, email: true },
    });

    if (!user?.advisorId) {
      return NextResponse.json(
        { error: "Bank connections are only available for advisory clients" },
        { status: 403 }
      );
    }

    // Check for existing Basiq user or create new one
    let bankConnection = await prisma.bankConnection.findFirst({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });

    let basiqUserId = bankConnection?.basiqUserId;

    if (!basiqUserId) {
      // Create new Basiq user
      basiqUserId = await basiqClient.createUser(
        user.email || `user_${userId}@trendadvisory.com`
      );

      // Store the Basiq user ID
      await prisma.bankConnection.create({
        data: {
          userId,
          basiqUserId,
          basiqConnectionId: "", // Will be updated after connection
          institutionId: "",
          institutionName: "Pending",
          status: "pending",
        },
      });
    }

    // Create consent and get the URL
    const consent = await basiqClient.createConsent(
      userId,
      basiqUserId,
      "Connect your bank accounts for spending analysis"
    );

    return NextResponse.json({
      consentUrl: consent.url,
      userId: basiqUserId,
      connectionId: bankConnection?.id || "",
    });
  } catch (error) {
    console.error("Error getting Basiq auth:", error);
    return NextResponse.json(
      { error: "Failed to authenticate with Basiq" },
      { status: 500 }
    );
  }
}

// GET /api/banking/auth - Check connection status
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const connections = await prisma.bankConnection.findMany({
      where: { userId: session.user.id },
      include: {
        accounts: {
          select: {
            id: true,
            accountName: true,
            accountNumber: true,
            accountType: true,
            balance: true,
            availableBalance: true,
            institution: true,
            lastUpdated: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      hasConnections: connections.length > 0,
      connections: connections.map(conn => ({
        id: conn.id,
        institutionName: conn.institutionName,
        status: conn.status,
        lastSyncedAt: conn.lastSyncedAt,
        accounts: conn.accounts,
      })),
    });
  } catch (error) {
    console.error("Error checking connections:", error);
    return NextResponse.json(
      { error: "Failed to check connections" },
      { status: 500 }
    );
  }
}