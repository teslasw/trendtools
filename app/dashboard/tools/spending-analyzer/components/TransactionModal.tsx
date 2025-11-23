"use client";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { format } from "date-fns";
import { MapPin, DollarSign } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import type { Transaction } from "./TransactionTable";

interface TransactionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transactions: Transaction[];
  location?: string;
}

export function TransactionModal({ open, onOpenChange, transactions, location }: TransactionModalProps) {
  const total = transactions.reduce((sum, t) => sum + Math.abs(t.amount), 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            {location || "Location Transactions"}
          </DialogTitle>
          <DialogDescription>
            {transactions.length} transaction{transactions.length !== 1 ? "s" : ""} • Total: {formatCurrency(total)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {transactions.map((txn) => (
            <div
              key={txn.id}
              className="flex items-start justify-between p-4 rounded-lg border bg-card hover:bg-accent/5 transition-colors"
            >
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-sm">
                    {txn.businessName || txn.merchant || txn.description}
                  </p>
                  {txn.merchantType && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                      {txn.merchantType}
                    </span>
                  )}
                </div>

                {txn.rawMerchant && txn.businessName && (
                  <p className="text-xs text-muted-foreground">{txn.rawMerchant}</p>
                )}

                {txn.merchantDescription && (
                  <p className="text-xs text-muted-foreground italic">{txn.merchantDescription}</p>
                )}

                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span>{format(txn.date, "MMM d, yyyy")}</span>
                  {txn.category && (
                    <span className="flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full bg-primary" />
                      {txn.category}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex flex-col items-end gap-1">
                <p className={`font-semibold text-sm ${txn.amount < 0 ? "text-red-600" : "text-green-600"}`}>
                  {formatCurrency(Math.abs(txn.amount))}
                </p>
                {txn.status && (
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      txn.status === "KEEP"
                        ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300"
                        : txn.status === "CANCEL"
                        ? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300"
                        : "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300"
                    }`}
                  >
                    {txn.status}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
