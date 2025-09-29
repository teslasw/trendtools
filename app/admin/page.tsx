"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";
import {
  Users,
  UserPlus,
  Shield,
  Activity,
  TrendingUp,
  Settings,
  Database,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
  Calendar,
  FileText,
  Server,
} from "lucide-react";

interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  suspendedUsers: number;
  invitedUsers: number;
  totalGroups: number;
  totalTools: number;
  activeTools: number;
  recentActivities: number;
}

export default function AdminDashboard() {
  const { toast } = useToast();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [recentActivities, setRecentActivities] = useState<any[]>([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const response = await fetch("/api/admin/dashboard");
      if (!response.ok) throw new Error("Failed to fetch dashboard data");
      const data = await response.json();
      setStats(data.stats);
      setRecentActivities(data.recentActivities);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load dashboard data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-8">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground">
            Welcome back! Here's an overview of your system.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="h-4 w-20 animate-pulse bg-muted rounded" />
                <div className="h-4 w-4 animate-pulse bg-muted rounded" />
              </CardHeader>
              <CardContent>
                <div className="h-8 w-16 animate-pulse bg-muted rounded mb-2" />
                <div className="h-3 w-24 animate-pulse bg-muted rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground">
            Welcome back! Here's an overview of your system.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm">
            <Calendar className="mr-2 h-4 w-4" />
            Last 30 days
          </Button>
          <Button size="sm">
            <FileText className="mr-2 h-4 w-4" />
            Download Report
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Users
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalUsers || 0}</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600 dark:text-green-400">
                <ArrowUpRight className="inline h-3 w-3" />
                12%
              </span>{" "}
              from last month
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Active Users
            </CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.activeUsers || 0}</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600 dark:text-green-400">
                <ArrowUpRight className="inline h-3 w-3" />
                8%
              </span>{" "}
              from last month
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              User Groups
            </CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalGroups || 0}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.totalGroups || 0} active groups
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Active Tools
            </CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.activeTools || 0}</div>
            <p className="text-xs text-muted-foreground">
              of {stats?.totalTools || 0} total tools
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        {/* Activity Chart */}
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>User Activity</CardTitle>
            <CardDescription>
              Daily active users over the last 7 days
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[200px] flex items-end justify-between space-x-2">
              {[65, 45, 78, 52, 89, 72, 91].map((height, i) => (
                <div key={i} className="flex-1 flex flex-col items-center space-y-1">
                  <div
                    className="w-full bg-primary rounded-t transition-all hover:bg-primary/80"
                    style={{ height: `${height}%` }}
                  />
                  <span className="text-xs text-muted-foreground">
                    {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][i]}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Activities */}
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Recent Activities</CardTitle>
            <CardDescription>
              Latest user actions and system events
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivities.slice(0, 5).map((activity, index) => (
                <div key={index} className="flex items-center">
                  <div className="mr-3">
                    {activity.action === "SIGN_IN" ? (
                      <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-full">
                        <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                      </div>
                    ) : activity.action === "SIGN_OUT" ? (
                      <div className="p-2 bg-gray-100 dark:bg-gray-900/20 rounded-full">
                        <XCircle className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                      </div>
                    ) : activity.action === "REGISTRATION" ? (
                      <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-full">
                        <UserPlus className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      </div>
                    ) : (
                      <div className="p-2 bg-yellow-100 dark:bg-yellow-900/20 rounded-full">
                        <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {activity.user?.email || "Unknown User"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {activity.action.toLowerCase().replace("_", " ")}
                    </p>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {new Date(activity.createdAt).toLocaleTimeString()}
                  </div>
                </div>
              ))}
              {recentActivities.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No recent activities
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Section */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>
              Common administrative tasks
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2">
            <Button
              variant="outline"
              className="w-full justify-start"
              asChild
            >
              <Link href="/admin/users/invite">
                <UserPlus className="mr-2 h-4 w-4" />
                Invite New User
              </Link>
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start"
              asChild
            >
              <Link href="/admin/groups/create">
                <Shield className="mr-2 h-4 w-4" />
                Create User Group
              </Link>
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start"
              asChild
            >
              <Link href="/admin/settings">
                <Settings className="mr-2 h-4 w-4" />
                System Settings
              </Link>
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => window.open("/api/admin/export/users", "_blank")}
            >
              <Database className="mr-2 h-4 w-4" />
              Export User Data
            </Button>
          </CardContent>
        </Card>

        {/* System Status */}
        <Card>
          <CardHeader>
            <CardTitle>System Health</CardTitle>
            <CardDescription>
              Current system performance metrics
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Database</span>
                <Badge variant="outline" className="text-green-600 dark:text-green-400">
                  Healthy
                </Badge>
              </div>
              <Progress value={95} className="h-2" />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>API Response</span>
                <span className="text-muted-foreground">45ms</span>
              </div>
              <Progress value={85} className="h-2" />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Memory Usage</span>
                <span className="text-muted-foreground">2.4GB / 4GB</span>
              </div>
              <Progress value={60} className="h-2" />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>CPU Usage</span>
                <span className="text-muted-foreground">12%</span>
              </div>
              <Progress value={12} className="h-2" />
            </div>
          </CardContent>
        </Card>

        {/* User Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>User Distribution</CardTitle>
            <CardDescription>
              Breakdown by status and role
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Active</span>
                  <span className="text-sm text-muted-foreground">
                    {stats?.activeUsers || 0}
                  </span>
                </div>
                <Progress
                  value={stats ? (stats.activeUsers / stats.totalUsers) * 100 : 0}
                  className="h-2"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Suspended</span>
                  <span className="text-sm text-muted-foreground">
                    {stats?.suspendedUsers || 0}
                  </span>
                </div>
                <Progress
                  value={stats ? (stats.suspendedUsers / stats.totalUsers) * 100 : 0}
                  className="h-2 [&>div]:bg-destructive"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Invited</span>
                  <span className="text-sm text-muted-foreground">
                    {stats?.invitedUsers || 0}
                  </span>
                </div>
                <Progress
                  value={stats ? (stats.invitedUsers / stats.totalUsers) * 100 : 0}
                  className="h-2 [&>div]:bg-yellow-500"
                />
              </div>
              <div className="pt-3 border-t">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Total Users</span>
                  <span className="text-sm font-bold">
                    {stats?.totalUsers || 0}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}