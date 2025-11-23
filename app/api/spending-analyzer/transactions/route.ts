import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET(req: NextRequest) {
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

    const searchParams = req.nextUrl.searchParams;
    const analysisId = searchParams.get("analysisId");

    let query = db
      .from("Transaction")
      .select(`
        *,
        category:Category(*),
        bankStatement:BankStatement(*)
      `)
      .eq("userId", user.id)
      .order("date", { ascending: false });

    // If analysisId provided, find transactions through the BankStatement relationship
    if (analysisId) {
      const { data: bankStatements, error: bsError } = await db
        .from("BankStatement")
        .select("id")
        .eq("userId", user.id)
        .eq("analysisId", analysisId);

      if (bsError || !bankStatements || bankStatements.length === 0) {
        // No bank statements found for this analysis, return empty
        return NextResponse.json([]);
      }

      const bankStatementIds = bankStatements.map(bs => bs.id);
      query = query.in("bankStatementId", bankStatementIds);
    }

    const { data: transactions, error: txnError } = await query;

    if (txnError) {
      throw txnError;
    }

    return NextResponse.json(transactions || []);
  } catch (error) {
    console.error("Get transactions error:", error);
    return NextResponse.json(
      { error: "Failed to fetch transactions" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
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

    const { transactionId, updates } = await req.json();

    if (!transactionId) {
      return NextResponse.json(
        { error: "Transaction ID required" },
        { status: 400 }
      );
    }

    // Verify transaction belongs to user
    const { data: transaction, error: txnError } = await db
      .from("Transaction")
      .select("*")
      .eq("id", transactionId)
      .eq("userId", user.id)
      .single();

    if (txnError || !transaction) {
      return NextResponse.json(
        { error: "Transaction not found" },
        { status: 404 }
      );
    }

    // Handle category update - convert category name to ID if needed
    let categoryId = updates.categoryId;

    if (updates.categoryId && typeof updates.categoryId === 'string') {
      // Check if it's a category name (not a cuid)
      if (!updates.categoryId.startsWith('c')) {
        // It's a category name, find or create it
        const { data: existingCategory } = await db
          .from("Category")
          .select("*")
          .eq("name", updates.categoryId)
          .single();

        if (existingCategory) {
          categoryId = existingCategory.id;
        } else {
          // Create new category
          const { generateId } = await import("@/lib/db");
          const { data: newCategory, error: catError } = await db
            .from("Category")
            .insert({
              id: generateId(),
              name: updates.categoryId,
              isSystem: false,
            })
            .select()
            .single();

          if (!catError && newCategory) {
            categoryId = newCategory.id;
            console.log(`[Transaction Update] Created new category: ${updates.categoryId}`);
          }
        }
      }
    }

    // Update transaction
    const { data: updated, error: updateError } = await db
      .from("Transaction")
      .update({
        status: updates.status,
        notes: updates.notes,
        categoryId: categoryId,
        updatedAt: new Date().toISOString(),
      })
      .eq("id", transactionId)
      .select(`
        *,
        category:Category(*)
      `)
      .single();

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Update transaction error:", error);
    return NextResponse.json(
      { error: "Failed to update transaction" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
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

    const { transactionIds, status } = await req.json();

    if (!transactionIds || !Array.isArray(transactionIds)) {
      return NextResponse.json(
        { error: "Transaction IDs required" },
        { status: 400 }
      );
    }

    if (!["KEEP", "CANCEL", "CONSIDER"].includes(status)) {
      return NextResponse.json(
        { error: "Invalid status" },
        { status: 400 }
      );
    }

    // Verify all transactions belong to user
    const { data: transactions, error: txnError } = await db
      .from("Transaction")
      .select("id")
      .in("id", transactionIds)
      .eq("userId", user.id);

    if (txnError || !transactions || transactions.length !== transactionIds.length) {
      return NextResponse.json(
        { error: "Some transactions not found" },
        { status: 404 }
      );
    }

    // Bulk update
    const { error: updateError } = await db
      .from("Transaction")
      .update({
        status,
        updatedAt: new Date().toISOString(),
      })
      .in("id", transactionIds)
      .eq("userId", user.id);

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({
      updated: transactionIds.length,
      status: "success",
    });
  } catch (error) {
    console.error("Bulk update error:", error);
    return NextResponse.json(
      { error: "Failed to update transactions" },
      { status: 500 }
    );
  }
}