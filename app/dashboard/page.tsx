"use client";

import { useSession } from "next-auth/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  Calculator,
  Brain,
  TrendingUp,
  DollarSign,
  FileText,
  ChartBar,
  ArrowRight,
  Activity,
} from "lucide-react";

export default function DashboardPage() {
  const { data: session } = useSession();
  const firstName = (session?.user as any)?.name?.split(" ")[0] || "there";

  const quickActions = [
    {
      title: "Super Calculator",
      description: "Calculate your superannuation projections",
      icon: Calculator,
      href: "/dashboard/tools/super-calculator",
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      title: "Spending Analyzer",
      description: "Upload and analyze your bank statements",
      icon: Brain,
      href: "/dashboard/tools/spending-analyzer",
      color: "text-green-600",
      bgColor: "bg-green-50",
    },
    {
      title: "View Reports",
      description: "Access your financial reports",
      icon: ChartBar,
      href: "/dashboard/reports",
      color: "text-purple-600",
      bgColor: "bg-purple-50",
    },
    {
      title: "Documents",
      description: "Manage your financial documents",
      icon: FileText,
      href: "/dashboard/documents",
      color: "text-orange-600",
      bgColor: "bg-orange-50",
    },
  ];

  const stats = [
    {
      title: "Monthly Spending",
      value: "$4,523",
      change: "-12%",
      trend: "down",
    },
    {
      title: "Super Balance",
      value: "$124,320",
      change: "+8.2%",
      trend: "up",
    },
    {
      title: "Active Goals",
      value: "3",
      change: "On track",
      trend: "neutral",
    },
    {
      title: "Next Review",
      value: "15 days",
      change: "Scheduled",
      trend: "neutral",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="pt-6">
        <h1 className="text-3xl font-bold">
          Welcome back, {firstName}!
        </h1>
        <p className="text-muted-foreground mt-2">
          Here's an overview of your financial status
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="pb-3">
              <CardDescription>{stat.title}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold mb-2">{stat.value}</div>
              <div className={cn(
                "text-sm flex items-center",
                stat.trend === "up" && "text-emerald-600 dark:text-emerald-500",
                stat.trend === "down" && "text-red-600",
                stat.trend === "neutral" && "text-gray-600"
              )}>
                {stat.trend === "up" && <TrendingUp className="h-4 w-4 mr-1" />}
                {stat.trend === "down" && (
                  <TrendingUp className="h-4 w-4 mr-1 rotate-180" />
                )}
                {stat.change}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {quickActions.map((action) => (
            <Link key={action.title} href={action.href}>
              <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full flex flex-col">
                <CardHeader className="flex-1">
                  <div className={cn("p-3 rounded-lg w-fit mb-2", action.bgColor)}>
                    <action.icon className={cn("h-6 w-6", action.color)} />
                  </div>
                  <CardTitle className="text-lg">{action.title}</CardTitle>
                  <CardDescription>{action.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="ghost" className="p-0 h-auto">
                    Open tool <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Activity className="mr-2 h-5 w-5" />
              Recent Transactions
            </CardTitle>
            <CardDescription>
              Your latest spending activity
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { merchant: "Woolworths", amount: "-$124.50", date: "Today" },
                { merchant: "Spotify", amount: "-$11.99", date: "Yesterday" },
                { merchant: "Salary Deposit", amount: "+$3,240.00", date: "3 days ago" },
                { merchant: "Netflix", amount: "-$19.99", date: "5 days ago" },
              ].map((transaction, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <p className="font-medium">{transaction.merchant}</p>
                    <p className="text-sm text-gray-500">{transaction.date}</p>
                  </div>
                  <span className={cn(
                    "font-semibold",
                    transaction.amount.startsWith("+") ? "text-emerald-600 dark:text-emerald-500" : "text-red-600"
                  )}>
                    {transaction.amount}
                  </span>
                </div>
              ))}
            </div>
            <Link href="/dashboard/tools/spending-analyzer">
              <Button variant="outline" className="w-full mt-4">
                View all transactions
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <DollarSign className="mr-2 h-5 w-5" />
              Financial Goals
            </CardTitle>
            <CardDescription>
              Track your progress towards financial goals
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { goal: "Emergency Fund", progress: 75, target: "$10,000" },
                { goal: "House Deposit", progress: 45, target: "$80,000" },
                { goal: "Holiday Fund", progress: 90, target: "$5,000" },
              ].map((goal, i) => (
                <div key={i} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">{goal.goal}</span>
                    <span className="text-gray-500">{goal.target}</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-emerald-500 dark:bg-emerald-600 h-2 rounded-full transition-all"
                      style={{ width: `${goal.progress}%` }}
                    />
                  </div>
                  <div className="text-xs text-gray-500">{goal.progress}% complete</div>
                </div>
              ))}
            </div>
            <Link href="/dashboard/goals">
              <Button variant="outline" className="w-full mt-4">
                Manage goals
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}