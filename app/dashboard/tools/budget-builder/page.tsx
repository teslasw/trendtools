"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Save,
  Plus,
  Trash2,
  ChevronDown,
  ChevronRight,
  DollarSign,
  Home,
  Car,
  ShoppingCart,
  User,
  Sparkles,
  Baby,
  PiggyBank,
  TrendingUp,
  TrendingDown,
  Download,
  Copy,
} from "lucide-react";
import { INCOME_CATEGORIES, EXPENSE_CATEGORIES, FREQUENCY_LABELS, FREQUENCY_TO_MONTHLY } from "@/lib/budget-categories";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface BudgetItem {
  id?: string;
  type: "income" | "expense";
  category: string;
  name: string;
  amount: number;
  frequency: string;
  notes?: string;
  isCustom: boolean;
  sortOrder: number;
}

interface Budget {
  id: string;
  name: string;
  description?: string;
  period: string;
  isActive?: boolean;
  items: BudgetItem[];
}

const ICON_MAP: Record<string, any> = {
  DollarSign,
  Home,
  Car,
  ShoppingCart,
  User,
  Sparkles,
  Baby,
  PiggyBank,
};

export default function BudgetBuilderPage() {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [activeBudget, setActiveBudget] = useState<Budget | null>(null);
  const [budgetItems, setBudgetItems] = useState<BudgetItem[]>([]);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [isSaving, setIsSaving] = useState(false);
  const [displayPeriod, setDisplayPeriod] = useState("monthly");
  const [newBudgetName, setNewBudgetName] = useState("");
  const [showNewBudgetDialog, setShowNewBudgetDialog] = useState(false);

  useEffect(() => {
    loadBudgets();
  }, []);

  const loadBudgets = async () => {
    try {
      const response = await fetch("/api/tools/budget");
      if (response.ok) {
        const data = await response.json();
        setBudgets(data.budgets);
        if (data.budgets.length > 0 && !activeBudget) {
          const active = data.budgets.find((b: Budget) => b.isActive) || data.budgets[0];
          loadBudget(active.id);
        }
      }
    } catch (error) {
      console.error("Error loading budgets:", error);
    }
  };

  const loadBudget = async (budgetId: string) => {
    try {
      const response = await fetch(`/api/tools/budget/${budgetId}`);
      if (response.ok) {
        const data = await response.json();
        setActiveBudget(data.budget);
        setBudgetItems(data.budget.items || []);
        // Expand all categories by default
        const allCategories = [...INCOME_CATEGORIES, ...EXPENSE_CATEGORIES].map(c => c.id);
        setExpandedCategories(new Set(allCategories));
      }
    } catch (error) {
      console.error("Error loading budget:", error);
    }
  };

  const createNewBudget = async () => {
    if (!newBudgetName.trim()) return;

    try {
      const response = await fetch("/api/tools/budget", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newBudgetName,
          period: "monthly",
          isActive: true,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        // Initialize with default items from categories
        await initializeDefaultItems(data.budget.id);
        setNewBudgetName("");
        setShowNewBudgetDialog(false);
        loadBudgets();
        loadBudget(data.budget.id);
      }
    } catch (error) {
      console.error("Error creating budget:", error);
    }
  };

  const initializeDefaultItems = async (budgetId: string) => {
    const allCategories = [...INCOME_CATEGORIES, ...EXPENSE_CATEGORIES];
    let sortOrder = 0;

    for (const category of allCategories) {
      for (const item of category.items) {
        await fetch(`/api/tools/budget/${budgetId}/items`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: category.id === "income" ? "income" : "expense",
            category: category.id,
            name: item.name,
            amount: 0,
            frequency: "monthly",
            isCustom: false,
            sortOrder: sortOrder++,
          }),
        });
      }
    }
  };

  const updateItem = async (itemId: string, updates: Partial<BudgetItem>) => {
    if (!activeBudget) return;

    setBudgetItems(items =>
      items.map(item => item.id === itemId ? { ...item, ...updates } : item)
    );

    try {
      await fetch(`/api/tools/budget/${activeBudget.id}/items/${itemId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
    } catch (error) {
      console.error("Error updating item:", error);
    }
  };

  const addCustomItem = async (categoryId: string, type: "income" | "expense") => {
    if (!activeBudget) return;

    try {
      const response = await fetch(`/api/tools/budget/${activeBudget.id}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          category: categoryId,
          name: "Custom item",
          amount: 0,
          frequency: "monthly",
          isCustom: true,
          sortOrder: budgetItems.length,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setBudgetItems([...budgetItems, data.item]);
      }
    } catch (error) {
      console.error("Error adding custom item:", error);
    }
  };

  const deleteItem = async (itemId: string) => {
    if (!activeBudget) return;

    setBudgetItems(items => items.filter(item => item.id !== itemId));

    try {
      await fetch(`/api/tools/budget/${activeBudget.id}/items/${itemId}`, {
        method: "DELETE",
      });
    } catch (error) {
      console.error("Error deleting item:", error);
    }
  };

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId);
      } else {
        newSet.add(categoryId);
      }
      return newSet;
    });
  };

  const convertToDisplayPeriod = (amount: number, frequency: string) => {
    const monthlyAmount = amount * FREQUENCY_TO_MONTHLY[frequency];
    const displayMultiplier = FREQUENCY_TO_MONTHLY[displayPeriod];
    return monthlyAmount / displayMultiplier;
  };

  const calculateCategoryTotal = (categoryId: string, type: "income" | "expense") => {
    return budgetItems
      .filter(item => item.category === categoryId && item.type === type)
      .reduce((sum, item) => sum + convertToDisplayPeriod(item.amount, item.frequency), 0);
  };

  const calculateTotal = (type: "income" | "expense") => {
    return budgetItems
      .filter(item => item.type === type)
      .reduce((sum, item) => sum + convertToDisplayPeriod(item.amount, item.frequency), 0);
  };

  const totalIncome = calculateTotal("income");
  const totalExpense = calculateTotal("expense");
  const balance = totalIncome - totalExpense;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-AU", {
      style: "currency",
      currency: "AUD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center pt-6">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-md bg-purple-500/10">
            <PiggyBank className="h-7 w-7 text-purple-500" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight font-manrope">Budget Builder</h1>
            <p className="text-muted-foreground mt-1">
              Create and manage your personal budget
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Dialog open={showNewBudgetDialog} onOpenChange={setShowNewBudgetDialog}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Plus className="w-4 h-4 mr-2" />
                New Budget
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Budget</DialogTitle>
                <DialogDescription>
                  Give your budget a name to get started
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <Label htmlFor="budget-name">Budget Name</Label>
                  <Input
                    id="budget-name"
                    value={newBudgetName}
                    onChange={(e) => setNewBudgetName(e.target.value)}
                    placeholder="e.g., Monthly Budget 2025"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowNewBudgetDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={createNewBudget}>Create Budget</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Budget Selector and Display Period */}
      <div className="flex gap-4 items-center">
        {budgets.length > 0 && (
          <div className="flex-1">
            <Label>Active Budget</Label>
            <Select
              value={activeBudget?.id}
              onValueChange={(value) => loadBudget(value)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {budgets.map(budget => (
                  <SelectItem key={budget.id} value={budget.id}>
                    {budget.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        <div>
          <Label>Display Period</Label>
          <Select value={displayPeriod} onValueChange={setDisplayPeriod}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="fortnightly">Fortnightly</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
              <SelectItem value="annually">Annually</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {!activeBudget ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">No budget found. Create your first budget to get started!</p>
            <Button onClick={() => setShowNewBudgetDialog(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create Budget
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-12 gap-6">
          {/* Main Budget Grid - 9 columns */}
          <div className="col-span-12 lg:col-span-9">
            <Tabs defaultValue="income" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="income">Income</TabsTrigger>
                <TabsTrigger value="expenses">Expenses</TabsTrigger>
              </TabsList>

              <TabsContent value="income" className="space-y-4 mt-6">
                {INCOME_CATEGORIES.map(category => {
                  const Icon = ICON_MAP[category.icon] || DollarSign;
                  const categoryItems = budgetItems.filter(
                    item => item.category === category.id && item.type === "income"
                  );
                  const categoryTotal = calculateCategoryTotal(category.id, "income");

                  return (
                    <Card key={category.id}>
                      <CardHeader
                        className="cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => toggleCategory(category.id)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {expandedCategories.has(category.id) ? (
                              <ChevronDown className="w-5 h-5" />
                            ) : (
                              <ChevronRight className="w-5 h-5" />
                            )}
                            <Icon className="w-5 h-5 text-emerald-600" />
                            <CardTitle>{category.name}</CardTitle>
                          </div>
                          <div className="text-lg font-semibold text-emerald-600">
                            {formatCurrency(categoryTotal)}
                          </div>
                        </div>
                      </CardHeader>
                      {expandedCategories.has(category.id) && (
                        <CardContent className="space-y-2">
                          {categoryItems.map(item => (
                            <div key={item.id} className="grid grid-cols-12 gap-4 items-center p-2 rounded hover:bg-muted/30">
                              <div className="col-span-4">
                                {item.isCustom ? (
                                  <Input
                                    value={item.name}
                                    onChange={(e) => updateItem(item.id!, { name: e.target.value })}
                                    className="h-9"
                                  />
                                ) : (
                                  <span className="text-sm">{item.name}</span>
                                )}
                              </div>
                              <div className="col-span-3">
                                <Input
                                  type="number"
                                  value={item.amount}
                                  onChange={(e) => updateItem(item.id!, { amount: parseFloat(e.target.value) || 0 })}
                                  className="h-9"
                                  placeholder="0.00"
                                />
                              </div>
                              <div className="col-span-3">
                                <Select
                                  value={item.frequency}
                                  onValueChange={(value) => updateItem(item.id!, { frequency: value })}
                                >
                                  <SelectTrigger className="h-9">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="weekly">Weekly</SelectItem>
                                    <SelectItem value="fortnightly">Fortnightly</SelectItem>
                                    <SelectItem value="monthly">Monthly</SelectItem>
                                    <SelectItem value="quarterly">Quarterly</SelectItem>
                                    <SelectItem value="annually">Annually</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="col-span-2 flex justify-end">
                                {item.isCustom && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => deleteItem(item.id!)}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                )}
                              </div>
                            </div>
                          ))}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => addCustomItem(category.id, "income")}
                            className="w-full mt-2"
                          >
                            <Plus className="w-4 h-4 mr-2" />
                            Add Custom Item
                          </Button>
                        </CardContent>
                      )}
                    </Card>
                  );
                })}
              </TabsContent>

              <TabsContent value="expenses" className="space-y-4 mt-6">
                {EXPENSE_CATEGORIES.map(category => {
                  const Icon = ICON_MAP[category.icon] || DollarSign;
                  const categoryItems = budgetItems.filter(
                    item => item.category === category.id && item.type === "expense"
                  );
                  const categoryTotal = calculateCategoryTotal(category.id, "expense");

                  return (
                    <Card key={category.id}>
                      <CardHeader
                        className="cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => toggleCategory(category.id)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {expandedCategories.has(category.id) ? (
                              <ChevronDown className="w-5 h-5" />
                            ) : (
                              <ChevronRight className="w-5 h-5" />
                            )}
                            <Icon className="w-5 h-5 text-orange-600" />
                            <CardTitle>{category.name}</CardTitle>
                          </div>
                          <div className="text-lg font-semibold text-orange-600">
                            {formatCurrency(categoryTotal)}
                          </div>
                        </div>
                      </CardHeader>
                      {expandedCategories.has(category.id) && (
                        <CardContent className="space-y-2">
                          {categoryItems.map(item => (
                            <div key={item.id} className="grid grid-cols-12 gap-4 items-center p-2 rounded hover:bg-muted/30">
                              <div className="col-span-4">
                                {item.isCustom ? (
                                  <Input
                                    value={item.name}
                                    onChange={(e) => updateItem(item.id!, { name: e.target.value })}
                                    className="h-9"
                                  />
                                ) : (
                                  <span className="text-sm">{item.name}</span>
                                )}
                              </div>
                              <div className="col-span-3">
                                <Input
                                  type="number"
                                  value={item.amount}
                                  onChange={(e) => updateItem(item.id!, { amount: parseFloat(e.target.value) || 0 })}
                                  className="h-9"
                                  placeholder="0.00"
                                />
                              </div>
                              <div className="col-span-3">
                                <Select
                                  value={item.frequency}
                                  onValueChange={(value) => updateItem(item.id!, { frequency: value })}
                                >
                                  <SelectTrigger className="h-9">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="weekly">Weekly</SelectItem>
                                    <SelectItem value="fortnightly">Fortnightly</SelectItem>
                                    <SelectItem value="monthly">Monthly</SelectItem>
                                    <SelectItem value="quarterly">Quarterly</SelectItem>
                                    <SelectItem value="annually">Annually</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="col-span-2 flex justify-end">
                                {item.isCustom && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => deleteItem(item.id!)}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                )}
                              </div>
                            </div>
                          ))}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => addCustomItem(category.id, "expense")}
                            className="w-full mt-2"
                          >
                            <Plus className="w-4 h-4 mr-2" />
                            Add Custom Item
                          </Button>
                        </CardContent>
                      )}
                    </Card>
                  );
                })}
              </TabsContent>
            </Tabs>
          </div>

          {/* Summary Panel - 3 columns */}
          <div className="col-span-12 lg:col-span-3">
            <div className="sticky top-6 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between text-sm text-muted-foreground mb-1">
                      <span className="flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-emerald-600" />
                        Income
                      </span>
                      <span className="text-xs">{FREQUENCY_LABELS[displayPeriod]}</span>
                    </div>
                    <div className="text-2xl font-bold text-emerald-600">
                      {formatCurrency(totalIncome)}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-sm text-muted-foreground mb-1">
                      <span className="flex items-center gap-2">
                        <TrendingDown className="w-4 h-4 text-orange-600" />
                        Expenses
                      </span>
                      <span className="text-xs">{FREQUENCY_LABELS[displayPeriod]}</span>
                    </div>
                    <div className="text-2xl font-bold text-orange-600">
                      {formatCurrency(totalExpense)}
                    </div>
                  </div>

                  <div className="pt-4 border-t">
                    <div className="flex items-center justify-between text-sm text-muted-foreground mb-1">
                      <span>Balance</span>
                      <span className="text-xs">{FREQUENCY_LABELS[displayPeriod]}</span>
                    </div>
                    <div className={cn(
                      "text-2xl font-bold",
                      balance >= 0 ? "text-emerald-600" : "text-red-600"
                    )}>
                      {formatCurrency(balance)}
                    </div>
                    {balance < 0 && (
                      <p className="text-xs text-red-600 mt-2">
                        Your expenses exceed your income
                      </p>
                    )}
                  </div>

                  {balance >= 0 && (
                    <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
                      <p className="text-xs text-emerald-700 dark:text-emerald-400">
                        <strong>{((balance / totalIncome) * 100).toFixed(0)}%</strong> of your income is available for savings or investments
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button variant="outline" className="w-full" size="sm">
                    <Download className="w-4 h-4 mr-2" />
                    Export PDF
                  </Button>
                  <Button variant="outline" className="w-full" size="sm">
                    <Copy className="w-4 h-4 mr-2" />
                    Duplicate Budget
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}