import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateApi, apiResponse, apiError } from "@/lib/api-auth";

export async function GET(request: NextRequest) {
  const { user, error } = await authenticateApi(request);

  if (!user) {
    return apiError(error || "Authentication required", "AUTH_REQUIRED", 401);
  }

  try {
    // Get user data
    const userData = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        firstName: true,
        lastName: true,
        email: true,
        createdAt: true,
      },
    });

    // Get available tools
    const tools = await prisma.tool.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
      },
    });

    // Get recent activity
    const recentActivity = await prisma.activityLog.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true,
        action: true,
        createdAt: true,
        metadata: true,
      },
    });

    // Get recent transactions for spending summary
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const transactions = await prisma.transaction.findMany({
      where: {
        userId: user.id,
        date: {
          gte: thirtyDaysAgo,
        },
      },
      select: {
        amount: true,
      },
    });

    const monthlySpending = transactions.reduce((sum, t) => sum + t.amount.toNumber(), 0);

    // Calculate mock financial data (in production, these would come from actual data)
    const financialSummary = {
      totalAssets: 125000, // Mock data
      monthlySpending: Math.abs(monthlySpending),
      savingsRate: monthlySpending > 0 ? 15 : 0, // Mock data
      netWorth: 85000, // Mock data
    };

    // Format activity log
    const formattedActivities = recentActivity.map(activity => {
      let description = "";
      switch (activity.action) {
        case "SIGN_IN":
          description = "Signed in to your account";
          break;
        case "SIGN_OUT":
          description = "Signed out of your account";
          break;
        case "UPDATE_PROFILE":
          description = "Updated profile information";
          break;
        case "TOOL_USAGE":
          description = `Used ${(activity.metadata as any)?.tool || "tool"}`;
          break;
        default:
          description = activity.action.toLowerCase().replace(/_/g, " ");
      }

      return {
        type: activity.action,
        description,
        timestamp: activity.createdAt,
      };
    });

    // Generate alerts based on user data
    const alerts = [];
    if (!userData?.firstName || !userData?.lastName) {
      alerts.push({
        type: "info",
        message: "Complete your profile to get personalized recommendations",
        priority: "medium",
      });
    }

    if (monthlySpending > 5000) {
      alerts.push({
        type: "warning",
        message: "Your spending this month is higher than usual",
        priority: "high",
      });
    }

    return apiResponse({
      user: {
        name: `${userData?.firstName || ""} ${userData?.lastName || ""}`.trim() || userData?.email,
        email: userData?.email,
        memberSince: userData?.createdAt,
      },
      financial: financialSummary,
      tools: tools.map(tool => ({
        id: tool.id,
        name: tool.name,
        slug: tool.slug,
        description: tool.description,
        available: true,
      })),
      recentActivity: formattedActivities,
      alerts,
    });
  } catch (error) {
    console.error("Dashboard summary error:", error);
    return apiError("Failed to fetch dashboard data", "SERVER_ERROR", 500);
  }
}