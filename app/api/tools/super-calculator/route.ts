import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateApi, apiResponse, apiError, checkRateLimit } from "@/lib/api-auth";
import { z } from "zod";

const calculationSchema = z.object({
  currentAge: z.number().min(18).max(100),
  retirementAge: z.number().min(50).max(100),
  currentBalance: z.number().min(0),
  annualContribution: z.number().min(0),
  employerContribution: z.number().min(0),
  expectedReturn: z.number().min(0).max(30),
  inflationRate: z.number().min(0).max(10),
});

export async function POST(request: NextRequest) {
  const { user, error } = await authenticateApi(request);

  if (!user) {
    return apiError(error || "Authentication required", "AUTH_REQUIRED", 401);
  }

  // Rate limiting
  if (!checkRateLimit(`super-calc:${user.id}`, 20, 60000)) {
    return apiError("Too many requests", "RATE_LIMITED", 429);
  }

  try {
    const body = await request.json();

    // Validate request
    const validation = calculationSchema.safeParse(body);
    if (!validation.success) {
      return apiError("Invalid calculation parameters", "VALIDATION_ERROR", 400, validation.error.errors);
    }

    const {
      currentAge,
      retirementAge,
      currentBalance,
      annualContribution,
      employerContribution,
      expectedReturn,
      inflationRate,
    } = validation.data;

    // Validate age logic
    if (retirementAge <= currentAge) {
      return apiError("Retirement age must be greater than current age", "VALIDATION_ERROR", 400);
    }

    const yearsToRetirement = retirementAge - currentAge;
    const totalAnnualContribution = annualContribution + employerContribution;
    const realReturn = (1 + expectedReturn / 100) / (1 + inflationRate / 100) - 1;

    // Calculate year by year projection
    const yearByYearProjection = [];
    let balance = currentBalance;
    let totalContributions = currentBalance;
    let totalReturns = 0;

    for (let year = 1; year <= yearsToRetirement; year++) {
      // Add contributions
      balance += totalAnnualContribution;
      totalContributions += totalAnnualContribution;

      // Calculate returns
      const yearReturns = balance * (expectedReturn / 100);
      balance += yearReturns;
      totalReturns += yearReturns;

      yearByYearProjection.push({
        year,
        age: currentAge + year,
        balance: Math.round(balance),
        contribution: totalAnnualContribution,
        returns: Math.round(yearReturns),
      });
    }

    // Calculate inflation adjusted balance
    const inflationAdjustedBalance = balance / Math.pow(1 + inflationRate / 100, yearsToRetirement);

    // Calculate monthly retirement income (assuming 4% safe withdrawal rate)
    const annualRetirementIncome = inflationAdjustedBalance * 0.04;
    const monthlyRetirementIncome = annualRetirementIncome / 12;

    // TODO: Save calculation to database for history
    // await prisma.toolUsage.create({
    //   data: {
    //     userId: user.id,
    //     toolId: "super-calculator",
    //     metadata: {
    //       inputs: validation.data,
    //       results: {
    //         projectedBalance: Math.round(balance),
    //         totalContributions: Math.round(totalContributions),
    //         totalReturns: Math.round(totalReturns),
    //         inflationAdjustedBalance: Math.round(inflationAdjustedBalance),
    //         monthlyRetirementIncome: Math.round(monthlyRetirementIncome),
    //       },
    //     },
    //   },
    // });

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: user.id,
        action: "TOOL_USAGE",
        metadata: {
          tool: "Super Calculator",
          yearsToRetirement,
        },
      },
    });

    return apiResponse({
      projectedBalance: Math.round(balance),
      totalContributions: Math.round(totalContributions),
      totalReturns: Math.round(totalReturns),
      inflationAdjustedBalance: Math.round(inflationAdjustedBalance),
      monthlyRetirementIncome: Math.round(monthlyRetirementIncome),
      yearByYearProjection,
      summary: {
        yearsToRetirement,
        totalGrowth: Math.round(balance - currentBalance),
        growthPercentage: Math.round(((balance - currentBalance) / currentBalance) * 100),
      },
    });
  } catch (error) {
    console.error("Super calculator error:", error);
    return apiError("Failed to calculate projection", "SERVER_ERROR", 500);
  }
}

// GET /api/tools/super-calculator/history - Get calculation history
export async function GET(request: NextRequest) {
  const { user, error } = await authenticateApi(request);

  if (!user) {
    return apiError(error || "Authentication required", "AUTH_REQUIRED", 401);
  }

  try {
    // TODO: Implement calculation history from toolUsage model
    // const history = await prisma.toolUsage.findMany({
    //   where: {
    //     userId: user.id,
    //     toolId: "super-calculator",
    //   },
    //   orderBy: { createdAt: "desc" },
    //   take: 20,
    //   select: {
    //     id: true,
    //     createdAt: true,
    //     metadata: true,
    //   },
    // });

    return apiResponse({
      calculations: [],
      // calculations: history.map(calc => ({
      //   id: calc.id,
      //   createdAt: calc.createdAt,
      //   inputs: (calc.metadata as any)?.inputs || {},
      //   results: (calc.metadata as any)?.results || {},
      // })),
    });
  } catch (error) {
    console.error("History fetch error:", error);
    return apiError("Failed to fetch calculation history", "SERVER_ERROR", 500);
  }
}