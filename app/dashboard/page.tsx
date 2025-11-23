"use client";

import { useUser } from "@/lib/hooks/use-user";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import Image from "next/image";
import {
  Calculator,
  Brain,
  TrendingUp,
  DollarSign,
  FileText,
  ChartBar,
  ArrowRight,
  Activity,
  PiggyBank,
  Wallet,
  Building,
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function DashboardPage() {
  const { user } = useUser();
  const firstName = user?.name?.split(" ")[0] || "there";

  const quickActions = [
    {
      title: "Super Calculator",
      description: "Calculate your superannuation projections",
      icon: Calculator,
      href: "/dashboard/tools/super-calculator",
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
    {
      title: "Spending Analyzer",
      description: "Upload and analyze your bank statements",
      icon: Brain,
      href: "/dashboard/tools/spending-analyzer",
      color: "text-emerald-500",
      bgColor: "bg-emerald-500/10",
    },
    {
      title: "Budget Builder",
      description: "Create and manage your monthly budget",
      icon: PiggyBank,
      href: "/dashboard/tools/budget-builder",
      color: "text-purple-500",
      bgColor: "bg-purple-500/10",
    },
    {
      title: "Age Pension Calculator",
      description: "Calculate your Age Pension entitlement and compare scenarios",
      icon: Calculator,
      href: "/dashboard/tools/age-pension",
      color: "text-amber-500",
      bgColor: "bg-amber-500/10",
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
                stat.trend === "down" && "text-destructive",
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
        <h2 className="text-xl font-semibold mb-4">Trend Tools</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {quickActions.map((action) => (
            <Link key={action.title} href={action.href}>
              <Card className="glass-card border-0 cursor-pointer hover:shadow-lg transition-shadow h-full">
                <CardHeader>
                  <div className={cn("h-12 w-12 rounded-full flex items-center justify-center mb-3", action.bgColor)}>
                    <action.icon className={cn("h-6 w-6", action.color)} />
                  </div>
                  <CardTitle>{action.title}</CardTitle>
                  <CardDescription>{action.description}</CardDescription>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {/* Account Balances and Goals */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Wallet className="mr-2 h-5 w-5" />
              Current Balances
            </CardTitle>
            <CardDescription>
              Your accounts overview
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {/* Superannuation */}
              <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center">
                    <div className="h-5 w-5 rounded bg-emerald-600 dark:bg-emerald-500 flex items-center justify-center mr-2">
                      <span className="text-[10px] font-bold text-white">AS</span>
                    </div>
                    <span className="text-sm font-medium">Superannuation</span>
                  </div>
                  <span className="text-xs text-emerald-600 dark:text-emerald-500">+8.2%</span>
                </div>
                <p className="text-lg font-bold">$124,320</p>
                <p className="text-xs text-muted-foreground">Australian Super</p>
              </div>

              {/* Bank Accounts */}
              <div className="space-y-2">
                <div className="p-3 rounded-lg border">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center">
                      <div className="h-5 w-5 rounded bg-yellow-500 dark:bg-yellow-600 flex items-center justify-center mr-2">
                        <span className="text-[10px] font-bold text-black">C</span>
                      </div>
                      <span className="text-sm font-medium">Everyday Account</span>
                    </div>
                    <span className="text-xs text-muted-foreground">****4521</span>
                  </div>
                  <p className="text-lg font-semibold">$3,456.78</p>
                  <p className="text-xs text-muted-foreground">Commonwealth Bank</p>
                </div>
                
                <div className="p-3 rounded-lg border">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center">
                      <div className="h-5 w-5 rounded bg-orange-500 dark:bg-orange-600 flex items-center justify-center mr-2">
                        <span className="text-[10px] font-bold text-white">I</span>
                      </div>
                      <span className="text-sm font-medium">Savings Account</span>
                    </div>
                    <span className="text-xs text-muted-foreground">****8932</span>
                  </div>
                  <p className="text-lg font-semibold">$18,234.50</p>
                  <p className="text-xs text-muted-foreground">ING Direct</p>
                </div>
              </div>
            </div>
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