import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const { id: analysisId } = params;

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

    // Update viewedAt timestamp if not already set
    if (!analysis.viewedAt) {
      await prisma.spendingAnalysis.update({
        where: { id: analysisId },
        data: {
          viewedAt: new Date(),
        },
      });
    }

    return NextResponse.json({
      message: "Session marked as viewed",
    });
  } catch (error) {
    console.error("Mark session as viewed error:", error);
    return NextResponse.json(
      { error: "Failed to mark session as viewed" },
      { status: 500 }
    );
  }
}
