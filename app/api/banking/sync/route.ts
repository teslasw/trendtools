import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { basiqClient } from "@/lib/basiq";

// POST /api/banking/sync - Sync bank transactions
export async function POST(req: NextRequest) {
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

    const { connectionId, accountId } = await req.json();

    const connection = await prisma.bankConnection.findUnique({
      where: { id: connectionId },
      include: {
        accounts: true,
      },
    });

    if (!connection || connection.userId !== user.id) {
      return NextResponse.json(
        { error: "Connection not found" },
        { status: 404 }
      );
    }

    if (connection.status !== "active") {
      return NextResponse.json(
        { error: "Connection is not active" },
        { status: 400 }
      );
    }

    // Determine which accounts to sync
    const accountsToSync = accountId
      ? connection.accounts.filter(a => a.id === accountId)
      : connection.accounts;

    let totalTransactionsSynced = 0;
    const syncedAccounts = [];

    for (const account of accountsToSync) {
      try {
        // Get transactions from Basiq (last 90 days by default)
        const fromDate = new Date();
        fromDate.setDate(fromDate.getDate() - 90);
        
        const transactions = await basiqClient.getTransactions(
          connection.basiqUserId,
          account.basiqAccountId,
          fromDate
        );

        // Store transactions
        for (const txn of transactions) {
          await prisma.bankTransaction.upsert({
            where: { basiqTransactionId: txn.id },
            create: {
              accountId: account.id,
              basiqTransactionId: txn.id,
              description: txn.description,
              amount: Math.abs(txn.amount),
              balance: txn.balance,
              transactionDate: new Date(txn.transactionDate),
              postDate: txn.postDate ? new Date(txn.postDate) : null,
              category: txn.subClass?.title,
              subCategory: txn.subClass?.code,
              merchantName: txn.merchant?.name,
              direction: txn.direction,
              status: txn.status,
              rawData: txn as any,
            },
            update: {
              balance: txn.balance,
              status: txn.status,
              rawData: txn as any,
            },
          });
        }

        // Update account balance
        const latestTransaction = transactions[0];
        if (latestTransaction) {
          await prisma.bankAccount.update({
            where: { id: account.id },
            data: {
              balance: latestTransaction.balance,
              lastUpdated: new Date(),
            },
          });
        }

        totalTransactionsSynced += transactions.length;
        syncedAccounts.push({
          accountId: account.id,
          accountName: account.accountName,
          transactionCount: transactions.length,
        });
      } catch (error) {
        console.error(`Error syncing account ${account.id}:`, error);
      }
    }

    // Update connection sync time
    await prisma.bankConnection.update({
      where: { id: connectionId },
      data: {
        lastSyncedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      totalTransactionsSynced,
      syncedAccounts,
      lastSyncedAt: new Date(),
    });
  } catch (error) {
    console.error("Error syncing transactions:", error);
    return NextResponse.json(
      { error: "Failed to sync transactions" },
      { status: 500 }
    );
  }
}

// GET /api/banking/sync - Get sync status
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

    const connections = await prisma.bankConnection.findMany({
      where: { userId: user.id },
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
        _count: {
          select: {
            accounts: true,
          },
        },
      },
    });

    return NextResponse.json({
      connections: connections.map(conn => ({
        id: conn.id,
        institutionName: conn.institutionName,
        status: conn.status,
        lastSyncedAt: conn.lastSyncedAt,
        accountCount: conn._count.accounts,
        accounts: conn.accounts,
      })),
    });
  } catch (error) {
    console.error("Error getting sync status:", error);
    return NextResponse.json(
      { error: "Failed to get sync status" },
      { status: 500 }
    );
  }
}