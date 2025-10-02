"use client";

import { Footer } from "@/components/ui/footer";
import { DashboardNav } from "@/components/ui/dashboard-nav";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {

  return (
    <div className="h-screen gradient-bg relative overflow-hidden">
      {/* Single header with all navigation */}
      <div className="fixed top-0 left-0 right-0 z-40 header-shadow">
        <header className="w-full header-bg backdrop-blur-md">
          <DashboardNav />
        </header>
      </div>

      {/* Main content */}
      <main className="overflow-auto h-full pt-[80px]">
        <div className="max-w-7xl mx-auto px-14 py-6">
          {children}
        </div>
        <Footer />
      </main>
    </div>
  );
}