"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { FloatingLabelInput } from "@/components/ui/floating-label-input";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calculator, Plus, Trash2, Copy, ChevronRight, AlertCircle, DollarSign, Home, Briefcase, GitCompareArrows, Gift, Sparkles, Download, Save, User } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import Link from "next/link";
import { useDebounce } from "@/hooks/use-debounce";

interface Scenario {
  id: string;
  name: string;
  dateOfBirth: string;
  partnerDOB?: string;
  relationshipStatus: "single" | "couple";
  isHomeowner: boolean;
  residencyYears: number;
  assets: Asset[];
  incomes: Income[];
  calculations?: Calculation[];
}

interface Asset {
  id?: string;
  category: string;
  owner: "self" | "partner" | "joint";
  description?: string;
  amount: number;
  isExempt: boolean;
}

interface Income {
  id?: string;
  category: string;
  owner: "self" | "partner" | "joint";
  description?: string;
  amount: number;
  frequency: "annual" | "fortnightly" | "weekly";
}

interface Calculation {
  pensionAmount: number;
  bindingTest: string;
  incomeTestResult: number;
  assetsTestResult: number;
  breakdown: any;
}

interface CalculationResult {
  eligible: boolean;
  eligibilityReason?: string;
  pensionAmount: number;
  bindingTest: string;
  incomeTestResult: number;
  assetsTestResult: number;
  totalAssets: number;
  assessableAssets: number;
  totalIncome: number;
  assessableIncome: number;
  deemedIncome: number;
  breakdown: any;
}

export default function AgePensionPage() {
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [activeScenario, setActiveScenario] = useState<Scenario | null>(null);
  const [calculationResult, setCalculationResult] = useState<CalculationResult | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("personal");
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Form state for new scenario
  const [formData, setFormData] = useState({
    name: "My Scenario",
    dateOfBirth: "",
    partnerDOB: "",
    relationshipStatus: "single" as "single" | "couple",
    isHomeowner: true,
    residencyYears: 10,
  });

  const [assets, setAssets] = useState<Asset[]>([]);
  const [incomes, setIncomes] = useState<Income[]>([]);

  // Debounced values for autosave
  const debouncedFormData = useDebounce(formData, 1000);
  const debouncedAssets = useDebounce(assets, 1000);
  const debouncedIncomes = useDebounce(incomes, 1000);

  // Asset categories
  const assetCategories = [
    { value: "cash", label: "Cash & Bank Accounts" },
    { value: "term_deposit", label: "Term Deposits" },
    { value: "shares", label: "Shares" },
    { value: "managed_funds", label: "Managed Funds" },
    { value: "crypto", label: "Cryptocurrency" },
    { value: "super_accumulation", label: "Super (Accumulation)" },
    { value: "super_pension", label: "Super (Pension)" },
    { value: "vehicle", label: "Vehicles" },
    { value: "contents", label: "Home Contents" },
    { value: "investment_property", label: "Investment Property" },
    { value: "business", label: "Business Assets" },
    { value: "other", label: "Other Assets" },
  ];

  // Income categories
  const incomeCategories = [
    { value: "employment", label: "Employment" },
    { value: "self_employment", label: "Self Employment" },
    { value: "rental", label: "Rental Income" },
    { value: "overseas_pension", label: "Overseas Pension" },
    { value: "distribution", label: "Distributions" },
    { value: "other", label: "Other Income" },
  ];

  // Load scenarios on mount
  useEffect(() => {
    loadScenarios();
  }, []);

  // Autosave effect
  useEffect(() => {
    if (autoSaveEnabled && activeScenario) {
      const autoSave = async () => {
        setIsSaving(true);
        await saveScenario();
        setLastSaved(new Date());
        setIsSaving(false);
      };
      autoSave();
    }
  }, [debouncedFormData, debouncedAssets, debouncedIncomes]);

  const loadScenarios = async () => {
    try {
      const response = await fetch("/api/tools/age-pension/scenarios");
      if (response.ok) {
        const data = await response.json();
        setScenarios(data.scenarios);
        if (data.scenarios.length > 0 && !activeScenario) {
          loadScenario(data.scenarios[0].id);
        }
      }
    } catch (error) {
      console.error("Error loading scenarios:", error);
    }
  };

  const loadScenario = async (scenarioId: string) => {
    try {
      const response = await fetch(`/api/tools/age-pension/scenarios/${scenarioId}`);
      if (response.ok) {
        const data = await response.json();
        setActiveScenario(data.scenario);
        setFormData({
          name: data.scenario.name,
          dateOfBirth: format(new Date(data.scenario.dateOfBirth), "yyyy-MM-dd"),
          partnerDOB: data.scenario.partnerDOB ? format(new Date(data.scenario.partnerDOB), "yyyy-MM-dd") : "",
          relationshipStatus: data.scenario.relationshipStatus,
          isHomeowner: data.scenario.isHomeowner,
          residencyYears: data.scenario.residencyYears,
        });
        setAssets(data.scenario.assets || []);
        setIncomes(data.scenario.incomes || []);
        if (data.scenario.calculations && data.scenario.calculations.length > 0) {
          const latestCalc = data.scenario.calculations[0];
          setCalculationResult({
            eligible: true,
            pensionAmount: latestCalc.pensionAmount,
            bindingTest: latestCalc.bindingTest,
            incomeTestResult: latestCalc.incomeTestResult,
            assetsTestResult: latestCalc.assetsTestResult,
            totalAssets: latestCalc.totalAssets || 0,
            assessableAssets: latestCalc.assessableAssets || 0,
            totalIncome: latestCalc.totalIncome || 0,
            assessableIncome: latestCalc.assessableIncome || 0,
            deemedIncome: 0,
            breakdown: latestCalc.breakdown,
          });
        }
      }
    } catch (error) {
      console.error("Error loading scenario:", error);
    }
  };

  const saveScenario = async () => {
    setIsSaving(true);
    try {
      if (activeScenario) {
        // Update existing scenario
        const response = await fetch(`/api/tools/age-pension/scenarios/${activeScenario.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });

        if (response.ok) {
          // Save assets
          for (const asset of assets) {
            if (asset.id) {
              // Update existing asset
              await fetch(`/api/tools/age-pension/scenarios/${activeScenario.id}/assets/${asset.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(asset),
              });
            } else {
              // Create new asset
              await fetch(`/api/tools/age-pension/scenarios/${activeScenario.id}/assets`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(asset),
              });
            }
          }

          // Save incomes
          for (const income of incomes) {
            if (income.id) {
              // Update existing income
              await fetch(`/api/tools/age-pension/scenarios/${activeScenario.id}/incomes/${income.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(income),
              });
            } else {
              // Create new income
              await fetch(`/api/tools/age-pension/scenarios/${activeScenario.id}/incomes`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(income),
              });
            }
          }

          loadScenarios();
        }
      } else {
        // Create new scenario
        const response = await fetch("/api/tools/age-pension/scenarios", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });

        if (response.ok) {
          const data = await response.json();
          setActiveScenario(data.scenario);
          
          // Save assets and incomes for new scenario
          for (const asset of assets) {
            await fetch(`/api/tools/age-pension/scenarios/${data.scenario.id}/assets`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(asset),
            });
          }

          for (const income of incomes) {
            await fetch(`/api/tools/age-pension/scenarios/${data.scenario.id}/incomes`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(income),
            });
          }

          loadScenarios();
        }
      }
    } catch (error) {
      console.error("Error saving scenario:", error);
    }
    setIsSaving(false);
  };

  const calculatePension = async () => {
    if (!activeScenario) {
      await saveScenario();
      return;
    }

    setIsCalculating(true);
    try {
      const response = await fetch(`/api/tools/age-pension/scenarios/${activeScenario.id}/calculate`, {
        method: "POST",
      });

      if (response.ok) {
        const data = await response.json();
        setCalculationResult(data.result);
      }
    } catch (error) {
      console.error("Error calculating pension:", error);
    }
    setIsCalculating(false);
  };

  const applyWhatIfStrategy = async (strategy: string) => {
    // First save current scenario if not saved
    if (!activeScenario) {
      await saveScenario();
      return;
    }

    let newName = `${activeScenario.name} - `;
    let newAssets = [...assets];
    let newIncomes = [...incomes];
    
    switch (strategy) {
      case "gift10k":
        newName += "Gift $10k";
        // Reduce cash assets by $10k
        const cashIndex = newAssets.findIndex(a => a.category === "cash");
        if (cashIndex >= 0) {
          newAssets[cashIndex].amount = Math.max(0, newAssets[cashIndex].amount - 10000);
        }
        break;
        
      case "homeImprovement20k":
        newName += "Home Improvement $20k";
        // Move $20k from assessable to exempt (home)
        const assessableIndex = newAssets.findIndex(a => !a.isExempt && a.amount >= 20000);
        if (assessableIndex >= 0) {
          newAssets[assessableIndex].amount -= 20000;
          // Add to home value (exempt)
          newAssets.push({
            category: "other",
            owner: "self",
            description: "Home improvements",
            amount: 20000,
            isExempt: true,
          });
        }
        break;
        
      case "partnerSuper":
        newName += "Partner Super Contribution";
        // Move $10k to partner's super if couple
        if (formData.relationshipStatus === "couple") {
          const selfAssetIndex = newAssets.findIndex(a => a.owner === "self" && !a.isExempt && a.amount >= 10000);
          if (selfAssetIndex >= 0) {
            newAssets[selfAssetIndex].amount -= 10000;
            // Add to partner's super
            const partnerSuperIndex = newAssets.findIndex(a => a.owner === "partner" && a.category === "super_accumulation");
            if (partnerSuperIndex >= 0) {
              newAssets[partnerSuperIndex].amount += 10000;
            } else {
              newAssets.push({
                category: "super_accumulation",
                owner: "partner",
                description: "Partner super contribution",
                amount: 10000,
                isExempt: false,
              });
            }
          }
        }
        break;
        
      case "downsize":
        newName += "Downsize Home";
        // Add $300k to assessable assets from home sale
        newAssets.push({
          category: "cash",
          owner: formData.relationshipStatus === "couple" ? "joint" : "self",
          description: "Home downsizer proceeds",
          amount: 300000,
          isExempt: false,
        });
        // Change homeowner status
        setFormData({ ...formData, isHomeowner: false });
        break;
    }

    // Create new scenario with modified values
    try {
      const response = await fetch("/api/tools/age-pension/scenarios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          name: newName,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        
        // Save modified assets and incomes
        for (const asset of newAssets) {
          await fetch(`/api/tools/age-pension/scenarios/${data.scenario.id}/assets`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...asset, id: undefined }),
          });
        }

        for (const income of newIncomes) {
          await fetch(`/api/tools/age-pension/scenarios/${data.scenario.id}/incomes`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...income, id: undefined }),
          });
        }

        // Load the new scenario
        loadScenarios();
        loadScenario(data.scenario.id);
      }
    } catch (error) {
      console.error("Error applying what-if strategy:", error);
    }
  };

  const duplicateScenario = async () => {
    if (!activeScenario) return;

    const newName = `${activeScenario.name} (Copy)`;
    try {
      const response = await fetch("/api/tools/age-pension/scenarios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          name: newName,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        
        // Copy assets and incomes
        for (const asset of assets) {
          await fetch(`/api/tools/age-pension/scenarios/${data.scenario.id}/assets`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...asset, id: undefined }),
          });
        }

        for (const income of incomes) {
          await fetch(`/api/tools/age-pension/scenarios/${data.scenario.id}/incomes`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...income, id: undefined }),
          });
        }

        loadScenarios();
        loadScenario(data.scenario.id);
      }
    } catch (error) {
      console.error("Error duplicating scenario:", error);
    }
  };

  const addAsset = () => {
    setAssets([...assets, {
      category: "cash",
      owner: "self",
      description: "",
      amount: 0,
      isExempt: false,
    }]);
  };

  const removeAsset = (index: number) => {
    setAssets(assets.filter((_, i) => i !== index));
  };

  const updateAsset = (index: number, field: string, value: any) => {
    const updated = [...assets];
    updated[index] = { ...updated[index], [field]: value };
    setAssets(updated);
  };

  const addIncome = () => {
    setIncomes([...incomes, {
      category: "employment",
      owner: "self",
      description: "",
      amount: 0,
      frequency: "annual",
    }]);
  };

  const removeIncome = (index: number) => {
    setIncomes(incomes.filter((_, i) => i !== index));
  };

  const updateIncome = (index: number, field: string, value: any) => {
    const updated = [...incomes];
    updated[index] = { ...updated[index], [field]: value };
    setIncomes(updated);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-AU", {
      style: "currency",
      currency: "AUD",
      minimumFractionDigits: 2,
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center pt-6">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-md bg-amber-500/10">
            <Calculator className="h-7 w-7 text-amber-500" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight font-manrope">Age Pension Calculator</h1>
            <p className="text-muted-foreground mt-1">
              Calculate your Age Pension entitlement and compare scenarios
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href="/dashboard/tools/age-pension/compare">
            <Button variant="outline">
              <GitCompareArrows className="w-4 h-4 mr-2" />
              Compare Scenarios
            </Button>
          </Link>
          <Button onClick={duplicateScenario} variant="outline" disabled={!activeScenario}>
            <Copy className="w-4 h-4 mr-2" />
            Duplicate
          </Button>
          <Button onClick={saveScenario} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save Scenario"}
          </Button>
        </div>
      </div>

      {/* Compact Scenario Selector */}
      {scenarios.length > 0 && (
        <div className="mb-6 flex items-center gap-3">
          <Select
            value={activeScenario?.id || ""}
            onValueChange={(value) => loadScenario(value)}
          >
            <SelectTrigger className="flex-1 h-12 glass-card border-2">
              <SelectValue placeholder="Select a scenario">
                {activeScenario && (
                  <div className="flex items-center justify-between w-full pr-2">
                    <div>
                      <div className="font-semibold text-[#2285c5]">{activeScenario.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {activeScenario.relationshipStatus === "couple" ? "Couple" : "Single"} •
                        {activeScenario.isHomeowner ? " Homeowner" : " Non-homeowner"}
                      </div>
                    </div>
                    {activeScenario.calculations?.[0] && (
                      <div className="justify-end">
                        <div className="font-bold text-[#2285c5]">
                          {formatCurrency(activeScenario.calculations[0].pensionAmount)}
                        </div>
                        <div className="text-xs text-muted-foreground">p/f</div>
                      </div>
                    )}
                  </div>
                )}
              </SelectValue>
            </SelectTrigger>
            <SelectContent
              className="w-[var(--radix-select-trigger-width)] max-h-[400px] animate-in fade-in-0 zoom-in-95 slide-in-from-top-2 duration-200 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=closed]:slide-out-to-top-2"
              align="start"
              sideOffset={8}
            >
              {scenarios.map((scenario) => {
                const calculation = scenario.calculations?.[0];
                return (
                  <SelectItem key={scenario.id} value={scenario.id} className="h-auto py-3">
                    <div className="relative w-full pr-32">
                      <div className="font-semibold mb-1">{scenario.name}</div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {scenario.relationshipStatus === "couple" ? "Couple" : "Single"}
                        </span>
                        <span className="flex items-center gap-1">
                          <Home className="w-3 h-3" />
                          {scenario.isHomeowner ? "Owner" : "Renter"}
                        </span>
                        {calculation && (
                          <>
                            <span className="flex items-center gap-1">
                              <DollarSign className="w-3 h-3" />
                              {formatCurrency(calculation.totalAssets)}
                            </span>
                          </>
                        )}
                      </div>
                      {calculation && (
                        <div className="absolute right-0 top-1/2 -translate-y-1/2 text-right">
                          <div className="font-bold text-[#2285c5]">
                            {formatCurrency(calculation.pensionAmount)}
                          </div>
                          <div className="text-xs text-muted-foreground">per fortnight</div>
                        </div>
                      )}
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setActiveScenario(null);
                setFormData({
                  name: "",
                  dateOfBirth: "",
                  relationshipStatus: "single",
                  partnerDOB: "",
                  isHomeowner: true,
                  residencyYears: 10,
                  assets: [],
                  incomes: [],
                });
                setAssets([]);
                setIncomes([]);
              }}
              className="h-12 glass-card"
            >
              <Plus className="w-4 h-4 mr-2" />
              New
            </Button>

            {activeScenario && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => duplicateScenario(activeScenario.id)}
                  className="h-12 glass-card"
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Duplicate
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => deleteScenario(activeScenario.id)}
                  className="h-12 glass-card hover:bg-destructive/10 hover:text-destructive hover:border-destructive"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </Button>
              </>
            )}
          </div>
        </div>
      )}

      {/* What-If Strategy Chips */}
      {activeScenario && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5" />
              Quick What-If Strategies
            </CardTitle>
            <CardDescription>
              Apply common strategies to test their impact on your pension
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => applyWhatIfStrategy("gift10k")}
                className="hover:bg-primary/10"
              >
                <Gift className="w-4 h-4 mr-2" />
                Gift $10,000
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => applyWhatIfStrategy("homeImprovement20k")}
                className="hover:bg-primary/10"
              >
                <Home className="w-4 h-4 mr-2" />
                Home Improvement $20k
              </Button>
              {formData.relationshipStatus === "couple" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => applyWhatIfStrategy("partnerSuper")}
                  className="hover:bg-primary/10"
                >
                  <Briefcase className="w-4 h-4 mr-2" />
                  Partner Super $10k
                </Button>
              )}
              {formData.isHomeowner && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => applyWhatIfStrategy("downsize")}
                  className="hover:bg-primary/10"
                >
                  <Home className="w-4 h-4 mr-2" />
                  Downsize Home
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="personal">Personal Details</TabsTrigger>
              <TabsTrigger value="assets">Assets</TabsTrigger>
              <TabsTrigger value="income">Income</TabsTrigger>
            </TabsList>

            <TabsContent value="personal">
              <Card>
                <CardHeader>
                  <CardTitle>Personal Information</CardTitle>
                  <CardDescription>
                    Enter your personal details to check eligibility
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <FloatingLabelInput
                        label="Scenario Name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="dob">Date of Birth</Label>
                      <Input
                        id="dob"
                        type="date"
                        value={formData.dateOfBirth}
                        onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label>Relationship Status</Label>
                    <RadioGroup
                      value={formData.relationshipStatus}
                      onValueChange={(value) => setFormData({ ...formData, relationshipStatus: value as "single" | "couple" })}
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="single" id="single" />
                        <Label htmlFor="single">Single</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="couple" id="couple" />
                        <Label htmlFor="couple">Couple</Label>
                      </div>
                    </RadioGroup>
                  </div>

                  {formData.relationshipStatus === "couple" && (
                    <div>
                      <FloatingLabelInput
                        label="Partner's Date of Birth"
                        type="date"
                        value={formData.partnerDOB}
                        onChange={(e) => setFormData({ ...formData, partnerDOB: e.target.value })}
                      />
                    </div>
                  )}

                  <div className="space-y-3">
                    <Label>Homeownership Status</Label>
                    <RadioGroup
                      value={formData.isHomeowner ? "homeowner" : "non-homeowner"}
                      onValueChange={(value) => setFormData({ ...formData, isHomeowner: value === "homeowner" })}
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="homeowner" id="homeowner" />
                        <Label htmlFor="homeowner">Homeowner</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="non-homeowner" id="non-homeowner" />
                        <Label htmlFor="non-homeowner">Non-homeowner (renting or other)</Label>
                      </div>
                    </RadioGroup>
                  </div>

                  <div>
                    <FloatingLabelInput
                      label="Years of Australian Residency"
                      type="number"
                      value={formData.residencyYears}
                      onChange={(e) => setFormData({ ...formData, residencyYears: parseInt(e.target.value) || 0 })}
                      min="0"
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="assets">
              <Card>
                <CardHeader>
                  <CardTitle>Assets</CardTitle>
                  <CardDescription>
                    Enter your assessable and exempt assets
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {assets.map((asset, index) => (
                    <div key={index} className="p-4 border rounded-lg space-y-4">
                      <div className="flex justify-between items-start">
                        <div className="grid grid-cols-2 gap-4 flex-1">
                          <div>
                            <Label>Category</Label>
                            <Select
                              value={asset.category}
                              onValueChange={(value) => updateAsset(index, "category", value)}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {assetCategories.map(cat => (
                                  <SelectItem key={cat.value} value={cat.value}>
                                    {cat.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          {formData.relationshipStatus === "couple" && (
                            <div>
                              <Label>Owner</Label>
                              <Select
                                value={asset.owner}
                                onValueChange={(value) => updateAsset(index, "owner", value)}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="self">Self</SelectItem>
                                  <SelectItem value="partner">Partner</SelectItem>
                                  <SelectItem value="joint">Joint</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeAsset(index)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <FloatingLabelInput
                            label="Description (optional)"
                            value={asset.description || ""}
                            onChange={(e) => updateAsset(index, "description", e.target.value)}
                          />
                        </div>
                        <div>
                          <FloatingLabelInput
                            label="Amount"
                            type="number"
                            value={asset.amount}
                            onChange={(e) => updateAsset(index, "amount", parseFloat(e.target.value) || 0)}
                          />
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id={`exempt-${index}`}
                          checked={asset.isExempt}
                          onChange={(e) => updateAsset(index, "isExempt", e.target.checked)}
                          className="rounded border-gray-300"
                        />
                        <Label htmlFor={`exempt-${index}`}>
                          Exempt asset (e.g., principal home)
                        </Label>
                      </div>
                    </div>
                  ))}
                  <Button onClick={addAsset} variant="outline" className="w-full">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Asset
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="income">
              <Card>
                <CardHeader>
                  <CardTitle>Income</CardTitle>
                  <CardDescription>
                    Enter your income sources (employment income receives Work Bonus)
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {incomes.map((income, index) => (
                    <div key={index} className="p-4 border rounded-lg space-y-4">
                      <div className="flex justify-between items-start">
                        <div className="grid grid-cols-2 gap-4 flex-1">
                          <div>
                            <Label>Category</Label>
                            <Select
                              value={income.category}
                              onValueChange={(value) => updateIncome(index, "category", value)}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {incomeCategories.map(cat => (
                                  <SelectItem key={cat.value} value={cat.value}>
                                    {cat.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          {formData.relationshipStatus === "couple" && (
                            <div>
                              <Label>Owner</Label>
                              <Select
                                value={income.owner}
                                onValueChange={(value) => updateIncome(index, "owner", value)}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="self">Self</SelectItem>
                                  <SelectItem value="partner">Partner</SelectItem>
                                  <SelectItem value="joint">Joint</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeIncome(index)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <FloatingLabelInput
                            label="Description (optional)"
                            value={income.description || ""}
                            onChange={(e) => updateIncome(index, "description", e.target.value)}
                          />
                        </div>
                        <div>
                          <FloatingLabelInput
                            label="Amount"
                            type="number"
                            value={income.amount}
                            onChange={(e) => updateIncome(index, "amount", parseFloat(e.target.value) || 0)}
                          />
                        </div>
                        <div>
                          <Label>Frequency</Label>
                          <Select
                            value={income.frequency}
                            onValueChange={(value) => updateIncome(index, "frequency", value)}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="annual">Annual</SelectItem>
                              <SelectItem value="fortnightly">Fortnightly</SelectItem>
                              <SelectItem value="weekly">Weekly</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  ))}
                  <Button onClick={addIncome} variant="outline" className="w-full">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Income
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        <div className="space-y-6">
          {/* Autosave indicator */}
          {autoSaveEnabled && lastSaved && (
            <div className="text-sm text-muted-foreground flex items-center justify-end gap-2">
              <Save className="w-3 h-3" />
              Autosaved {format(lastSaved, "h:mm a")}
            </div>
          )}
          
          <Card>
            <CardHeader>
              <CardTitle>Calculate Pension</CardTitle>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={calculatePension} 
                className="w-full" 
                size="lg"
                disabled={isCalculating}
              >
                {isCalculating ? (
                  "Calculating..."
                ) : (
                  <>
                    <Calculator className="w-4 h-4 mr-2" />
                    Calculate Entitlement
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {calculationResult && (
            <Card>
              <CardHeader>
                <CardTitle>Calculation Results</CardTitle>
                {activeScenario && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      window.open(`/api/tools/age-pension/scenarios/${activeScenario.id}/export`, '_blank');
                    }}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Export PDF
                  </Button>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                {!calculationResult.eligible ? (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Not Eligible:</strong> {calculationResult.eligibilityReason}
                    </AlertDescription>
                  </Alert>
                ) : (
                  <>
                    <div className="text-center p-6 bg-primary/5 rounded-lg">
                      <div className="text-sm text-muted-foreground">Fortnightly Payment</div>
                      <div className="text-3xl font-bold text-primary mt-2">
                        {formatCurrency(calculationResult.pensionAmount)}
                      </div>
                      <Badge className="mt-2" variant={calculationResult.bindingTest === "income" ? "secondary" : "default"}>
                        {calculationResult.bindingTest === "income" ? "Income Test" : 
                         calculationResult.bindingTest === "assets" ? "Assets Test" : "Both Tests Zero"}
                      </Badge>
                    </div>

                    <Separator />

                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Income Test Result</span>
                        <span className="font-semibold">{formatCurrency(calculationResult.incomeTestResult)} p/f</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Assets Test Result</span>
                        <span className="font-semibold">{formatCurrency(calculationResult.assetsTestResult)} p/f</span>
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Total Assets</span>
                        <span>{formatCurrency(calculationResult.totalAssets)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Assessable Assets</span>
                        <span>{formatCurrency(calculationResult.assessableAssets)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Total Income</span>
                        <span>{formatCurrency(calculationResult.totalIncome)} p/f</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Assessable Income</span>
                        <span>{formatCurrency(calculationResult.assessableIncome)} p/f</span>
                      </div>
                      {calculationResult.deemedIncome > 0 && (
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Deemed Income</span>
                          <span>{formatCurrency(calculationResult.deemedIncome)} p/f</span>
                        </div>
                      )}
                    </div>

                    {calculationResult.breakdown && (
                      <details className="cursor-pointer">
                        <summary className="text-sm font-semibold text-primary">
                          View Detailed Breakdown
                        </summary>
                        <pre className="mt-2 p-3 bg-muted rounded text-xs overflow-auto">
                          {JSON.stringify(calculationResult.breakdown, null, 2)}
                        </pre>
                      </details>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}