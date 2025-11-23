"use client";

import {
  Calculator,
  Brain,
  PiggyBank,
  Home,
  FileText,
  ChartBar,
  User,
  ArrowRight,
  Menu,
  X,
  ArrowLeft,
  Settings,
  LogOut,
  Shield,
  Users,
  Sun,
  Moon,
  ChevronDown,
  Wrench,
} from "lucide-react";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { useUser } from "@/lib/hooks/use-user";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Image from "next/image";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
} from "@/components/ui/navigation-menu";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

const toolCategories = [
  {
    id: "budget-planning",
    title: "Budget & Planning",
    description: "Tools to manage your budget and track spending",
    tools: [
      {
        id: "budget-builder",
        title: "Budget Builder",
        description: "Create and manage your monthly budget",
        href: "/dashboard/tools/budget-builder",
        icon: PiggyBank,
        color: "text-purple-500",
        bgColor: "bg-purple-500/10",
      },
      {
        id: "spending-analyzer",
        title: "Spending Analyzer",
        description: "Analyze your spending patterns with AI",
        href: "/dashboard/tools/spending-analyzer",
        icon: Brain,
        color: "text-emerald-500",
        bgColor: "bg-emerald-500/10",
        badge: "AI",
      },
    ],
  },
  {
    id: "retirement",
    title: "Retirement Planning",
    description: "Plan for your retirement with confidence",
    tools: [
      {
        id: "age-pension",
        title: "Age Pension Calculator",
        description: "Calculate your age pension entitlements",
        href: "/dashboard/tools/age-pension",
        icon: Calculator,
        color: "text-amber-500",
        bgColor: "bg-amber-500/10",
      },
      {
        id: "super-calculator",
        title: "Super Calculator",
        description: "Project your superannuation balance",
        href: "/dashboard/tools/super-calculator",
        icon: Calculator,
        color: "text-blue-500",
        bgColor: "bg-blue-500/10",
      },
    ],
  },
];

const ToolsMenu = ({ onClose }: { onClose?: () => void }) => {
  const pathname = usePathname();

  return (
    <div className="p-6 ">
      {toolCategories.map((category) => (
        <div key={category.id} className="mb-6 last:mb-0">
          <div className="mb-4 border-b border-border pb-3">
            <strong className="text-sm font-medium text-foreground">
              {category.title}
            </strong>
            <p className="text-muted-foreground mt-1 text-xs">
              {category.description}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {category.tools.map((tool) => (
              <DropdownMenuItem key={tool.id} asChild>
                <Link
                  href={tool.href}
                  className={cn(
                    "group flex items-center space-x-3 rounded-md p-3 text-left transition-all duration-200 ease-in-out hover:!bg-white dark:hover:!bg-gray-800 focus:!bg-white dark:focus:!bg-gray-800 cursor-pointer hover:shadow-sm",
                    pathname === tool.href && "!bg-white dark:!bg-gray-800"
                  )}
                >
                  <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-md transition-transform duration-200 group-hover:scale-105", tool.bgColor)}>
                    <tool.icon className={cn("h-5 w-5", tool.color)} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <div className={cn(
                        "text-sm font-medium transition-colors duration-200",
                        pathname === tool.href ? "text-[#2285c5]" : "text-foreground group-hover:text-[#2285c5]"
                      )}>{tool.title}</div>
                      {tool.badge && (
                        <Badge className="bg-gradient-to-r from-sky-500 to-blue-500 text-white border-0 px-1.5 py-0 text-[10px] h-4">
                          {tool.badge}
                        </Badge>
                      )}
                    </div>
                    <p className="text-muted-foreground text-xs mt-0.5">
                      {tool.description}
                    </p>
                  </div>
                </Link>
              </DropdownMenuItem>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export const DashboardNav = () => {
  const [open, setOpen] = useState(false);
  const [submenu, setSubmenu] = useState<"tools" | null>(null);
  const pathname = usePathname();
  const { user, loading } = useUser();
  const { theme, setTheme } = useTheme();
  const router = useRouter();
  const supabase = createClient();

  const isAdmin = user?.role === "ADMIN";

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/auth/signin");
  };

  const mainNavigation = [
    { name: "Dashboard", href: "/dashboard", icon: Home },
    { name: "Reports", href: "/dashboard/reports", icon: ChartBar },
    { name: "Documents", href: "/dashboard/documents", icon: FileText },
    { name: "Profile", href: "/dashboard/profile", icon: User },
  ];

  const adminNavigation = [
    { name: "Admin", href: "/admin", icon: Shield },
    { name: "Users", href: "/admin/users", icon: Users },
    { name: "Groups", href: "/admin/groups", icon: Users },
    { name: "Settings", href: "/admin/settings", icon: Settings },
  ];

  return (
    <section className="inset-x-0 top-0 z-20 w-full">
      <div className="max-w-7xl mx-auto px-10">
        <NavigationMenu delayDuration={0} className="min-w-full [&>div:last-child]:left-auto">
          <div className="flex w-full justify-between items-center gap-2 py-4">
            {/* Logo */}
            <Link href="/dashboard" className="flex items-center mr-6">
              <Image
                src="/logo-light.png"
                alt="Trend Advisory"
                width={160}
                height={36}
                priority
              />
            </Link>

            {/* Desktop Navigation */}
            <div className="flex items-center gap-0 xl:gap-2 flex-1">
              <NavigationMenuList className="hidden gap-0 lg:flex">
                {/* Dashboard Link */}
                <NavigationMenuItem>
                  <Link href="/dashboard" legacyBehavior passHref>
                    <NavigationMenuLink
                      className={cn(
                        "group inline-flex h-9 w-max items-center justify-center rounded-md px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/10 focus:bg-white/10 focus:outline-none disabled:pointer-events-none disabled:opacity-50",
                        pathname === "/dashboard" && "bg-white/10"
                      )}
                    >
                      <Home className="mr-2 h-4 w-4" />
                      Dashboard
                    </NavigationMenuLink>
                  </Link>
                </NavigationMenuItem>

                {/* Tools Dropdown */}
                <li className="flex">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        className={cn(
                          "group inline-flex h-9 w-max items-center justify-center rounded-md px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/10 focus:bg-white/10 focus:outline-none disabled:pointer-events-none disabled:opacity-50",
                          pathname.includes("/dashboard/tools") && "bg-white/10"
                        )}
                      >
                        <Wrench className="mr-2 h-4 w-4" />
                        Tools
                        <ChevronDown className="ml-1 h-3 w-3" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="min-w-[600px] glass-card" align="start">
                      <ToolsMenu />
                    </DropdownMenuContent>
                  </DropdownMenu>
                </li>

                {/* Other Navigation Items */}
                {mainNavigation.slice(1).map((item) => (
                  <NavigationMenuItem key={item.name}>
                    <Link href={item.href} legacyBehavior passHref>
                      <NavigationMenuLink
                        className={cn(
                          "group inline-flex h-9 w-max items-center justify-center rounded-md px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/10 focus:bg-white/10 focus:outline-none disabled:pointer-events-none disabled:opacity-50",
                          pathname === item.href && "bg-white/10"
                        )}
                      >
                        <item.icon className="mr-2 h-4 w-4" />
                        {item.name}
                      </NavigationMenuLink>
                    </Link>
                  </NavigationMenuItem>
                ))}

                {/* Admin Navigation */}
                {isAdmin && (
                  <>
                    {adminNavigation.map((item) => (
                      <NavigationMenuItem key={item.name}>
                        <Link href={item.href} legacyBehavior passHref>
                          <NavigationMenuLink
                            className={cn(
                              "group inline-flex h-9 w-max items-center justify-center rounded-md px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/10 focus:bg-white/10 focus:outline-none disabled:pointer-events-none disabled:opacity-50",
                              pathname === item.href && "bg-white/10"
                            )}
                          >
                            <item.icon className="mr-2 h-4 w-4" />
                            {item.name}
                          </NavigationMenuLink>
                        </Link>
                      </NavigationMenuItem>
                    ))}
                  </>
                )}
              </NavigationMenuList>
            </div>

            {/* Right Side Controls */}
            <div className="flex items-center gap-2">
              {/* Theme Toggle */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="hidden md:flex rounded-lg hover:bg-white/10 text-white"
              >
                {theme === "dark" ? (
                  <Sun className="h-5 w-5" />
                ) : (
                  <Moon className="h-5 w-5" />
                )}
              </Button>

              {/* Profile Dropdown - Desktop */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="hidden md:flex items-center space-x-2 rounded-lg hover:bg-white/10 text-white"
                  >
                    <div className="h-8 w-8 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center">
                      <User className="h-4 w-4 text-white" />
                    </div>
                    <span className="hidden sm:inline-block text-white">
                      {user?.name || user?.email?.split('@')[0] || 'User'}
                    </span>
                    <ChevronDown className="h-4 w-4 text-white" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56 glass-card" align="end">
                  <DropdownMenuLabel>
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">
                        {user?.name || 'User'}
                      </p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {user?.email}
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

              {/* Mobile Menu Button */}
              <Button
                variant="ghost"
                size="icon"
                aria-label="Main Menu"
                className="lg:hidden"
                onClick={() => {
                  if (open) {
                    setOpen(false);
                    setSubmenu(null);
                  } else {
                    setOpen(true);
                  }
                }}
              >
                {!open && <Menu className="size-4" />}
                {open && <X className="size-4" />}
              </Button>
            </div>
          </div>

          {/* Mobile Menu */}
          {open && (
            <div className="border-border bg-background container fixed inset-0 top-[72px] flex h-[calc(100vh-72px)] w-full flex-col overflow-auto border-t lg:hidden">
              {submenu && (
                <div className="mt-3">
                  <Button
                    variant="link"
                    onClick={() => setSubmenu(null)}
                    className="relative -left-4"
                  >
                    <ArrowLeft className="size-4 text-xs" />
                    Go back
                  </Button>
                </div>
              )}

              {submenu === null && (
                <div>
                  {/* Main Navigation */}
                  {mainNavigation.map((item) => (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className={cn(
                        "border-border flex w-full items-center border-b py-6 text-left",
                        pathname === item.href && "bg-accent"
                      )}
                    >
                      <item.icon className="mr-3 h-5 w-5" />
                      <span className="flex-1 text-sm font-medium">
                        {item.name}
                      </span>
                    </Link>
                  ))}

                  {/* Tools Button */}
                  <button
                    type="button"
                    className="border-border flex w-full items-center border-b py-6 text-left"
                    onClick={() => setSubmenu("tools")}
                  >
                    <span className="flex-1 text-sm font-medium">
                      Tools
                    </span>
                    <span className="shrink-0">
                      <ArrowRight className="size-4" />
                    </span>
                  </button>

                  {/* Admin Navigation */}
                  {isAdmin && adminNavigation.map((item) => (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className={cn(
                        "border-border flex w-full items-center border-b py-6 text-left",
                        pathname === item.href && "bg-accent"
                      )}
                    >
                      <item.icon className="mr-3 h-5 w-5" />
                      <span className="flex-1 text-sm font-medium">
                        {item.name}
                      </span>
                    </Link>
                  ))}
                </div>
              )}

              {submenu === "tools" && (
                <div>
                  <h2 className="pb-6 pt-4 text-lg font-medium">
                    Tools
                  </h2>
                  <ToolsMenu />
                </div>
              )}

              {/* Mobile menu footer */}
              <div className="mt-auto flex flex-col items-center gap-4 py-12">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                  className="rounded-lg"
                >
                  {theme === "dark" ? (
                    <Sun className="h-5 w-5" />
                  ) : (
                    <Moon className="h-5 w-5" />
                  )}
                </Button>
                <div className="text-center">
                  <p className="text-sm font-medium">
                    {user?.name || user?.email}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {user?.role || "Customer"}
                  </p>
                </div>
                <Button
                  variant="outline"
                  onClick={handleSignOut}
                  className="w-full max-w-xs"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign out
                </Button>
              </div>
            </div>
          )}
        </NavigationMenu>
      </div>
    </section>
  );
};
