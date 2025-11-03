"use client";

import { useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShoppingCart,
  Zap,
  Coffee,
  Car,
  Home,
  Heart,
  Sparkles,
  AlertCircle,
  CheckCircle,
  XCircle,
  HelpCircle,
} from "lucide-react";
import { Transaction } from "./TransactionTable";
import { formatCurrency } from "@/lib/utils";

interface SpendingDashboardProps {
  transactions: Transaction[];
  insights: any[];
}

const CATEGORY_COLORS = {
  Entertainment: "#8b5cf6",
  Groceries: "#3b82f6",
  Transport: "#10b981",
  Shopping: "#f59e0b",
  Utilities: "#ef4444",
  Food: "#ec4899",
  Other: "#6b7280",
};

const CATEGORY_ICONS = {
  Entertainment: Zap,
  Groceries: ShoppingCart,
  Transport: Car,
  Shopping: ShoppingCart,
  Utilities: Home,
  Food: Coffee,
  Health: Heart,
  Other: DollarSign,
};

export function SpendingDashboard({ transactions, insights }: SpendingDashboardProps) {
  const stats = useMemo(() => {
    const total = transactions.reduce((sum, t) => sum + Math.abs(t.amount), 0);
    const keepTotal = transactions
      .filter(t => t.status === "KEEP")
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);
    const cancelTotal = transactions
      .filter(t => t.status === "CANCEL")
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);
    const considerTotal = transactions
      .filter(t => t.status === "CONSIDER")
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    const categorySums: Record<string, number> = {};
    transactions.forEach(t => {
      const category = t.category || "Other";
      categorySums[category] = (categorySums[category] || 0) + Math.abs(t.amount);
    });

    const categoryData = Object.entries(categorySums)
      .map(([name, value]) => ({ name, value, percentage: (value / total) * 100 }))
      .sort((a, b) => b.value - a.value);

    const recurringTotal = transactions
      .filter(t => t.isRecurring)
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    const savingsOpportunity = cancelTotal + (considerTotal * 0.5);
    const savingsPercentage = (savingsOpportunity / total) * 100;

    return {
      total,
      keepTotal,
      cancelTotal,
      considerTotal,
      categoryData,
      recurringTotal,
      savingsOpportunity,
      savingsPercentage,
    };
  }, [transactions]);

  const weeklySpending = useMemo(() => {
    const weeks: Record<string, number> = {};
    transactions.forEach(t => {
      const weekStart = new Date(t.date);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      const weekKey = weekStart.toISOString().split('T')[0];
      weeks[weekKey] = (weeks[weekKey] || 0) + Math.abs(t.amount);
    });

    return Object.entries(weeks)
      .map(([week, amount]) => ({
        week: new Date(week).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        amount
      }))
      .slice(-4);
  }, [transactions]);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="glass-card border-0 shadow-xl">
          <CardHeader className="pb-3">
            <CardDescription>Total Spending</CardDescription>
            <CardTitle className="text-2xl">{formatCurrency(stats.total)}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center text-xs text-muted-foreground">
              <DollarSign className="mr-1 h-3 w-3" />
              {transactions.length} transactions
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card border-0 shadow-xl">
          <CardHeader className="pb-3">
            <CardDescription>Potential Savings</CardDescription>
            <CardTitle className="text-2xl text-green-600">
              {formatCurrency(stats.savingsOpportunity)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center text-xs text-green-600">
              <TrendingDown className="mr-1 h-3 w-3" />
              {stats.savingsPercentage.toFixed(1)}% of total
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card border-0 shadow-xl">
          <CardHeader className="pb-3">
            <CardDescription>Recurring Charges</CardDescription>
            <CardTitle className="text-2xl">{formatCurrency(stats.recurringTotal)}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center text-xs text-muted-foreground">
              <Zap className="mr-1 h-3 w-3" />
              Monthly subscriptions
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card border-0 shadow-xl">
          <CardHeader className="pb-3">
            <CardDescription>Review Status</CardDescription>
            <CardTitle className="text-2xl">
              {Math.round((transactions.filter(t => t.status).length / transactions.length) * 100)}%
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Progress
              value={(transactions.filter(t => t.status).length / transactions.length) * 100}
              className="h-2"
            />
          </CardContent>
        </Card>
      </div>

      {/* Action Summary */}
      <Card className="glass-card border-0 shadow-xl">
        <CardHeader>
          <CardTitle>Action Summary</CardTitle>
          <CardDescription>Your decisions on analyzed transactions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="flex items-center justify-between p-4 rounded-lg bg-green-50 dark:bg-green-950/20">
              <div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="font-semibold text-green-600">Keep</span>
                </div>
                <p className="text-2xl font-bold mt-2">{formatCurrency(stats.keepTotal)}</p>
                <p className="text-sm text-muted-foreground">
                  {transactions.filter(t => t.status === "KEEP").length} transactions
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 rounded-lg bg-red-50 dark:bg-red-950/20">
              <div>
                <div className="flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-red-600" />
                  <span className="font-semibold text-red-600">Cancel</span>
                </div>
                <p className="text-2xl font-bold mt-2">{formatCurrency(stats.cancelTotal)}</p>
                <p className="text-sm text-muted-foreground">
                  {transactions.filter(t => t.status === "CANCEL").length} transactions
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 rounded-lg bg-yellow-50 dark:bg-yellow-950/20">
              <div>
                <div className="flex items-center gap-2">
                  <HelpCircle className="h-4 w-4 text-yellow-600" />
                  <span className="font-semibold text-yellow-600">Consider</span>
                </div>
                <p className="text-2xl font-bold mt-2">{formatCurrency(stats.considerTotal)}</p>
                <p className="text-sm text-muted-foreground">
                  {transactions.filter(t => t.status === "CONSIDER").length} transactions
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Charts */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Category Breakdown */}
        <Card className="glass-card border-0 shadow-xl">
          <CardHeader>
            <CardTitle>Spending by Category</CardTitle>
            <CardDescription>Where your money goes</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={stats.categoryData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percentage }) => `${name} ${percentage.toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {stats.categoryData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={CATEGORY_COLORS[entry.name as keyof typeof CATEGORY_COLORS] || CATEGORY_COLORS.Other}
                    />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
              </PieChart>
            </ResponsiveContainer>

            {/* Category List */}
            <div className="mt-4 space-y-2">
              {stats.categoryData.slice(0, 5).map((category) => {
                const Icon = CATEGORY_ICONS[category.name as keyof typeof CATEGORY_ICONS] || DollarSign;
                return (
                  <div key={category.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: CATEGORY_COLORS[category.name as keyof typeof CATEGORY_COLORS] || CATEGORY_COLORS.Other }}
                      />
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">{category.name}</span>
                    </div>
                    <span className="text-sm font-semibold">{formatCurrency(category.value)}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Weekly Trend */}
        <Card className="glass-card border-0 shadow-xl">
          <CardHeader>
            <CardTitle>Weekly Spending Trend</CardTitle>
            <CardDescription>Your spending pattern over time</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={weeklySpending}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="week" />
                <YAxis />
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Line
                  type="monotone"
                  dataKey="amount"
                  stroke="#8b5cf6"
                  strokeWidth={2}
                  dot={{ fill: '#8b5cf6' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* AI Insights */}
      {insights.length > 0 && (
        <Card className="glass-card border-0 shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              AI Insights & Recommendations
            </CardTitle>
            <CardDescription>
              Personalized insights based on your spending patterns
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {insights.map((insight, index) => (
                <div
                  key={index}
                  className="flex items-start gap-3 p-4 rounded-lg bg-muted/50"
                >
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Sparkles className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold">{insight.title}</h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      {insight.description}
                    </p>
                    {insight.value && (
                      <Badge variant="secondary" className="mt-2">
                        {formatCurrency(insight.value)}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}