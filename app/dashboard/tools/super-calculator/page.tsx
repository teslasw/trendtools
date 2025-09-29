"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AdvisorContactButton } from "@/components/advisor-contact";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart } from "recharts";
import { Calculator, DollarSign, TrendingUp, Info, Calendar, Percent, PiggyBank, CheckCircle, Clock, Star } from "lucide-react";

export default function SuperCalculatorPage() {
  const { data: session } = useSession();
  
  // Form state
  const [currentAge, setCurrentAge] = useState("30");
  const [retirementAge, setRetirementAge] = useState("67");
  const [currentBalance, setCurrentBalance] = useState("50000");
  const [annualSalary, setAnnualSalary] = useState("80000");
  const [employerContribution, setEmployerContribution] = useState("11.5");
  const [personalContribution, setPersonalContribution] = useState("0");
  const [salaryIncrease, setSalaryIncrease] = useState("3");
  const [investmentReturn, setInvestmentReturn] = useState("7.5");
  const [inflationRate, setInflationRate] = useState("2.5");
  const [fees, setFees] = useState("1");
  const [salaryType, setSalaryType] = useState("gross");

  // Results state
  const [projectedBalance, setProjectedBalance] = useState(0);
  const [chartData, setChartData] = useState<any[]>([]);
  const [totalContributions, setTotalContributions] = useState(0);
  const [totalEarnings, setTotalEarnings] = useState(0);

  // Calculate super projection
  const calculateSuper = () => {
    const current = parseFloat(currentAge);
    const retirement = parseFloat(retirementAge);
    const balance = parseFloat(currentBalance);
    const salary = parseFloat(annualSalary);
    const employerRate = parseFloat(employerContribution) / 100;
    const personalRate = parseFloat(personalContribution) / 100;
    const salaryGrowth = parseFloat(salaryIncrease) / 100;
    const returns = parseFloat(investmentReturn) / 100;
    const inflation = parseFloat(inflationRate) / 100;
    const feesRate = parseFloat(fees) / 100;

    const years = retirement - current;
    const data: any[] = [];
    let currentSuperBalance = balance;
    let currentSalary = salary;
    let contributions = 0;

    for (let year = 0; year <= years; year++) {
      // Calculate annual contribution
      const annualEmployerContribution = currentSalary * employerRate;
      const annualPersonalContribution = currentSalary * personalRate;
      const totalAnnualContribution = annualEmployerContribution + annualPersonalContribution;

      // Apply contributions and returns
      if (year > 0) {
        currentSuperBalance += totalAnnualContribution;
        contributions += totalAnnualContribution;

        // Apply investment returns
        const grossReturns = currentSuperBalance * returns;
        const feesDeducted = currentSuperBalance * feesRate;
        const netReturns = grossReturns - feesDeducted;
        currentSuperBalance += netReturns;

        // Increase salary for next year
        currentSalary *= (1 + salaryGrowth);
      }

      // Add to chart data
      data.push({
        age: current + year,
        year: new Date().getFullYear() + year,
        balance: Math.round(currentSuperBalance),
        contributions: Math.round(contributions),
        realValue: Math.round(currentSuperBalance / Math.pow(1 + inflation, year))
      });
    }

    setChartData(data);
    setProjectedBalance(Math.round(currentSuperBalance));
    setTotalContributions(Math.round(contributions));
    setTotalEarnings(Math.round(currentSuperBalance - balance - contributions));
  };

  // Calculate on mount and when inputs change
  useEffect(() => {
    calculateSuper();
  }, [currentAge, retirementAge, currentBalance, annualSalary, employerContribution,
      personalContribution, salaryIncrease, investmentReturn, inflationRate, fees]);

  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Custom tooltip for chart
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-lg border">
          <p className="text-sm font-medium mb-2">Age: {label}</p>
          <p className="text-sm" style={{ color: '#10b981' }}>
            <span className="font-semibold">Balance:</span> {formatCurrency(payload[0].value)}
          </p>
          <p className="text-sm" style={{ color: '#0ea5e9' }}>
            <span className="font-semibold">Real Value:</span> {formatCurrency(payload[1].value)}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Superannuation Calculator</h1>
        <p className="text-muted-foreground mt-2">
          Project your retirement savings and optimize your super strategy
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Calculator Form */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Your Details
            </CardTitle>
            <CardDescription>
              Enter your information to calculate your projected super balance
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Age Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Age & Retirement
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="currentAge">Current Age</Label>
                  <Input
                    id="currentAge"
                    type="number"
                    value={currentAge}
                    onChange={(e) => setCurrentAge(e.target.value)}
                    min="18"
                    max="75"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="retirementAge">Retirement Age</Label>
                  <Input
                    id="retirementAge"
                    type="number"
                    value={retirementAge}
                    onChange={(e) => setRetirementAge(e.target.value)}
                    min="55"
                    max="75"
                  />
                </div>
              </div>
            </div>

            {/* Balance & Salary Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Balance & Income
              </h3>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="currentBalance">Current Super Balance ($)</Label>
                  <Input
                    id="currentBalance"
                    type="number"
                    value={currentBalance}
                    onChange={(e) => setCurrentBalance(e.target.value)}
                    min="0"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="annualSalary">Annual Salary ($)</Label>
                  <div className="flex gap-2">
                    <Input
                      id="annualSalary"
                      type="number"
                      value={annualSalary}
                      onChange={(e) => setAnnualSalary(e.target.value)}
                      min="0"
                      className="flex-1"
                    />
                    <Select value={salaryType} onValueChange={setSalaryType}>
                      <SelectTrigger className="w-[100px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="gross">Gross</SelectItem>
                        <SelectItem value="net">Net</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>

            {/* Contributions Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium flex items-center gap-2">
                <PiggyBank className="h-4 w-4" />
                Contributions
              </h3>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="employerContribution">
                    Employer Contribution: {employerContribution}%
                  </Label>
                  <Slider
                    id="employerContribution"
                    value={[parseFloat(employerContribution)]}
                    onValueChange={(value) => setEmployerContribution(value[0].toString())}
                    min={9.5}
                    max={20}
                    step={0.5}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="personalContribution">
                    Personal Contribution: {personalContribution}%
                  </Label>
                  <Slider
                    id="personalContribution"
                    value={[parseFloat(personalContribution)]}
                    onValueChange={(value) => setPersonalContribution(value[0].toString())}
                    min={0}
                    max={15}
                    step={0.5}
                  />
                </div>
              </div>
            </div>

            {/* Advanced Settings */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium flex items-center gap-2">
                <Percent className="h-4 w-4" />
                Growth & Returns
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="investmentReturn">Investment Return (%)</Label>
                  <Input
                    id="investmentReturn"
                    type="number"
                    value={investmentReturn}
                    onChange={(e) => setInvestmentReturn(e.target.value)}
                    min="0"
                    max="15"
                    step="0.5"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="salaryIncrease">Salary Increase (%)</Label>
                  <Input
                    id="salaryIncrease"
                    type="number"
                    value={salaryIncrease}
                    onChange={(e) => setSalaryIncrease(e.target.value)}
                    min="0"
                    max="10"
                    step="0.5"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="inflationRate">Inflation Rate (%)</Label>
                  <Input
                    id="inflationRate"
                    type="number"
                    value={inflationRate}
                    onChange={(e) => setInflationRate(e.target.value)}
                    min="0"
                    max="10"
                    step="0.5"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fees">Fees (%)</Label>
                  <Input
                    id="fees"
                    type="number"
                    value={fees}
                    onChange={(e) => setFees(e.target.value)}
                    min="0"
                    max="5"
                    step="0.1"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Results & Graph */}
        <div className="space-y-6">
          {/* Advisor Help Card */}
          <Card className="relative overflow-hidden border-2 border-emerald-400/50 shadow-2xl bg-gradient-to-br from-emerald-50 via-teal-50/80 to-cyan-50 dark:from-emerald-950/40 dark:via-teal-950/30 dark:to-cyan-950/40">
            {/* Morphing gradient background */}
            <div 
              className="absolute inset-0 animate-gradient-morph opacity-30"
              style={{
                background: `linear-gradient(135deg, 
                  rgba(16, 185, 129, 0.3) 0%, 
                  rgba(20, 184, 166, 0.2) 25%, 
                  rgba(6, 182, 212, 0.3) 50%, 
                  rgba(20, 184, 166, 0.2) 75%, 
                  rgba(16, 185, 129, 0.3) 100%)`,
                backgroundSize: '200% 200%'
              }}
            />
            
            {/* Secondary morphing layer */}
            <div 
              className="absolute inset-0 animate-gradient-morph opacity-20"
              style={{
                background: `radial-gradient(circle at 30% 50%, 
                  rgba(52, 211, 153, 0.4) 0%, 
                  transparent 50%)`,
                backgroundSize: '200% 200%',
                animationDelay: '-5s',
                animationDuration: '20s'
              }}
            />
            
            {/* Soft glow spots */}
            <div className="absolute top-10 right-20 w-40 h-40 bg-emerald-400/30 rounded-full blur-3xl" />
            <div className="absolute bottom-10 left-20 w-48 h-48 bg-teal-400/30 rounded-full blur-3xl" />
            
            <CardContent className="relative p-8">
              <div className="flex items-center justify-between gap-6">
                <div className="flex-1 space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="flex -space-x-2">
                      <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-white text-xs font-bold">SA</div>
                      <div className="w-8 h-8 rounded-full bg-teal-500 flex items-center justify-center text-white text-xs font-bold">MC</div>
                    </div>
                    <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20">
                      Expert Advisors Available
                    </Badge>
                  </div>
                  
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                    Ready to maximize your retirement savings?
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    Our certified financial advisors can help you optimize contributions, choose better investments, and save thousands in fees.
                  </p>
                  
                  <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2">
                    <div className="flex items-center gap-1">
                      <CheckCircle className="h-3 w-3 text-emerald-500" />
                      <span>Free consultation</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3 text-emerald-500" />
                      <span>15-min response</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Star className="h-3 w-3 text-emerald-500" />
                      <span>4.9/5 rating</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-col items-center gap-2">
                  <AdvisorContactButton 
                    context="Super Calculator - Results" 
                    variant="default"
                    size="lg"
                    className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white border-0 shadow-lg hover:shadow-xl transition-all transform hover:scale-105"
                  />
                  <span className="text-xs text-muted-foreground">No obligation</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Summary Cards */}
          <div className="grid grid-cols-2 gap-4">
            <Card className="border-emerald-200 dark:border-emerald-800">
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(projectedBalance)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Projected Balance at {retirementAge}
                </p>
              </CardContent>
            </Card>

            <Card className="border-sky-200 dark:border-sky-800">
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-sky-600 dark:text-sky-400">
                  {formatCurrency(totalEarnings)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Investment Earnings
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Chart */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Projected Super Balance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="balance" className="space-y-4">
                <TabsList>
                  <TabsTrigger value="balance">Balance Over Time</TabsTrigger>
                  <TabsTrigger value="breakdown">Contribution Breakdown</TabsTrigger>
                </TabsList>

                <TabsContent value="balance" className="space-y-4">
                  <ResponsiveContainer width="100%" height={350}>
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0.1}/>
                        </linearGradient>
                        <linearGradient id="colorRealValue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0.1}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="age" stroke="#6b7280" />
                      <YAxis tickFormatter={(value) => `$${value / 1000}k`} stroke="#6b7280" />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend />
                      <Area
                        type="monotone"
                        dataKey="balance"
                        stroke="#10b981"
                        strokeWidth={2}
                        fill="url(#colorBalance)"
                        name="Nominal Value"
                      />
                      <Area
                        type="monotone"
                        dataKey="realValue"
                        stroke="#0ea5e9"
                        strokeWidth={2}
                        fill="url(#colorRealValue)"
                        name="Real Value (Today's $)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </TabsContent>

                <TabsContent value="breakdown" className="space-y-4">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center p-4 rounded-lg bg-muted/50">
                      <span className="text-sm font-medium">Starting Balance</span>
                      <span className="font-bold">{formatCurrency(parseFloat(currentBalance))}</span>
                    </div>
                    <div className="flex justify-between items-center p-4 rounded-lg bg-sky-50 dark:bg-sky-900/20">
                      <span className="text-sm font-medium">Total Contributions</span>
                      <span className="font-bold text-sky-600 dark:text-sky-400">
                        {formatCurrency(totalContributions)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-4 rounded-lg bg-emerald-50 dark:bg-emerald-900/20">
                      <span className="text-sm font-medium">Investment Earnings</span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(totalEarnings)}
                      </span>
                    </div>
                    <div className="border-t pt-4">
                      <div className="flex justify-between items-center">
                        <span className="font-medium">Total at Retirement</span>
                        <span className="text-xl font-bold bg-gradient-to-r from-emerald-600 to-sky-600 bg-clip-text text-transparent">
                          {formatCurrency(projectedBalance)}
                        </span>
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Information Alert */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              This calculator provides estimates only. Actual results will vary based on
              market conditions, changes in contribution rates, and personal circumstances.
              Consider seeking professional financial advice for your specific situation.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    </div>
  );
}