"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Download } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

interface Scenario {
  id: string;
  name: string;
  dateOfBirth: string;
  partnerDOB?: string;
  relationshipStatus: "single" | "couple";
  isHomeowner: boolean;
  residencyYears: number;
  assets: any[];
  incomes: any[];
  calculations?: any[];
}

export default function CompareScenarios() {
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [selectedScenarios, setSelectedScenarios] = useState<string[]>([]);
  const [comparisonData, setComparisonData] = useState<any[]>([]);

  useEffect(() => {
    loadScenarios();
  }, []);

  const loadScenarios = async () => {
    try {
      const response = await fetch("/api/tools/age-pension/scenarios");
      if (response.ok) {
        const data = await response.json();
        setScenarios(data.scenarios);
      }
    } catch (error) {
      console.error("Error loading scenarios:", error);
    }
  };

  const toggleScenarioSelection = (scenarioId: string) => {
    if (selectedScenarios.includes(scenarioId)) {
      setSelectedScenarios(selectedScenarios.filter(id => id !== scenarioId));
    } else if (selectedScenarios.length < 4) {
      setSelectedScenarios([...selectedScenarios, scenarioId]);
    }
  };

  const loadComparisonData = async () => {
    const data = [];
    for (const scenarioId of selectedScenarios) {
      const response = await fetch(`/api/tools/age-pension/scenarios/${scenarioId}`);
      if (response.ok) {
        const scenarioData = await response.json();
        data.push(scenarioData.scenario);
      }
    }
    setComparisonData(data);
  };

  useEffect(() => {
    if (selectedScenarios.length >= 2) {
      loadComparisonData();
    }
  }, [selectedScenarios]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-AU", {
      style: "currency",
      currency: "AUD",
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const calculateAge = (dob: string) => {
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const getTotalAssets = (scenario: Scenario) => {
    return scenario.assets.reduce((sum, asset) => sum + asset.amount, 0);
  };

  const getTotalIncome = (scenario: Scenario) => {
    return scenario.incomes.reduce((sum, income) => {
      if (income.frequency === "annual") return sum + income.amount / 26;
      if (income.frequency === "weekly") return sum + income.amount * 2;
      return sum + income.amount;
    }, 0);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center pt-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-manrope">Compare Scenarios</h1>
          <p className="text-muted-foreground mt-1">
            Select up to 4 scenarios to compare side by side
          </p>
        </div>
        <Link href="/dashboard/tools/age-pension">
          <Button variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Calculator
          </Button>
        </Link>
      </div>

      {/* Scenario Selection */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Select Scenarios to Compare</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {scenarios.map(scenario => (
              <button
                key={scenario.id}
                onClick={() => toggleScenarioSelection(scenario.id)}
                disabled={!selectedScenarios.includes(scenario.id) && selectedScenarios.length >= 4}
                className={`p-4 rounded-lg border text-left transition-colors ${
                  selectedScenarios.includes(scenario.id)
                    ? "border-primary bg-primary/10"
                    : "border-border hover:border-primary/50"
                } ${!selectedScenarios.includes(scenario.id) && selectedScenarios.length >= 4 ? "opacity-50" : ""}`}
              >
                <div className="font-semibold">{scenario.name}</div>
                <div className="text-sm text-muted-foreground mt-1">
                  {scenario.relationshipStatus === "couple" ? "Couple" : "Single"} • 
                  {scenario.isHomeowner ? " Homeowner" : " Non-homeowner"}
                </div>
                {scenario.calculations && scenario.calculations[0] && (
                  <div className="text-sm font-semibold text-primary mt-2">
                    {formatCurrency(scenario.calculations[0].pensionAmount)} p/f
                  </div>
                )}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Comparison Table */}
      {comparisonData.length >= 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Scenario Comparison</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3">Attribute</th>
                    {comparisonData.map(scenario => (
                      <th key={scenario.id} className="text-left p-3 min-w-[200px]">
                        {scenario.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {/* Pension Amount */}
                  <tr className="border-b bg-primary/5">
                    <td className="p-3 font-semibold">Pension Amount (p/f)</td>
                    {comparisonData.map(scenario => (
                      <td key={scenario.id} className="p-3">
                        <span className="text-lg font-bold text-primary">
                          {scenario.calculations?.[0] 
                            ? formatCurrency(scenario.calculations[0].pensionAmount)
                            : "Not calculated"}
                        </span>
                      </td>
                    ))}
                  </tr>

                  {/* Binding Test */}
                  <tr className="border-b">
                    <td className="p-3">Binding Test</td>
                    {comparisonData.map(scenario => (
                      <td key={scenario.id} className="p-3">
                        {scenario.calculations?.[0] && (
                          <Badge variant={
                            scenario.calculations[0].bindingTest === "income" ? "secondary" : "default"
                          }>
                            {scenario.calculations[0].bindingTest === "income" ? "Income Test" : 
                             scenario.calculations[0].bindingTest === "assets" ? "Assets Test" : "Both Zero"}
                          </Badge>
                        )}
                      </td>
                    ))}
                  </tr>

                  {/* Personal Details */}
                  <tr className="border-b bg-muted/20">
                    <td className="p-3 font-semibold" colSpan={comparisonData.length + 1}>
                      Personal Details
                    </td>
                  </tr>
                  <tr className="border-b">
                    <td className="p-3">Age</td>
                    {comparisonData.map(scenario => (
                      <td key={scenario.id} className="p-3">
                        {calculateAge(scenario.dateOfBirth)} years
                      </td>
                    ))}
                  </tr>
                  <tr className="border-b">
                    <td className="p-3">Relationship</td>
                    {comparisonData.map(scenario => (
                      <td key={scenario.id} className="p-3">
                        {scenario.relationshipStatus === "couple" ? "Couple" : "Single"}
                      </td>
                    ))}
                  </tr>
                  <tr className="border-b">
                    <td className="p-3">Homeowner</td>
                    {comparisonData.map(scenario => (
                      <td key={scenario.id} className="p-3">
                        {scenario.isHomeowner ? "Yes" : "No"}
                      </td>
                    ))}
                  </tr>

                  {/* Financial Summary */}
                  <tr className="border-b bg-muted/20">
                    <td className="p-3 font-semibold" colSpan={comparisonData.length + 1}>
                      Financial Summary
                    </td>
                  </tr>
                  <tr className="border-b">
                    <td className="p-3">Total Assets</td>
                    {comparisonData.map(scenario => (
                      <td key={scenario.id} className="p-3">
                        {formatCurrency(getTotalAssets(scenario))}
                      </td>
                    ))}
                  </tr>
                  <tr className="border-b">
                    <td className="p-3">Assessable Assets</td>
                    {comparisonData.map(scenario => (
                      <td key={scenario.id} className="p-3">
                        {scenario.calculations?.[0] 
                          ? formatCurrency(scenario.calculations[0].assessableAssets || 0)
                          : "-"}
                      </td>
                    ))}
                  </tr>
                  <tr className="border-b">
                    <td className="p-3">Total Income (p/f)</td>
                    {comparisonData.map(scenario => (
                      <td key={scenario.id} className="p-3">
                        {formatCurrency(getTotalIncome(scenario))}
                      </td>
                    ))}
                  </tr>
                  <tr className="border-b">
                    <td className="p-3">Assessable Income (p/f)</td>
                    {comparisonData.map(scenario => (
                      <td key={scenario.id} className="p-3">
                        {scenario.calculations?.[0] 
                          ? formatCurrency(scenario.calculations[0].assessableIncome || 0)
                          : "-"}
                      </td>
                    ))}
                  </tr>

                  {/* Test Results */}
                  <tr className="border-b bg-muted/20">
                    <td className="p-3 font-semibold" colSpan={comparisonData.length + 1}>
                      Test Results
                    </td>
                  </tr>
                  <tr className="border-b">
                    <td className="p-3">Income Test Result</td>
                    {comparisonData.map(scenario => (
                      <td key={scenario.id} className="p-3">
                        {scenario.calculations?.[0] 
                          ? formatCurrency(scenario.calculations[0].incomeTestResult)
                          : "-"}
                      </td>
                    ))}
                  </tr>
                  <tr className="border-b">
                    <td className="p-3">Assets Test Result</td>
                    {comparisonData.map(scenario => (
                      <td key={scenario.id} className="p-3">
                        {scenario.calculations?.[0] 
                          ? formatCurrency(scenario.calculations[0].assetsTestResult)
                          : "-"}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Differences Highlight */}
            <div className="mt-6 p-4 bg-muted/30 rounded-lg">
              <h4 className="font-semibold mb-2">Key Differences</h4>
              <div className="space-y-2 text-sm">
                {comparisonData.length === 2 && (
                  <>
                    {comparisonData[0].calculations?.[0] && comparisonData[1].calculations?.[0] && (
                      <div>
                        <strong>Pension Difference:</strong> {
                          formatCurrency(Math.abs(
                            comparisonData[0].calculations[0].pensionAmount - 
                            comparisonData[1].calculations[0].pensionAmount
                          ))
                        } p/f
                      </div>
                    )}
                    <div>
                      <strong>Asset Difference:</strong> {
                        formatCurrency(Math.abs(
                          getTotalAssets(comparisonData[0]) - getTotalAssets(comparisonData[1])
                        ))
                      }
                    </div>
                    <div>
                      <strong>Income Difference:</strong> {
                        formatCurrency(Math.abs(
                          getTotalIncome(comparisonData[0]) - getTotalIncome(comparisonData[1])
                        ))
                      } p/f
                    </div>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}