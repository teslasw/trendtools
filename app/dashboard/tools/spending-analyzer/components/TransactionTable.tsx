"use client";

import { useState } from "react";
import { format } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Check,
  X,
  HelpCircle,
  TrendingDown,
  TrendingUp,
  Calendar,
  DollarSign,
  ShoppingBag,
  Repeat,
  StickyNote,
  MapPin,
} from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";

export interface Transaction {
  id: string;
  date: Date;
  description: string;
  merchant?: string;
  amount: number;
  category?: string;
  status?: "KEEP" | "CANCEL" | "CONSIDER";
  notes?: string;
  isRecurring?: boolean;
  aiConfidence?: number;
  businessName?: string;
  merchantType?: string;
  location?: string;
  merchantDescription?: string;
  rawMerchant?: string;
  latitude?: number;
  longitude?: number;
}

interface TransactionTableProps {
  transactions: Transaction[];
  onUpdateTransaction: (id: string, updates: Partial<Transaction>) => void;
  onBulkUpdate?: (ids: string[], status: "KEEP" | "CANCEL" | "CONSIDER") => void;
}

export function TransactionTable({
  transactions,
  onUpdateTransaction,
  onBulkUpdate,
}: TransactionTableProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [editingNotes, setEditingNotes] = useState<string | null>(null);
  const [tempNote, setTempNote] = useState("");

  const handleStatusChange = (id: string, status: "KEEP" | "CANCEL" | "CONSIDER") => {
    onUpdateTransaction(id, { status });
  };

  const handleNotesSave = (id: string) => {
    onUpdateTransaction(id, { notes: tempNote });
    setEditingNotes(null);
    setTempNote("");
  };

  const handleBulkAction = (status: "KEEP" | "CANCEL" | "CONSIDER") => {
    if (onBulkUpdate && selectedIds.length > 0) {
      onBulkUpdate(selectedIds, status);
      setSelectedIds([]);
    }
  };

  const toggleSelection = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id)
        ? prev.filter(i => i !== id)
        : [...prev, id]
    );
  };

  const getCategoryIcon = (category?: string) => {
    switch (category?.toLowerCase()) {
      case 'shopping':
        return <ShoppingBag className="h-4 w-4" />;
      case 'recurring':
      case 'subscription':
        return <Repeat className="h-4 w-4" />;
      default:
        return <DollarSign className="h-4 w-4" />;
    }
  };

  const getCategoryColor = (category?: string) => {
    switch (category?.toLowerCase()) {
      case 'food': return 'bg-blue-500';
      case 'transport': return 'bg-green-500';
      case 'entertainment': return 'bg-yellow-500';
      case 'shopping': return 'bg-purple-500';
      case 'subscription': return 'bg-orange-500';
      case 'utilities': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <>
      {selectedIds.length > 0 && (
        <div className="flex items-center justify-between p-4 bg-muted/50 border-b">
          <span className="text-sm font-medium">
            {selectedIds.length} transactions selected
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleBulkAction("KEEP")}
              className="text-green-600"
            >
              <Check className="h-4 w-4 mr-1" />
              Keep All
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleBulkAction("CANCEL")}
              className="text-red-600"
            >
              <X className="h-4 w-4 mr-1" />
              Cancel All
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleBulkAction("CONSIDER")}
              className="text-yellow-600"
            >
              <HelpCircle className="h-4 w-4 mr-1" />
              Consider All
            </Button>
          </div>
        </div>
      )}

      <Table>
          <TableHeader className="bg-white dark:bg-gray-900">
            <TableRow>
              <TableHead className="w-12">
                <input
                  type="checkbox"
                  checked={selectedIds.length === transactions.length}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedIds(transactions.map(t => t.id));
                    } else {
                      setSelectedIds([]);
                    }
                  }}
                  className="rounded border-gray-300"
                />
              </TableHead>
              <TableHead className="font-bold">Date</TableHead>
              <TableHead className="font-bold">Description</TableHead>
              <TableHead className="font-bold">Category</TableHead>
              <TableHead className="font-bold text-right">Amount</TableHead>
              <TableHead className="font-bold text-right">Action</TableHead>
              <TableHead className="font-bold text-right">Notes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.map((transaction) => (
              <TableRow
                key={transaction.id}
                className={cn(
                  selectedIds.includes(transaction.id) && "bg-white dark:bg-gray-900"
                )}
              >
                <TableCell>
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(transaction.id)}
                    onChange={() => toggleSelection(transaction.id)}
                    className="rounded border-gray-300"
                  />
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">
                      {format(transaction.date, "MMM d, yyyy")}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="space-y-1">
                    {/* Line 1: Business Name + Merchant Type Badge (or merchant if not enhanced) */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium">
                        {transaction.businessName || transaction.merchant || transaction.description}
                      </p>
                      {transaction.merchantType && (
                        <Badge variant="outline" className="text-xs h-5 px-1.5 bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800">
                          {transaction.merchantType}
                        </Badge>
                      )}
                      {transaction.isRecurring && (
                        <Badge variant="secondary" className="text-xs">
                          <Repeat className="h-3 w-3 mr-1" />
                          Recurring
                        </Badge>
                      )}
                    </div>

                    {/* Line 2: Location */}
                    {transaction.location && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        <span>{transaction.location}</span>
                      </div>
                    )}

                    {/* Line 3: Raw Merchant Text from Statement (only show if enhanced) */}
                    {transaction.businessName && (transaction.rawMerchant || transaction.merchant) && (
                      <p className="text-xs text-muted-foreground">
                        {transaction.rawMerchant || transaction.merchant}
                      </p>
                    )}

                    {/* Line 4: Merchant Description */}
                    {transaction.merchantDescription && (
                      <p className="text-xs text-muted-foreground italic">{transaction.merchantDescription}</p>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  {transaction.category && (
                    <div className="flex items-center gap-2">
                      <div className={cn(
                        "h-2 w-2 rounded-full",
                        getCategoryColor(transaction.category)
                      )} />
                      <span className="text-sm">{transaction.category}</span>
                      {transaction.aiConfidence && (
                        <span className="text-xs text-muted-foreground">
                          ({Math.round(transaction.aiConfidence * 100)}%)
                        </span>
                      )}
                    </div>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <span className={cn(
                    "font-medium",
                    transaction.amount < 0 ? "text-red-600" : "text-green-600"
                  )}>
                    {formatCurrency(Math.abs(transaction.amount))}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  {transaction.amount < 0 ? (
                    <RadioGroup
                      value={transaction.status || ""}
                      onValueChange={(value) => handleStatusChange(
                        transaction.id,
                        value as "KEEP" | "CANCEL" | "CONSIDER"
                      )}
                      className="flex justify-end gap-2"
                    >
                    <div className={cn(
                      "flex items-center space-x-1 px-3 py-1.5 rounded-full transition-colors",
                      transaction.status === "KEEP" ? "bg-green-100 dark:bg-green-900/30" : "hover:bg-gray-100 dark:hover:bg-gray-800"
                    )}>
                      <RadioGroupItem
                        value="KEEP"
                        id={`keep-${transaction.id}`}
                        className={cn(
                          "border-2",
                          transaction.status === "KEEP" ? "border-green-600 bg-green-600" : "border-gray-300"
                        )}
                      />
                      <Label
                        htmlFor={`keep-${transaction.id}`}
                        className="cursor-pointer flex items-center"
                      >
                        <Check className={cn(
                          "h-4 w-4",
                          transaction.status === "KEEP" ? "text-green-600" : "text-gray-400"
                        )} />
                      </Label>
                    </div>
                    <div className={cn(
                      "flex items-center space-x-1 px-3 py-1.5 rounded-full transition-colors",
                      transaction.status === "CANCEL" ? "bg-red-100 dark:bg-red-900/30" : "hover:bg-gray-100 dark:hover:bg-gray-800"
                    )}>
                      <RadioGroupItem
                        value="CANCEL"
                        id={`cancel-${transaction.id}`}
                        className={cn(
                          "border-2",
                          transaction.status === "CANCEL" ? "border-red-600 bg-red-600" : "border-gray-300"
                        )}
                      />
                      <Label
                        htmlFor={`cancel-${transaction.id}`}
                        className="cursor-pointer flex items-center"
                      >
                        <X className={cn(
                          "h-4 w-4",
                          transaction.status === "CANCEL" ? "text-red-600" : "text-gray-400"
                        )} />
                      </Label>
                    </div>
                    <div className={cn(
                      "flex items-center space-x-1 px-3 py-1.5 rounded-full transition-colors",
                      transaction.status === "CONSIDER" ? "bg-yellow-100 dark:bg-yellow-900/30" : "hover:bg-gray-100 dark:hover:bg-gray-800"
                    )}>
                      <RadioGroupItem
                        value="CONSIDER"
                        id={`consider-${transaction.id}`}
                        className={cn(
                          "border-2",
                          transaction.status === "CONSIDER" ? "border-yellow-600 bg-yellow-600" : "border-gray-300"
                        )}
                      />
                      <Label
                        htmlFor={`consider-${transaction.id}`}
                        className="cursor-pointer flex items-center"
                      >
                        <HelpCircle className={cn(
                          "h-4 w-4",
                          transaction.status === "CONSIDER" ? "text-yellow-600" : "text-gray-400"
                        )} />
                      </Label>
                    </div>
                  </RadioGroup>
                  ) : (
                    <Badge variant="outline" className="text-green-600 border-green-200">
                      <TrendingUp className="h-3 w-3 mr-1" />
                      Income
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  {editingNotes === transaction.id ? (
                    <div className="flex items-center justify-end gap-2">
                      <Input
                        value={tempNote}
                        onChange={(e) => setTempNote(e.target.value)}
                        className="h-8 text-sm"
                        placeholder="Add note..."
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            handleNotesSave(transaction.id);
                          }
                        }}
                      />
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleNotesSave(transaction.id)}
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        setEditingNotes(transaction.id);
                        setTempNote(transaction.notes || "");
                      }}
                      className="flex items-center justify-end gap-1 text-sm text-muted-foreground hover:text-foreground ml-auto"
                    >
                      <StickyNote className="h-4 w-4" />
                      {transaction.notes || "Add note"}
                    </button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
    </>
  );
}