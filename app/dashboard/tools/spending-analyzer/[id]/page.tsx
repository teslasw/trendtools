"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useUser } from "@/lib/hooks/use-user";
import { FileUploadZone } from "../components/FileUploadZone";
import { TransactionTable, type Transaction } from "../components/TransactionTable";
import { SpendingDashboard } from "../components/SpendingDashboard";
import { SpendingHeatmap } from "../components/SpendingHeatmap";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AdvisorContactButton } from "@/components/advisor-contact";
import { BasiqConnect } from "@/components/basiq-connect";
import {
  Brain,
  FileText,
  TrendingUp,
  AlertCircle,
  Download,
  Save,
  Sparkles,
  CheckCircle,
  Clock,
  XCircle,
  ArrowLeft,
  Upload,
  Lock,
  Building2,
  Map,
} from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";

export default function SessionViewPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.id as string;
  const { user } = useUser();
  const advisor = (user as any)?.advisor;

  const [sessionName, setSessionName] = useState("");
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [analysisStatus, setAnalysisStatus] = useState<"idle" | "processing" | "completed" | "error">("idle");
  const [insights, setInsights] = useState<any[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [isEnhancing, setIsEnhancing] = useState(false);

  // Load session data on mount
  useEffect(() => {
    if (sessionId) {
      loadSession();
    }
  }, [sessionId]);

  const loadSession = async () => {
    try {
      setIsProcessing(true);

      // Mark session as viewed
      await fetch(`/api/spending-analyzer/sessions/${sessionId}/view`, {
        method: "POST",
      });

      // Fetch transactions for this session
      const response = await fetch(`/api/spending-analyzer/transactions?analysisId=${sessionId}`);

      if (response.ok) {
        const transactionData = await response.json();

        // Convert and format transactions
        const formattedTransactions = transactionData.map((txn: any) => ({
          id: txn.id,
          date: new Date(txn.date),
          description: txn.description,
          merchant: txn.merchant,
          amount: parseFloat(txn.amount),
          category: txn.category?.name,
          status: txn.status,
          notes: txn.notes,
          isRecurring: false,
          aiConfidence: txn.aiConfidence,
          businessName: txn.originalData?.businessName,
          merchantType: txn.originalData?.merchantType,
          location: txn.originalData?.location,
          merchantDescription: txn.originalData?.merchantDescription,
          rawMerchant: txn.originalData?.rawMerchant,
          latitude: txn.originalData?.latitude,
          longitude: txn.originalData?.longitude,
        }));

        setTransactions(formattedTransactions);
        setAnalysisStatus("completed");

        // Fetch session details to get the name
        const sessionsResponse = await fetch("/api/spending-analyzer/sessions");
        if (sessionsResponse.ok) {
          const sessions = await sessionsResponse.json();
          const session = sessions.find((s: any) => s.id === sessionId);
          if (session) {
            setSessionName(session.name);
          }
        }

        // Generate insights for loaded session
        if (formattedTransactions.length > 0) {
          const totalSpent = formattedTransactions
            .filter((t: Transaction) => t.amount < 0)
            .reduce((sum: number, t: Transaction) => sum + Math.abs(t.amount), 0);

          const totalReceived = formattedTransactions
            .filter((t: Transaction) => t.amount > 0)
            .reduce((sum: number, t: Transaction) => sum + t.amount, 0);

          setInsights([
            {
              type: "summary",
              title: "Review Loaded",
              description: `${formattedTransactions.length} transactions loaded`,
              value: formattedTransactions.length,
            },
            {
              type: "spending",
              title: "Total Spent",
              description: `Money going out`,
              value: totalSpent,
            },
            {
              type: "income",
              title: "Total Received",
              description: `Money coming in`,
              value: totalReceived,
            },
          ]);
        }
      }
    } catch (error) {
      console.error("Error loading session:", error);
      setAnalysisStatus("error");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFilesUploaded = async (files: File[]) => {
    setUploadedFiles(prev => [...prev, ...files]);
    setIsProcessing(true);
    setAnalysisStatus("processing");

    try {
      // Create FormData for file upload
      const formData = new FormData();
      files.forEach(file => formData.append("files", file));
      formData.append("analysisName", sessionName || `Session ${sessionId}`);

      // Upload and process files
      const uploadResponse = await fetch("/api/spending-analyzer/upload", {
        method: "POST",
        body: formData,
      });

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(errorData.error || `Failed to upload files: ${uploadResponse.status}`);
      }

      // Reload the session to get new transactions
      await loadSession();

    } catch (error) {
      console.error("Error processing files:", error);
      setAnalysisStatus("error");
      setIsProcessing(false);
    }
  };

  const handleUpdateTransaction = (id: string, updates: Partial<Transaction>) => {
    setTransactions(prev =>
      prev.map(t => t.id === id ? { ...t, ...updates } : t)
    );
  };

  const handleBulkUpdate = (ids: string[], status: "KEEP" | "CANCEL" | "CONSIDER") => {
    setTransactions(prev =>
      prev.map(t => ids.includes(t.id) ? { ...t, status } : t)
    );
  };

  const handleSave = async () => {
    try {
      setIsProcessing(true);

      // Save transaction updates
      const savePromises = transactions.map(async (txn) => {
        return fetch("/api/spending-analyzer/transactions", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            transactionId: txn.id,
            updates: {
              status: txn.status,
              notes: txn.notes,
              categoryId: txn.category,
            },
          }),
        });
      });

      await Promise.all(savePromises);

      // Save session metadata
      const response = await fetch("/api/spending-analyzer/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          analysisId: sessionId,
          analysisName: sessionName,
        }),
      });

      if (response.ok) {
        console.log("Session saved successfully");
      }
    } catch (error) {
      console.error("Error saving session:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExport = () => {
    console.log("Exporting analysis...");
  };

  const handleBackToHome = () => {
    router.push("/dashboard/tools/spending-analyzer");
  };

  const handleReEnhance = async () => {
    try {
      setIsEnhancing(true);

      const response = await fetch("/api/spending-analyzer/transactions/enhance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ analysisId: sessionId }),
      });

      if (response.ok) {
        const result = await response.json();
        console.log("Re-enhancement result:", result);

        // Reload transactions to get updated data
        await loadSession();

        alert(`Successfully enhanced ${result.enhanced} of ${result.total} transactions!`);
      } else {
        const error = await response.json();
        alert(`Failed to enhance: ${error.error || "Unknown error"}`);
      }
    } catch (error) {
      console.error("Error re-enhancing:", error);
      alert("Failed to enhance transactions");
    } finally {
      setIsEnhancing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start pt-6">
        <div className="flex items-start gap-4">
          <Button variant="ghost" onClick={handleBackToHome} className="mt-1">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{sessionName || "Loading..."}</h1>
            <p className="text-muted-foreground mt-2">
              Analyze your spending patterns with AI-powered insights
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleSave} disabled={isProcessing}>
            <Save className="mr-2 h-4 w-4" />
            {isProcessing ? "Saving..." : "Save"}
          </Button>
          <Button variant="outline" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Status Badge */}
      <div className="flex items-center gap-4">
        <Badge
          variant={
            analysisStatus === "completed" ? "default" :
            analysisStatus === "processing" ? "secondary" :
            analysisStatus === "error" ? "destructive" :
            "outline"
          }
          className="px-3 py-1"
        >
          {analysisStatus === "completed" && <CheckCircle className="mr-1 h-3 w-3" />}
          {analysisStatus === "processing" && <Clock className="mr-1 h-3 w-3" />}
          {analysisStatus === "error" && <XCircle className="mr-1 h-3 w-3" />}
          {analysisStatus.charAt(0).toUpperCase() + analysisStatus.slice(1)}
        </Badge>
        {transactions.length > 0 && (
          <span className="text-sm text-muted-foreground">
            {transactions.length} transactions analyzed
          </span>
        )}
      </div>

      {/* Insights Alert */}
      {insights.length > 0 && (
        <Alert className="bg-primary/5 border-primary/20">
          <Sparkles className="h-4 w-4 text-primary" />
          <AlertDescription className="text-sm">
            <strong className="font-semibold">AI Insights Available:</strong>{" "}
            {insights[0].description}
          </AlertDescription>
        </Alert>
      )}

      {/* Advisor Help Card */}
      {transactions.length > 0 && advisor && (
        <Card className="relative overflow-hidden border-2 border-sky-200 shadow-2xl bg-gradient-to-br from-sky-50 to-blue-50 dark:from-sky-950/20 dark:to-blue-950/20">
          <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-sky-100/30 to-blue-100/40 dark:via-sky-900/10 dark:to-blue-900/10" />

          <CardContent className="relative p-8">
            <div className="flex items-center gap-8">
              <div className="relative flex items-center">
                <div className="flex flex-col items-center space-y-2 pr-8">
                  {advisor.profileImageUrl ? (
                    <img
                      src={advisor.profileImageUrl}
                      alt={`${advisor.firstName} ${advisor.lastName}`}
                      className="w-24 h-24 rounded-full border-4 border-white shadow-lg object-cover"
                    />
                  ) : (
                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-sky-500 to-blue-500 flex items-center justify-center text-white text-3xl font-bold shadow-lg">
                      {advisor.firstName[0]}{advisor.lastName[0]}
                    </div>
                  )}
                  <div className="text-center">
                    <p className="text-xs text-gray-600 dark:text-gray-400">Your Advisor</p>
                    <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                      {advisor.firstName} {advisor.lastName}
                    </p>
                    {advisor.title && (
                      <p className="text-xs text-gray-600 dark:text-gray-400">{advisor.title}</p>
                    )}
                  </div>
                </div>
                <div className="absolute -top-8 -bottom-8 right-0 border-l border-gray-200 dark:border-gray-700" />
              </div>

              <div className="flex-1 max-w-2xl space-y-3">
                <h3 className="cta-title-lg">Questions about your spending patterns?</h3>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  {advisor.firstName} can help you take control of your spending and create a personalized budget that aligns with your goals.
                </p>
              </div>

              <div className="flex flex-col items-center justify-center gap-2 px-4 min-w-[200px]">
                <AdvisorContactButton
                  context={`Spending Analyzer - Session ${sessionId}`}
                  variant="default"
                  size="lg"
                  className="w-full"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="upload" className="space-y-4">
        <TabsList className="grid grid-cols-4 w-full max-w-[800px]">
          <TabsTrigger value="upload">
            <FileText className="mr-2 h-4 w-4" />
            Upload
          </TabsTrigger>
          <TabsTrigger value="transactions" disabled={transactions.length === 0}>
            <Brain className="mr-2 h-4 w-4" />
            Transactions
          </TabsTrigger>
          <TabsTrigger value="insights" disabled={insights.length === 0}>
            <TrendingUp className="mr-2 h-4 w-4" />
            Insights
          </TabsTrigger>
          <TabsTrigger value="heatmap" disabled={transactions.length === 0}>
            <Map className="mr-2 h-4 w-4" />
            Heatmap
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            {/* Connect Bank Card */}
            <Card className="glass-card border-0">
              <div className={cn(!advisor ? "opacity-75" : "")}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    Connect Your Bank
                    {!advisor && (
                      <Badge className="bg-gradient-to-r from-sky-500 to-blue-500 text-white border-0 text-xs px-2 py-0.5">
                        Clients Only
                      </Badge>
                    )}
                  </CardTitle>
                  <CardDescription>
                    {advisor
                      ? "Securely connect to your bank for automatic transaction import"
                      : "Available for advisory clients only"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {advisor ? (
                    <BasiqConnect
                      onSuccess={(userId, connectionId) => {
                        console.log("Bank connected:", { userId, connectionId });
                        loadSession();
                      }}
                      onError={(error) => console.error("Bank connection error:", error)}
                      className="w-full"
                    />
                  ) : (
                    <Button className="w-full" size="lg" disabled variant="outline">
                      <Lock className="mr-2 h-4 w-4" />
                      Clients Only Feature
                    </Button>
                  )}
                </CardContent>
              </div>
            </Card>

            {/* Manual Upload Card */}
            <Card className="glass-card border-0">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5" />
                  Manual Upload
                </CardTitle>
                <CardDescription>
                  Upload bank statements manually (CSV, PDF, OFX)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <FileUploadZone
                  onFilesUploaded={handleFilesUploaded}
                  isProcessing={isProcessing}
                  compact
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="transactions" className="space-y-4">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-2xl font-bold tracking-tight mb-2">Review Transactions</h2>
              <p className="text-muted-foreground">
                Mark transactions as Keep, Cancel, or Consider for further review
              </p>
            </div>
            <Button
              variant="outline"
              onClick={handleReEnhance}
              disabled={isEnhancing || transactions.length === 0}
              className="flex items-center gap-2"
            >
              <Sparkles className={cn("h-4 w-4", isEnhancing && "animate-spin")} />
              {isEnhancing ? "Enhancing..." : "Re-enhance Merchants"}
            </Button>
          </div>
          <Card className="glass-card border-0 shadow-xl overflow-hidden">
            <TransactionTable
              transactions={transactions}
              onUpdateTransaction={handleUpdateTransaction}
              onBulkUpdate={handleBulkUpdate}
            />
          </Card>
        </TabsContent>

        <TabsContent value="insights" className="space-y-4">
          <SpendingDashboard
            transactions={transactions}
            insights={insights}
          />
        </TabsContent>

        <TabsContent value="heatmap" className="space-y-4">
          <SpendingHeatmap transactions={transactions} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
