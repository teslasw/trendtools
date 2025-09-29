import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET - List all saved sessions for the user
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get all analysis sessions for the user
    const analyses = await prisma.spendingAnalysis.findMany({
      where: {
        userId: user.id,
      },
      include: {
        statements: {
          include: {
            transactions: {
              select: {
                amount: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Format the response
    const formattedAnalyses = analyses.map((analysis) => {
      let totalAmount = 0;
      let transactionCount = 0;

      analysis.statements.forEach(statement => {
        statement.transactions.forEach(transaction => {
          totalAmount += Math.abs(Number(transaction.amount));
          transactionCount++;
        });
      });

      return {
        id: analysis.id,
        name: analysis.name,
        createdAt: analysis.createdAt,
        updatedAt: analysis.updatedAt,
        transactionCount,
        totalAmount,
        status: analysis.status,
      };
    });

    return NextResponse.json(formattedAnalyses);
  } catch (error) {
    console.error("Get sessions error:", error);
    return NextResponse.json(
      { error: "Failed to fetch sessions" },
      { status: 500 }
    );
  }
}

// POST - Save a new analysis session
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { analysisName, analysisId } = await req.json();

    if (!analysisName || !analysisId) {
      return NextResponse.json(
        { error: "Analysis name and ID required" },
        { status: 400 }
      );
    }

    // Check if analysis already exists
    let analysis = await prisma.spendingAnalysis.findUnique({
      where: { id: analysisId },
    });

    if (!analysis) {
      // Create new analysis
      analysis = await prisma.spendingAnalysis.create({
        data: {
          id: analysisId,
          userId: user.id,
          name: analysisName,
          status: "processing",
        },
      });
    } else {
      // Update existing analysis
      analysis = await prisma.spendingAnalysis.update({
        where: { id: analysisId },
        data: {
          name: analysisName,
          status: "completed",
        },
      });
    }

    return NextResponse.json({
      id: analysis.id,
      name: analysis.name,
      status: analysis.status,
      message: "Session saved successfully",
    });
  } catch (error) {
    console.error("Save session error:", error);
    return NextResponse.json(
      { error: "Failed to save session" },
      { status: 500 }
    );
  }
}

// DELETE - Delete an analysis session
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const analysisId = searchParams.get("id");

    if (!analysisId) {
      return NextResponse.json(
        { error: "Analysis ID required" },
        { status: 400 }
      );
    }

    // Verify analysis belongs to user
    const analysis = await prisma.spendingAnalysis.findFirst({
      where: {
        id: analysisId,
        userId: user.id,
      },
    });

    if (!analysis) {
      return NextResponse.json(
        { error: "Analysis not found" },
        { status: 404 }
      );
    }

    // Delete analysis and all related data (cascading delete)
    await prisma.spendingAnalysis.delete({
      where: { id: analysisId },
    });

    return NextResponse.json({
      message: "Session deleted successfully",
    });
  } catch (error) {
    console.error("Delete session error:", error);
    return NextResponse.json(
      { error: "Failed to delete session" },
      { status: 500 }
    );
  }
}