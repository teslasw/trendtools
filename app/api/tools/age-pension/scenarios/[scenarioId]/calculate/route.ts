import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { AgePensionCalculator, CalculationInput } from "@/lib/age-pension-calculator";

// POST /api/tools/age-pension/scenarios/[scenarioId]/calculate - Calculate pension
export async function POST(
  req: NextRequest,
  { params }: { params: { scenarioId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get scenario with assets and incomes
    const scenario = await prisma.agePensionScenario.findFirst({
      where: {
        id: params.scenarioId,
        userId: user.id,
      },
      include: {
        assets: true,
        incomes: true,
      },
    });

    if (!scenario) {
      return NextResponse.json({ error: "Scenario not found" }, { status: 404 });
    }

    // Prepare calculation input
    const input: CalculationInput = {
      relationshipStatus: scenario.relationshipStatus as 'single' | 'couple',
      isHomeowner: scenario.isHomeowner,
      dateOfBirth: scenario.dateOfBirth,
      partnerDOB: scenario.partnerDOB || undefined,
      residencyYears: scenario.residencyYears,
      assets: scenario.assets.map(asset => ({
        category: asset.category,
        owner: asset.owner as 'self' | 'partner' | 'joint',
        amount: asset.amount,
        isExempt: asset.isExempt,
      })),
      incomes: scenario.incomes.map(income => ({
        category: income.category,
        owner: income.owner as 'self' | 'partner' | 'joint',
        amount: income.amount,
        frequency: income.frequency as 'annual' | 'fortnightly' | 'weekly',
      })),
    };

    // Perform calculation
    const calculator = new AgePensionCalculator();
    const result = calculator.calculate(input);

    // Save calculation result
    const calculation = await prisma.agePensionCalculation.create({
      data: {
        scenarioId: scenario.id,
        totalAssets: result.totalAssets,
        totalIncome: result.totalIncome,
        assessableAssets: result.assessableAssets,
        assessableIncome: result.assessableIncome,
        incomeTestResult: result.incomeTestResult,
        assetsTestResult: result.assetsTestResult,
        pensionAmount: result.pensionAmount,
        bindingTest: result.bindingTest,
        breakdown: result.breakdown,
        maxRate: result.breakdown.maxRate,
        incomeThreshold: result.breakdown.incomeTest.threshold,
        assetThreshold: result.breakdown.assetsTest.threshold,
        incomeTaper: 0.5, // Current rate
        assetTaper: 3.0, // Current rate per $1000
      },
    });

    return NextResponse.json({ 
      calculation,
      result,
    });
  } catch (error) {
    console.error("Error calculating pension:", error);
    return NextResponse.json(
      { error: "Failed to calculate pension" },
      { status: 500 }
    );
  }
}