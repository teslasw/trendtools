"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin, Loader2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { TransactionModal } from "./TransactionModal";
import type { Transaction } from "./TransactionTable";

// Import Leaflet dynamically to avoid SSR issues
import dynamic from "next/dynamic";

interface SpendingHeatmapProps {
  transactions: Transaction[];
}

// Map component that will be loaded client-side only
const MapView = dynamic(
  () => import("./MapView"),
  {
    ssr: false,
    loading: () => (
      <div className="h-[600px] w-full flex items-center justify-center bg-muted/20">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Loading map...</p>
        </div>
      </div>
    )
  }
);

export function SpendingHeatmap({ transactions }: SpendingHeatmapProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedTransactions, setSelectedTransactions] = useState<Transaction[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<string>("");

  // Debug: log transactions to see what we have
  console.log("SpendingHeatmap - Total transactions:", transactions.length);
  console.log("SpendingHeatmap - Sample transaction:", transactions[0]);
  console.log("SpendingHeatmap - Transactions with lat/lng:", transactions.filter(t => t.latitude && t.longitude).length);

  // Filter transactions with valid coordinates
  const transactionsWithCoords = transactions.filter(
    t => t.latitude && t.longitude && t.amount < 0
  );

  console.log("SpendingHeatmap - Transactions with coords and negative amount:", transactionsWithCoords.length);

  const handleLocationClick = (locationTransactions: Transaction[]) => {
    setSelectedTransactions(locationTransactions);
    setSelectedLocation(locationTransactions[0]?.location || "Unknown Location");
    setModalOpen(true);
  };

  // Calculate statistics
  const totalSpending = transactionsWithCoords.reduce(
    (sum, t) => sum + Math.abs(t.amount),
    0
  );

  const locationCount = new Set(
    transactionsWithCoords.map(t => `${t.latitude},${t.longitude}`)
  ).size;

  // Group by location for statistics
  const locationStats = transactionsWithCoords.reduce((acc, t) => {
    const key = `${t.latitude},${t.longitude}`;
    if (!acc[key]) {
      acc[key] = {
        location: t.location || "Unknown",
        count: 0,
        total: 0,
        latitude: t.latitude!,
        longitude: t.longitude!,
      };
    }
    acc[key].count++;
    acc[key].total += Math.abs(t.amount);
    return acc;
  }, {} as Record<string, { location: string; count: number; total: number; latitude: number; longitude: number }>);

  const topLocations = Object.values(locationStats)
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  if (transactionsWithCoords.length === 0) {
    return (
      <div className="space-y-4">
        <Card className="glass-card border-0">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <MapPin className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Location Data Available</h3>
              <p className="text-sm text-muted-foreground max-w-md">
                Enhance your transactions to extract location information and view spending patterns on a map.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="glass-card border-0">
          <CardHeader className="pb-2">
            <CardDescription>Total Spending (Mapped)</CardDescription>
            <CardTitle className="text-2xl">{formatCurrency(totalSpending)}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="glass-card border-0">
          <CardHeader className="pb-2">
            <CardDescription>Unique Locations</CardDescription>
            <CardTitle className="text-2xl">{locationCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="glass-card border-0">
          <CardHeader className="pb-2">
            <CardDescription>Transactions with Location</CardDescription>
            <CardTitle className="text-2xl">{transactionsWithCoords.length}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Map */}
      <Card className="glass-card border-0">
        <CardHeader>
          <CardTitle>Spending Heatmap</CardTitle>
          <CardDescription>
            Interactive map showing where your money is being spent
          </CardDescription>
        </CardHeader>
        <CardContent>
          <MapView
            transactions={transactionsWithCoords}
            onLocationClick={handleLocationClick}
          />
        </CardContent>
      </Card>

      {/* Transaction Modal */}
      <TransactionModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        transactions={selectedTransactions}
        location={selectedLocation}
      />

      {/* Top Locations */}
      <Card className="glass-card border-0">
        <CardHeader>
          <CardTitle>Top Spending Locations</CardTitle>
          <CardDescription>Your most expensive locations</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {topLocations.map((loc, idx) => (
              <div key={idx} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-bold">
                    {idx + 1}
                  </div>
                  <div>
                    <p className="font-medium">{loc.location}</p>
                    <p className="text-xs text-muted-foreground">
                      {loc.count} transaction{loc.count !== 1 ? "s" : ""}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold">{formatCurrency(loc.total)}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
