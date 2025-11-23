import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getDb } from "@/lib/db";

// GET - List all saved sessions for the user
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

    if (authError || !authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = await getDb();
    const { data: user, error: userError } = await db
      .from("User")
      .select("*")
      .eq("id", authUser.id)
      .single();

    if (userError || !user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get all analysis sessions for the user
    const { data: analyses, error: analysesError } = await db
      .from("SpendingAnalysis")
      .select(
        `
        id,
        name,
        createdAt,
        updatedAt,
        viewedAt,
        status,
        BankStatement(
          id,
          Transaction(
            amount
          )
        )
        `
      )
      .eq("userId", user.id)
      .order("createdAt", { ascending: false });

    if (analysesError) {
      console.error("Get analyses error:", analysesError);
      return NextResponse.json(
        { error: "Failed to fetch sessions" },
        { status: 500 }
      );
    }

    // Format the response
    const formattedAnalyses = (analyses || []).map((analysis: any) => {
      let totalAmount = 0;
      let transactionCount = 0;

      (analysis.BankStatement || []).forEach((statement: any) => {
        (statement.Transaction || []).forEach((transaction: any) => {
          totalAmount += Math.abs(Number(transaction.amount));
          transactionCount++;
        });
      });

      return {
        id: analysis.id,
        name: analysis.name,
        createdAt: analysis.createdAt,
        updatedAt: analysis.updatedAt,
        viewedAt: analysis.viewedAt,
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
    const supabase = await createClient();
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

    if (authError || !authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = await getDb();
    const { data: user, error: userError } = await db
      .from("User")
      .select("*")
      .eq("id", authUser.id)
      .single();

    if (userError || !user) {
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
    const { data: existingAnalysis, error: checkError } = await db
      .from("SpendingAnalysis")
      .select("*")
      .eq("id", analysisId)
      .single();

    let analysis;
    let error;

    if (checkError && checkError.code === "PGRST116") {
      // Not found - create new analysis
      const { data: newAnalysis, error: createError } = await db
        .from("SpendingAnalysis")
        .insert({
          id: analysisId,
          userId: user.id,
          name: analysisName,
          status: "processing",
        })
        .select()
        .single();

      analysis = newAnalysis;
      error = createError;
    } else if (!checkError && existingAnalysis) {
      // Found - update existing analysis
      const { data: updatedAnalysis, error: updateError } = await db
        .from("SpendingAnalysis")
        .update({
          name: analysisName,
          status: "completed",
        })
        .eq("id", analysisId)
        .select()
        .single();

      analysis = updatedAnalysis;
      error = updateError;
    } else {
      // Unexpected error checking analysis
      error = checkError;
    }

    if (error) {
      console.error("Save session error:", error);
      return NextResponse.json(
        { error: "Failed to save session" },
        { status: 500 }
      );
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
    const supabase = await createClient();
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

    if (authError || !authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = await getDb();
    const { data: user, error: userError } = await db
      .from("User")
      .select("*")
      .eq("id", authUser.id)
      .single();

    if (userError || !user) {
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
    const { data: analysis, error: findError } = await db
      .from("SpendingAnalysis")
      .select("*")
      .eq("id", analysisId)
      .eq("userId", user.id)
      .single();

    if (findError || !analysis) {
      return NextResponse.json(
        { error: "Analysis not found" },
        { status: 404 }
      );
    }

    // Delete analysis and all related data (cascading delete handled by database)
    const { error: deleteError } = await db
      .from("SpendingAnalysis")
      .delete()
      .eq("id", analysisId);

    if (deleteError) {
      console.error("Delete session error:", deleteError);
      return NextResponse.json(
        { error: "Failed to delete session" },
        { status: 500 }
      );
    }

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