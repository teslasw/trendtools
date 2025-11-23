import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const db = await getDb();
    const { data: { user: authUser }, error: authError } = await db.auth.getUser();

    if (authError || !authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: user, error: userError } = await db
      .from("User")
      .select("*")
      .eq("id", authUser.id)
      .single();

    if (userError || !user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { id: analysisId } = await params;

    // Verify analysis belongs to user
    const { data: analysis, error: analysisError } = await db
      .from("SpendingAnalysis")
      .select("*")
      .eq("id", analysisId)
      .eq("userId", user.id)
      .single();

    if (analysisError || !analysis) {
      return NextResponse.json(
        { error: "Analysis not found" },
        { status: 404 }
      );
    }

    // Update viewedAt timestamp if not already set
    if (!analysis.viewedAt) {
      const { error: updateError } = await db
        .from("SpendingAnalysis")
        .update({
          viewedAt: new Date().toISOString(),
        })
        .eq("id", analysisId);

      if (updateError) {
        throw updateError;
      }
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
