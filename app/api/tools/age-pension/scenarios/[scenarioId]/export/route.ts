import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// GET /api/tools/age-pension/scenarios/[scenarioId]/export - Export to PDF
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ scenarioId: string }> }
) {
  try {
    const { scenarioId } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, firstName: true, lastName: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get scenario with all data
    const scenario = await prisma.agePensionScenario.findFirst({
      where: {
        id: scenarioId,
        userId: user.id,
      },
      include: {
        assets: true,
        incomes: true,
        calculations: {
          orderBy: { calculatedAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!scenario) {
      return NextResponse.json({ error: "Scenario not found" }, { status: 404 });
    }

    const calculation = scenario.calculations[0];
    const formatCurrency = (amount: number) => {
      return new Intl.NumberFormat("en-AU", {
        style: "currency",
        currency: "AUD",
        minimumFractionDigits: 2,
      }).format(amount);
    };

    const formatDate = (date: Date) => {
      return new Date(date).toLocaleDateString("en-AU");
    };

    // Generate HTML for PDF
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Age Pension Calculation - ${scenario.name}</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 20px; }
    h1 { color: #2563eb; border-bottom: 3px solid #2563eb; padding-bottom: 10px; }
    h2 { color: #1e40af; margin-top: 30px; border-bottom: 1px solid #e5e7eb; padding-bottom: 5px; }
    .header { background: #f3f4f6; padding: 15px; margin-bottom: 30px; border-radius: 8px; }
    .result-box { background: #dbeafe; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0; }
    .result-amount { font-size: 32px; font-weight: bold; color: #1e40af; margin: 10px 0; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th { background: #f3f4f6; padding: 10px; text-align: left; font-weight: 600; }
    td { padding: 10px; border-bottom: 1px solid #e5e7eb; }
    tr:last-child td { border-bottom: none; }
    .summary-table { background: #f9fafb; }
    .disclaimer { background: #fef3c7; padding: 15px; border-left: 4px solid #f59e0b; margin-top: 30px; font-size: 12px; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280; }
    @media print { body { max-width: 100%; } }
  </style>
</head>
<body>
  <div class="header">
    <h1>Age Pension Calculation Report</h1>
    <p><strong>Scenario:</strong> ${scenario.name}</p>
    <p><strong>Date:</strong> ${formatDate(new Date())}</p>
    <p><strong>Prepared for:</strong> ${user.firstName || ''} ${user.lastName || ''}</p>
  </div>

  ${calculation ? `
    <div class="result-box">
      <div>Your Estimated Age Pension</div>
      <div class="result-amount">${formatCurrency(calculation.pensionAmount)} per fortnight</div>
      <div>Binding Test: <strong>${calculation.bindingTest === 'income' ? 'Income Test' : calculation.bindingTest === 'assets' ? 'Assets Test' : 'Both Tests Zero'}</strong></div>
    </div>
  ` : '<p>No calculation available for this scenario.</p>'}

  <h2>Personal Details</h2>
  <table>
    <tr><td><strong>Date of Birth:</strong></td><td>${formatDate(scenario.dateOfBirth)}</td></tr>
    <tr><td><strong>Relationship Status:</strong></td><td>${scenario.relationshipStatus === 'couple' ? 'Couple' : 'Single'}</td></tr>
    ${scenario.partnerDOB ? `<tr><td><strong>Partner Date of Birth:</strong></td><td>${formatDate(scenario.partnerDOB)}</td></tr>` : ''}
    <tr><td><strong>Homeowner:</strong></td><td>${scenario.isHomeowner ? 'Yes' : 'No'}</td></tr>
    <tr><td><strong>Australian Residency:</strong></td><td>${scenario.residencyYears} years</td></tr>
  </table>

  <h2>Assets</h2>
  ${scenario.assets.length > 0 ? `
    <table>
      <thead>
        <tr>
          <th>Category</th>
          <th>Description</th>
          <th>Owner</th>
          <th>Amount</th>
          <th>Exempt</th>
        </tr>
      </thead>
      <tbody>
        ${scenario.assets.map(asset => `
          <tr>
            <td>${asset.category.replace(/_/g, ' ')}</td>
            <td>${asset.description || '-'}</td>
            <td>${asset.owner}</td>
            <td>${formatCurrency(asset.amount)}</td>
            <td>${asset.isExempt ? 'Yes' : 'No'}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  ` : '<p>No assets recorded.</p>'}

  <h2>Income</h2>
  ${scenario.incomes.length > 0 ? `
    <table>
      <thead>
        <tr>
          <th>Category</th>
          <th>Description</th>
          <th>Owner</th>
          <th>Amount</th>
          <th>Frequency</th>
        </tr>
      </thead>
      <tbody>
        ${scenario.incomes.map(income => `
          <tr>
            <td>${income.category.replace(/_/g, ' ')}</td>
            <td>${income.description || '-'}</td>
            <td>${income.owner}</td>
            <td>${formatCurrency(income.amount)}</td>
            <td>${income.frequency}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  ` : '<p>No income sources recorded.</p>'}

  ${calculation ? `
    <h2>Calculation Summary</h2>
    <table class="summary-table">
      <tr><td><strong>Total Assets:</strong></td><td>${formatCurrency(calculation.totalAssets)}</td></tr>
      <tr><td><strong>Assessable Assets:</strong></td><td>${formatCurrency(calculation.assessableAssets)}</td></tr>
      <tr><td><strong>Total Income (p/f):</strong></td><td>${formatCurrency(calculation.totalIncome)}</td></tr>
      <tr><td><strong>Assessable Income (p/f):</strong></td><td>${formatCurrency(calculation.assessableIncome)}</td></tr>
      <tr><td><strong>Income Test Result:</strong></td><td>${formatCurrency(calculation.incomeTestResult)} p/f</td></tr>
      <tr><td><strong>Assets Test Result:</strong></td><td>${formatCurrency(calculation.assetsTestResult)} p/f</td></tr>
      <tr><td><strong>Final Pension Amount:</strong></td><td><strong>${formatCurrency(calculation.pensionAmount)} p/f</strong></td></tr>
    </table>
  ` : ''}

  <div class="disclaimer">
    <h3>Important Disclaimer</h3>
    <p>This calculation is an estimate only based on the information provided and current Centrelink rates and thresholds. 
    Actual entitlements may vary based on individual circumstances and are subject to assessment by Services Australia.</p>
    <p>This is not financial advice. Please consult with a qualified financial advisor or Services Australia for official assessments.</p>
    <p>Rates and thresholds are current as of the date of this report and are subject to change.</p>
  </div>

  <div class="footer">
    <p>Generated by Trend Advisory Age Pension Calculator</p>
    <p>© ${new Date().getFullYear()} Trend Advisory. All rights reserved.</p>
  </div>
</body>
</html>`;

    // Return HTML with proper headers for download
    return new NextResponse(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html',
        'Content-Disposition': `attachment; filename="age-pension-${scenario.name.replace(/\s+/g, '-')}.html"`,
      },
    });
  } catch (error) {
    console.error("Error exporting scenario:", error);
    return NextResponse.json(
      { error: "Failed to export scenario" },
      { status: 500 }
    );
  }
}