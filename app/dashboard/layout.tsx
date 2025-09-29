"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import {
  Home,
  Calculator,
  Brain,
  FileText,
  Settings,
  Users,
  LogOut,
  Menu,
  X,
  ChartBar,
  User,
  Shield,
  Sun,
  Moon,
  ChevronDown,
  Wrench,
} from "lucide-react";
import { Logo } from "@/components/ui/logo";
import Image from "next/image";
import { useTheme } from "next-themes";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { Footer } from "@/components/ui/footer";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  const { data: session } = useSession();
  const { theme, setTheme } = useTheme();

  const isAdmin = session?.user && (session.user as any).role === "ADMIN";
  const userGroups = (session?.user as any)?.groups || [];
  const isAdvisoryClient = !userGroups.includes("Free Users") && userGroups.length > 0;

  const navigation = [
    { name: "Dashboard", href: "/dashboard", icon: Home },
    { name: "Reports", href: "/dashboard/reports", icon: ChartBar },
    { name: "Documents", href: "/dashboard/documents", icon: FileText },
    { name: "Profile", href: "/dashboard/profile", icon: User },
  ];

  const tools = [
    { name: "Super Calculator", href: "/dashboard/tools/super-calculator", icon: Calculator },
    { name: "Spending Analyzer", href: "/dashboard/tools/spending-analyzer", icon: Brain },
  ];

  const adminNavigation = [
    { name: "Admin Dashboard", href: "/admin", icon: Shield },
    { name: "Manage Users", href: "/admin/users", icon: Users },
    { name: "Manage Groups", href: "/admin/groups", icon: Users },
    { name: "System Settings", href: "/admin/settings", icon: Settings },
  ];

  const handleSignOut = async () => {
    await signOut({ callbackUrl: "/" });
  };

  return (
    <div className="h-screen gradient-bg relative overflow-hidden">
      {/* Combined header and nav wrapper with single shadow */}
      <div className="fixed top-0 left-0 right-0 z-40" style={{boxShadow: "0 8px 32px 0 rgba(31, 38, 135, 0.07)"}}>
        {/* Header bar */} 
        <header className="w-full bg-[#090b17]/90 backdrop-blur-md">
          <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
          {/* Logo and menu button */}
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden"
            >
              <Menu className="h-6 w-6 text-white" />
            </button>
            <Link href="/dashboard" className="flex items-center">
              <Image 
                src="/logo-light.png"
                alt="Trend Advisory"
                width={160}
                height={36}
                priority
              />
            </Link>
          </div>

          {/* Right side controls */}
          <div className="flex items-center space-x-3">
            {/* Theme Toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="rounded-lg hover:bg-white/10 dark:hover:bg-white/10"
            >
              {theme === "dark" ? (
                <Sun className="h-5 w-5 text-white" />
              ) : (
                <Moon className="h-5 w-5 text-white" />
              )}
            </Button>

            {/* Profile Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className={cn(
                    "flex items-center space-x-2 rounded-lg",
                    "hover:bg-white/10 dark:hover:bg-white/10"
                  )}
                >
                  <div className={cn(
                    "h-8 w-8 rounded-full flex items-center justify-center",
                    isAdvisoryClient
                      ? "bg-white/20 backdrop-blur-sm"
                      : "bg-gradient-to-br from-primary/30 to-primary/10 backdrop-blur-sm"
                  )}>
                    <User className="h-4 w-4 text-white" />
                  </div>
                  <span className="hidden sm:inline-block text-white">
                    {session?.user?.name || session?.user?.email?.split('@')[0] || 'User'}
                  </span>
                  <ChevronDown className="h-4 w-4 text-white" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56 glass-card" align="end">
                <DropdownMenuLabel>
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {session?.user?.name || 'User'}
                    </p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {session?.user?.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/profile">
                    <User className="mr-2 h-4 w-4" />
                    Profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/settings">
                    <Settings className="mr-2 h-4 w-4" />
                    Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            </div>
          </div>
          </div>
        </header>

        {/* Navigation bar */}
        <nav className="w-full bg-white/90 backdrop-blur-md border-b border-gray-300/50 dark:border-gray-600/50">
          <div className="max-w-7xl mx-auto px-14 py-4">
          <div className="flex items-center -ml-3 space-x-1 overflow-x-auto">
            {/* Dashboard Link */}
            <Link
              href="/dashboard"
              className={cn(
                "flex items-center px-3 py-2 text-base font-medium rounded-md transition-colors whitespace-nowrap",
                pathname === "/dashboard"
                  ? "bg-secondary text-secondary-foreground"
                  : "text-[#090b17] dark:text-gray-300 hover:bg-secondary/10 dark:hover:bg-gray-700"
              )}
            >
              <Home className="mr-2 h-4 w-4" />
              Dashboard
            </Link>

            {/* Tools Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className={cn(
                    "flex items-center px-3 py-2 text-base font-medium rounded-md transition-colors whitespace-nowrap outline-none",
                    pathname.includes("/dashboard/tools")
                      ? "text-secondary dark:text-secondary"
                      : "text-[#090b17] dark:text-gray-300 hover:text-[#090b17]/80 dark:hover:text-gray-100"
                  )}
                >
                  <Wrench className="mr-2 h-4 w-4" />
                  Tools
                  <ChevronDown className="ml-1 h-3 w-3" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-56 glass-card border-0 shadow-xl mt-2 p-2"
                align="start"
                sideOffset={5}
              >
                {tools.map((tool) => (
                  <DropdownMenuItem key={tool.href} asChild className="mb-1 last:mb-0">
                    <Link
                      href={tool.href}
                      className={cn(
                        "flex items-center w-full cursor-pointer py-2.5 px-3 rounded-md",
                        pathname === tool.href && "bg-secondary/20"
                      )}
                    >
                      <tool.icon className="mr-3 h-4 w-4 text-[#090b17] dark:text-gray-300" />
                      <span className="text-base text-[#090b17] dark:text-gray-300">{tool.name}</span>
                    </Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Remaining Navigation */}
            {navigation.slice(1).map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center px-3 py-2 text-base font-medium rounded-md transition-colors whitespace-nowrap",
                  pathname === item.href
                    ? "bg-secondary text-secondary-foreground"
                    : "text-[#090b17] dark:text-gray-300 hover:bg-secondary/10 dark:hover:bg-gray-700"
                )}
              >
                <item.icon className="mr-2 h-4 w-4" />
                {item.name}
              </Link>
            ))}

          {/* Admin Navigation */}
          {isAdmin && (
            <>
              <div className="w-px h-8 bg-gray-300 dark:bg-gray-700 mx-2" />
              {adminNavigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "flex items-center px-3 py-2 text-base font-medium rounded-md transition-colors whitespace-nowrap",
                    pathname === item.href
                      ? "bg-secondary text-secondary-foreground"
                      : "text-[#090b17] dark:text-gray-300 hover:bg-secondary/10 dark:hover:bg-gray-700"
                  )}
                >
                  <item.icon className="mr-2 h-4 w-4" />
                  {item.name}
                </Link>
              ))}
            </>
          )}
          </div>
          </div>
        </nav>
      </div>

      {/* Mobile sidebar backdrop */}
      <div
        className={cn(
          "fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden",
          sidebarOpen ? "block" : "hidden"
        )}
        onClick={() => setSidebarOpen(false)}
      />

      {/* Mobile sidebar */}
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col w-64 p-4 bg-white dark:bg-gray-800 transform transition-transform duration-200 ease-in-out lg:hidden",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex items-center justify-between h-16 px-6 mb-4">
          <Link href="/dashboard" className="flex items-center">
            <Logo width={160} height={36} />
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
          {/* Main Navigation */}
          <div className="space-y-1">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors",
                  pathname === item.href
                    ? "bg-secondary text-secondary-foreground"
                    : "text-gray-700 dark:text-gray-300 hover:bg-secondary/10 dark:hover:bg-gray-700"
                )}
              >
                <item.icon className="mr-3 h-5 w-5" />
                {item.name}
              </Link>
            ))}

            {/* Tools Section */}
            <div className="pt-2">
              <p className="px-3 mb-2 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Tools
              </p>
              {tools.map((tool) => (
                <Link
                  key={tool.href}
                  href={tool.href}
                  onClick={() => setSidebarOpen(false)}
                  className={cn(
                    "flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors",
                    pathname === tool.href
                      ? "bg-secondary text-secondary-foreground"
                      : "text-gray-700 dark:text-gray-300 hover:bg-secondary/10 dark:hover:bg-gray-700"
                  )}
                >
                  <tool.icon className="mr-3 h-5 w-5" />
                  {tool.name}
                </Link>
              ))}
            </div>
          </div>

          {/* Admin Navigation */}
          {isAdmin && (
            <div className="pt-4">
              <p className="px-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Administration
              </p>
              <div className="mt-2 space-y-1">
                {adminNavigation.map((item) => (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={cn(
                      "flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors",
                      pathname === item.href
                        ? "bg-secondary text-secondary-foreground"
                        : "text-gray-700 dark:text-gray-300 hover:bg-secondary/10 dark:hover:bg-gray-700"
                    )}
                  >
                    <item.icon className="mr-3 h-5 w-5" />
                    {item.name}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </nav>

        <div className="p-4 flex-shrink-0">
          <div className="flex items-center mb-3">
            <div className="flex-1">
              <p className="text-sm font-medium">
                {session?.user?.name || session?.user?.email}
              </p>
              <p className="text-xs text-gray-500">
                {(session?.user as any)?.role || "Customer"}
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            className="w-full"
            onClick={handleSignOut}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sign out
          </Button>
        </div>
      </div>

      {/* Main content */}
      <main className="overflow-auto h-full pt-[160px]">
        <div className="max-w-7xl mx-auto px-14 py-6">
          {children}
        </div>
        <Footer />
      </main>
    </div>
  );
}