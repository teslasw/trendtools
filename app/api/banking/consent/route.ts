import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { basiqClient } from "@/lib/basiq";

// POST /api/banking/consent - Create a new consent flow
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch user from database using email
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, advisorId: true, email: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const userId = user.id;

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
      basiqUserId = await basiqClient.createUser(user.email || `user_${userId}@trendadvisory.com`);
    }

    // Create consent
    const consent = await basiqClient.createConsent(
      userId,
      basiqUserId,
      "Connect your bank accounts for spending analysis and financial insights"
    );

    // Store or update bank connection record
    if (bankConnection) {
      await prisma.bankConnection.update({
        where: { id: bankConnection.id },
        data: {
          basiqUserId,
          status: "pending",
          consentExpiresAt: new Date(consent.expiresAt),
        },
      });
    } else {
      bankConnection = await prisma.bankConnection.create({
        data: {
          userId,
          basiqUserId,
          basiqConnectionId: "", // Will be updated after user completes consent
          institutionId: "",
          institutionName: "Pending",
          status: "pending",
          consentExpiresAt: new Date(consent.expiresAt),
        },
      });
    }

    return NextResponse.json({
      consentUrl: consent.url,
      connectionId: bankConnection.id,
      expiresAt: consent.expiresAt,
    });
  } catch (error) {
    console.error("Error creating consent:", error);
    return NextResponse.json(
      { error: "Failed to create consent" },
      { status: 500 }
    );
  }
}

// GET /api/banking/consent - Check consent status
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch user from database using email
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const connectionId = req.nextUrl.searchParams.get("connectionId");
    if (!connectionId) {
      return NextResponse.json(
        { error: "Connection ID required" },
        { status: 400 }
      );
    }

    const connection = await prisma.bankConnection.findUnique({
      where: { id: connectionId },
      include: {
        accounts: {
          select: {
            id: true,
            accountName: true,
            accountNumber: true,
            accountType: true,
            balance: true,
            institution: true,
          },
        },
      },
    });

    if (!connection || connection.userId !== user.id) {
      return NextResponse.json(
        { error: "Connection not found" },
        { status: 404 }
      );
    }

    // Check for new accounts if status is pending
    if (connection.status === "pending" && connection.basiqUserId) {
      try {
        const accounts = await basiqClient.getAccounts(connection.basiqUserId);
        
        if (accounts.length > 0) {
          // Update connection status
          await prisma.bankConnection.update({
            where: { id: connectionId },
            data: {
              status: "active",
              lastSyncedAt: new Date(),
              institutionName: accounts[0].institution || "Connected Bank",
            },
          });

          // Store accounts
          for (const account of accounts) {
            await prisma.bankAccount.upsert({
              where: { basiqAccountId: account.id },
              create: {
                connectionId,
                basiqAccountId: account.id,
                accountNumber: account.accountNo.slice(-4), // Last 4 digits only
                accountName: account.name,
                accountType: account.class.type,
                balance: account.balance,
                availableBalance: account.availableBalance,
                currency: account.currency,
                institution: account.institution,
                lastUpdated: new Date(account.lastUpdated),
              },
              update: {
                balance: account.balance,
                availableBalance: account.availableBalance,
                lastUpdated: new Date(account.lastUpdated),
              },
            });
          }

          connection.status = "active";
        }
      } catch (error) {
        console.error("Error fetching accounts:", error);
      }
    }

    return NextResponse.json({
      status: connection.status,
      accounts: connection.accounts,
      lastSyncedAt: connection.lastSyncedAt,
    });
  } catch (error) {
    console.error("Error checking consent:", error);
    return NextResponse.json(
      { error: "Failed to check consent status" },
      { status: 500 }
    );
  }
}