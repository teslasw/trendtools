import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const CATEGORIES = [
  "Groceries",
  "Transport",
  "Entertainment",
  "Shopping",
  "Utilities",
  "Food & Dining",
  "Health & Medical",
  "Subscription",
  "Travel",
  "Education",
  "Personal Care",
  "Home & Garden",
  "Insurance",
  "Investments",
  "Other"
];

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { analysisId } = await req.json();

    if (!analysisId) {
      return NextResponse.json({ error: "Analysis ID required" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get uncategorized transactions
    const transactions = await prisma.transaction.findMany({
      where: {
        userId: user.id,
        categoryId: null,
      },
      orderBy: {
        date: "desc",
      },
      take: 100, // Process in batches
    });

    if (!transactions.length) {
      return NextResponse.json({
        message: "No transactions to categorize",
        categorized: 0,
      });
    }

    // Prepare transactions for AI
    const transactionData = transactions.map(t => ({
      id: t.id,
      description: t.description,
      merchant: t.merchant,
      amount: t.amount.toNumber(),
    }));

    // Call OpenAI for categorization
    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        {
          role: "system",
          content: `You are a financial assistant that categorizes bank transactions.
            Analyze each transaction and provide:
            1. The most appropriate category from this list: ${CATEGORIES.join(", ")}
            2. A confidence score between 0 and 1
            3. Whether it appears to be a recurring transaction (true/false)
            4. A suggested action: "KEEP" (essential), "CANCEL" (unnecessary), or "CONSIDER" (review needed)

            Respond in JSON format:
            {
              "transactions": [
                {
                  "id": "transaction_id",
                  "category": "category_name",
                  "confidence": 0.95,
                  "isRecurring": false,
                  "suggestedAction": "KEEP",
                  "insights": "brief explanation"
                }
              ]
            }`
        },
        {
          role: "user",
          content: `Categorize these transactions:\n${JSON.stringify(transactionData, null, 2)}`
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
    });

    const aiResponse = JSON.parse(completion.choices[0].message.content || "{}");
    const categorizedTransactions = aiResponse.transactions || [];

    // Update transactions with AI categorization
    for (const catTxn of categorizedTransactions) {
      const transaction = transactions.find(t => t.id === catTxn.id);
      if (!transaction) continue;

      // Get or create category
      let category = await prisma.category.findFirst({
        where: {
          name: {
            equals: catTxn.category,
            mode: "insensitive",
          },
        },
      });

      if (!category) {
        category = await prisma.category.create({
          data: {
            name: catTxn.category,
            color: getCategoryColor(catTxn.category),
            icon: getCategoryIcon(catTxn.category),
          },
        });
      }

      // Update transaction
      await prisma.transaction.update({
        where: { id: transaction.id },
        data: {
          categoryId: category.id,
          aiConfidence: catTxn.confidence,
          status: catTxn.suggestedAction,
          notes: catTxn.insights,
        },
      });
    }

    // Generate spending insights
    const insights = await generateInsights(analysisId, transactions);

    return NextResponse.json({
      categorized: categorizedTransactions.length,
      insights: insights.length,
      status: "success",
    });
  } catch (error) {
    console.error("Categorization error:", error);
    return NextResponse.json(
      { error: "Failed to categorize transactions" },
      { status: 500 }
    );
  }
}

async function generateInsights(analysisId: string, transactions: any[]) {
  const insights = [];

  // Calculate spending patterns
  const categoryTotals: Record<string, number> = {};
  const recurringTransactions: any[] = [];

  for (const txn of transactions) {
    if (txn.category) {
      categoryTotals[txn.category.name] =
        (categoryTotals[txn.category.name] || 0) + Math.abs(txn.amount.toNumber());
    }

    // Simple recurring detection (would be enhanced with AI)
    const similar = transactions.filter(t =>
      t.id !== txn.id &&
      t.merchant === txn.merchant &&
      Math.abs(t.amount.toNumber() - txn.amount.toNumber()) < 1
    );

    if (similar.length > 0) {
      recurringTransactions.push(txn);
    }
  }

  // Create insights
  if (Object.keys(categoryTotals).length > 0) {
    const topCategory = Object.entries(categoryTotals)
      .sort(([, a], [, b]) => b - a)[0];

    const insight = await prisma.spendingInsight.create({
      data: {
        analysisId,
        type: "category_breakdown",
        data: {
          topCategory: topCategory[0],
          amount: topCategory[1],
          categoryBreakdown: categoryTotals,
        },
        period: "month",
      },
    });
    insights.push(insight);
  }

  if (recurringTransactions.length > 0) {
    const recurringTotal = recurringTransactions.reduce(
      (sum, t) => sum + Math.abs(t.amount.toNumber()),
      0
    );

    const insight = await prisma.spendingInsight.create({
      data: {
        analysisId,
        type: "subscription",
        data: {
          count: recurringTransactions.length,
          totalAmount: recurringTotal,
          transactions: recurringTransactions.map(t => ({
            description: t.description,
            amount: t.amount.toNumber(),
          })),
        },
        period: "month",
      },
    });
    insights.push(insight);
  }

  // Savings opportunity
  const cancelTransactions = transactions.filter(t => t.status === "CANCEL");
  if (cancelTransactions.length > 0) {
    const savingsAmount = cancelTransactions.reduce(
      (sum, t) => sum + Math.abs(t.amount.toNumber()),
      0
    );

    const insight = await prisma.spendingInsight.create({
      data: {
        analysisId,
        type: "savings_opportunity",
        data: {
          potentialSavings: savingsAmount,
          transactionCount: cancelTransactions.length,
          categories: [...new Set(cancelTransactions.map(t => t.category?.name || "Other"))],
        },
      },
    });
    insights.push(insight);
  }

  return insights;
}

function getCategoryColor(category: string): string {
  const colors: Record<string, string> = {
    "Groceries": "#3b82f6",
    "Transport": "#10b981",
    "Entertainment": "#8b5cf6",
    "Shopping": "#f59e0b",
    "Utilities": "#ef4444",
    "Food & Dining": "#ec4899",
    "Health & Medical": "#14b8a6",
    "Subscription": "#f97316",
    "Travel": "#06b6d4",
    "Education": "#6366f1",
    "Personal Care": "#a855f7",
    "Home & Garden": "#84cc16",
    "Insurance": "#64748b",
    "Investments": "#22c55e",
    "Other": "#6b7280",
  };
  return colors[category] || "#6b7280";
}

function getCategoryIcon(category: string): string {
  const icons: Record<string, string> = {
    "Groceries": "shopping-cart",
    "Transport": "car",
    "Entertainment": "zap",
    "Shopping": "shopping-bag",
    "Utilities": "home",
    "Food & Dining": "coffee",
    "Health & Medical": "heart",
    "Subscription": "repeat",
    "Travel": "plane",
    "Education": "book-open",
    "Personal Care": "smile",
    "Home & Garden": "tree",
    "Insurance": "shield",
    "Investments": "trending-up",
    "Other": "dollar-sign",
  };
  return icons[category] || "dollar-sign";
}