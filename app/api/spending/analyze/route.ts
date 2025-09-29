import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateApi, apiResponse, apiError, checkRateLimit } from "@/lib/api-auth";
import { z } from "zod";

const analyzeSchema = z.object({
  startDate: z.string(),
  endDate: z.string(),
  categories: z.array(z.string()).optional(),
});

export async function POST(request: NextRequest) {
  const { user, error } = await authenticateApi(request);

  if (!user) {
    return apiError(error || "Authentication required", "AUTH_REQUIRED", 401);
  }

  // Rate limiting for AI analysis
  if (!checkRateLimit(`analyze:${user.id}`, 10, 3600000)) { // 10 per hour
    return apiError("Too many analysis requests", "RATE_LIMITED", 429);
  }

  try {
    const body = await request.json();

    const validation = analyzeSchema.safeParse(body);
    if (!validation.success) {
      return apiError("Invalid analysis parameters", "VALIDATION_ERROR", 400, validation.error.errors);
    }

    const { startDate, endDate, categories } = validation.data;

    // Build where clause
    const where: any = {
      userId: user.id,
      date: {
        gte: new Date(startDate),
        lte: new Date(endDate),
      },
    };

    if (categories && categories.length > 0) {
      where.categoryId = { in: categories };
    }

    // Get transactions
    const transactions = await prisma.transaction.findMany({
      where,
      include: {
        category: true,
      },
      orderBy: { date: "asc" },
    });

    if (transactions.length === 0) {
      return apiError("No transactions found for the specified period", "NOT_FOUND", 404);
    }

    // Calculate summary statistics
    const totalSpending = transactions.reduce((sum, t) => sum + Math.abs(t.amount.toNumber()), 0);
    const daysDiff = Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24));
    const averageDaily = totalSpending / daysDiff;
    const averageMonthly = averageDaily * 30;

    // Group by category
    const categorySpending = new Map<string, { amount: number; count: number; category: any }>();
    transactions.forEach(t => {
      const categoryId = t.categoryId || "uncategorized";
      const existing = categorySpending.get(categoryId) || { amount: 0, count: 0, category: t.category };
      existing.amount += Math.abs(t.amount.toNumber());
      existing.count += 1;
      categorySpending.set(categoryId, existing);
    });

    // Get top categories
    const topCategories = Array.from(categorySpending.entries())
      .map(([id, data]) => ({
        categoryId: id,
        category: data.category?.name || "Uncategorized",
        amount: data.amount,
        count: data.count,
        percentage: (data.amount / totalSpending) * 100,
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);

    // Calculate monthly trend
    const monthlySpending = new Map<string, number>();
    transactions.forEach(t => {
      const month = t.date.toISOString().substring(0, 7); // YYYY-MM
      const existing = monthlySpending.get(month) || 0;
      monthlySpending.set(month, existing + Math.abs(t.amount.toNumber()));
    });

    const monthlyTrend = Array.from(monthlySpending.entries())
      .map(([month, amount]) => ({ month, amount }))
      .sort((a, b) => a.month.localeCompare(b.month));

    // Generate insights
    const insights = [];

    // Spending trend insight
    if (monthlyTrend.length > 1) {
      const lastMonth = monthlyTrend[monthlyTrend.length - 1].amount;
      const previousMonth = monthlyTrend[monthlyTrend.length - 2].amount;
      const change = ((lastMonth - previousMonth) / previousMonth) * 100;

      if (Math.abs(change) > 10) {
        insights.push({
          type: change > 0 ? "warning" : "success",
          title: change > 0 ? "Spending Increased" : "Spending Decreased",
          description: `Your spending ${change > 0 ? "increased" : "decreased"} by ${Math.abs(Math.round(change))}% compared to the previous month`,
          recommendation: change > 0
            ? "Review your expenses to identify areas where you can cut back"
            : "Great job reducing your spending! Consider putting the savings into investments",
          potentialSavings: change > 0 ? Math.round(lastMonth - previousMonth) : 0,
        });
      }
    }

    // Category insights
    topCategories.forEach(cat => {
      if (cat.percentage > 30) {
        insights.push({
          type: "info",
          title: `High Spending in ${cat.category}`,
          description: `${Math.round(cat.percentage)}% of your spending is in ${cat.category}`,
          recommendation: `Consider setting a budget for ${cat.category} to better control expenses`,
          potentialSavings: Math.round(cat.amount * 0.1), // Suggest 10% reduction
        });
      }
    });

    // Frequency insights
    const highFrequencyCategories = Array.from(categorySpending.entries())
      .filter(([_, data]) => data.count > daysDiff * 0.5) // More than every other day
      .map(([id, data]) => data.category?.name || "Uncategorized");

    if (highFrequencyCategories.length > 0) {
      insights.push({
        type: "info",
        title: "Frequent Purchases",
        description: `You make frequent purchases in: ${highFrequencyCategories.join(", ")}`,
        recommendation: "Consider bulk buying or subscription services to save on frequent purchases",
        potentialSavings: Math.round(totalSpending * 0.05),
      });
    }

    // AI-style recommendation (mock - would integrate with OpenAI in production)
    const aiRecommendations = generateAIRecommendations(totalSpending, topCategories, monthlyTrend);

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: user.id,
        action: "SPENDING_ANALYSIS",
        metadata: {
          period: { startDate, endDate },
          totalAnalyzed: transactions.length,
        },
      },
    });

    return apiResponse({
      summary: {
        totalSpending: Math.round(totalSpending),
        averageDaily: Math.round(averageDaily),
        averageMonthly: Math.round(averageMonthly),
        transactionCount: transactions.length,
        topCategories,
      },
      insights,
      trends: {
        monthlyTrend,
        categoryBreakdown: topCategories.map(cat => ({
          category: cat.category,
          amount: Math.round(cat.amount),
          percentage: Math.round(cat.percentage * 10) / 10,
        })),
      },
      aiRecommendations,
    });
  } catch (error) {
    console.error("Spending analysis error:", error);
    return apiError("Failed to analyze spending", "SERVER_ERROR", 500);
  }
}

function generateAIRecommendations(
  totalSpending: number,
  topCategories: any[],
  monthlyTrend: any[]
): string {
  // This is a mock AI recommendation. In production, this would call OpenAI API
  const recommendations = [];

  // Analyze spending level
  if (totalSpending > 5000) {
    recommendations.push("Your spending is relatively high. Consider creating a detailed budget to track where your money goes.");
  }

  // Analyze top category
  if (topCategories.length > 0) {
    const topCategory = topCategories[0];
    if (topCategory.percentage > 40) {
      recommendations.push(`${topCategory.category} represents a significant portion of your spending. Look for ways to optimize expenses in this category.`);
    }
  }

  // Analyze trend
  if (monthlyTrend.length > 1) {
    const increasing = monthlyTrend[monthlyTrend.length - 1].amount > monthlyTrend[0].amount;
    if (increasing) {
      recommendations.push("Your spending has been trending upward. Set spending limits to avoid lifestyle inflation.");
    } else {
      recommendations.push("Good job! Your spending is trending downward. Keep up the disciplined approach.");
    }
  }

  // General recommendations
  recommendations.push("Consider automating your savings by setting up automatic transfers right after payday.");
  recommendations.push("Review subscriptions and recurring charges monthly to eliminate unused services.");

  return recommendations.join(" ");
}