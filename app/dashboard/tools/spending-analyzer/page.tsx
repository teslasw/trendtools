"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { FileUploadZone } from "./components/FileUploadZone";
import { TransactionTable, type Transaction } from "./components/TransactionTable";
import { SpendingDashboard } from "./components/SpendingDashboard";
import { SessionsDashboard } from "./components/SessionsDashboard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ClientOnlyBadge } from "@/components/ui/client-badge";
import { AdvisorContactButton } from "@/components/advisor-contact";
import { BasiqConnect } from "@/components/basiq-connect";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
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
  History,
  Trash2,
  Building2,
  Plus,
  Upload,
  Lock,
  Star,
  Users,
  TrendingDown,
  DollarSign,
  MessageSquare,
  ArrowLeft,
} from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";

interface SavedSession {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  transactionCount: number;
  totalAmount: number;
  status: string;
}

export default function SpendingAnalyzerPage() {
  const { data: session } = useSession();
  const advisor = (session?.user as any)?.advisor;
  const [sessionName, setSessionName] = useState("");
  const [isSessionStarted, setIsSessionStarted] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [analysisStatus, setAnalysisStatus] = useState<"idle" | "processing" | "completed" | "error">("idle");
  const [insights, setInsights] = useState<any[]>([]);
  const [savedSessions, setSavedSessions] = useState<SavedSession[]>([]);
  const [showSavedSessions, setShowSavedSessions] = useState(false);
  const [currentAnalysisId, setCurrentAnalysisId] = useState<string | null>(null);
  const [showNewAnalysisDialog, setShowNewAnalysisDialog] = useState(false);
  const [connectingBank, setConnectingBank] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<string | null>(null);

  // Check if user is a client (not in Free Users group)
  const userGroups = (session?.user as any)?.groups || [];
  const isClient = !userGroups.includes("Free Users") && userGroups.length > 0;
  const isPremiumClient = userGroups.includes("Premium Advisory Clients");

  // Fetch saved sessions on mount
  useEffect(() => {
    fetchSavedSessions();
  }, []);

  const fetchSavedSessions = async () => {
    try {
      const response = await fetch("/api/spending-analyzer/sessions");
      if (response.ok) {
        const sessions = await response.json();
        setSavedSessions(sessions);
      }
    } catch (error) {
      console.error("Error fetching saved sessions:", error);
    }
  };

  const loadSession = async (sessionId: string) => {
    try {
      setIsProcessing(true);
      setIsSessionStarted(true);
      setShowSavedSessions(false);

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
          merchantType: txn.originalData?.merchantType,
          merchantDescription: txn.originalData?.merchantDescription,
        }));

        setTransactions(formattedTransactions);
        setCurrentAnalysisId(sessionId);
        setAnalysisStatus("completed");

        // Set the session name
        const session = savedSessions.find(s => s.id === sessionId);
        if (session) {
          setSessionName(session.name);
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

  const deleteSession = async (sessionId: string) => {
    try {
      const response = await fetch(`/api/spending-analyzer/sessions?id=${sessionId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        fetchSavedSessions();
        if (currentAnalysisId === sessionId) {
          setCurrentAnalysisId(null);
          setTransactions([]);
          setInsights([]);
          setAnalysisStatus("idle");
        }
      }
    } catch (error) {
      console.error("Error deleting session:", error);
    }
  };

  const handleStartSession = () => {
    if (sessionName.trim()) {
      setIsSessionStarted(true);
      setAnalysisStatus("idle");
      setShowNewAnalysisDialog(false);
    }
  };

  const handleBankConnectionSuccess = (userId: string, connectionId: string) => {
    console.log("Bank connected successfully:", { userId, connectionId });
    // Optionally refresh saved sessions or reload page
    fetchSavedSessions();
  };

  const handleBankConnectionError = (error: string) => {
    console.error("Bank connection error:", error);
  };

  const handleFilesUploaded = async (files: File[]) => {
    setUploadedFiles(prev => [...prev, ...files]);
    setIsProcessing(true);
    setAnalysisStatus("processing");

    try {
      // Create FormData for file upload
      const formData = new FormData();
      files.forEach(file => formData.append("files", file));
      formData.append("analysisName", sessionName);

      // Upload and process files
      const uploadResponse = await fetch("/api/spending-analyzer/upload", {
        method: "POST",
        body: formData,
      });

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json().catch(() => ({ error: "Unknown error" }));
        console.error("Upload failed:", uploadResponse.status, errorData);
        throw new Error(errorData.error || `Failed to upload files: ${uploadResponse.status}`);
      }

      const uploadResult = await uploadResponse.json();
      console.log(`Processed ${uploadResult.transactionCount} transactions`);
      console.log('Upload result:', uploadResult);

      // Set the current analysis ID
      setCurrentAnalysisId(uploadResult.analysisId);
      console.log('Set analysisId to:', uploadResult.analysisId);

      // Save the session to database
      await fetch("/api/spending-analyzer/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          analysisId: uploadResult.analysisId,
          analysisName: sessionName,
        }),
      });

      // Fetch the processed transactions
      const transactionsUrl = `/api/spending-analyzer/transactions?analysisId=${uploadResult.analysisId}`;
      console.log('Fetching transactions from:', transactionsUrl);

      const transactionsResponse = await fetch(transactionsUrl);

      if (!transactionsResponse.ok) {
        console.error('Failed to fetch transactions:', transactionsResponse.status);
        throw new Error("Failed to fetch transactions");
      }

      const transactionData = await transactionsResponse.json();
      console.log('Fetched transaction data:', transactionData.length, 'transactions');

      // Convert date strings to Date objects and format transactions
      const formattedTransactions = transactionData.map((txn: any) => ({
        id: txn.id,
        date: new Date(txn.date),
        description: txn.description,
        merchant: txn.merchant,
        amount: parseFloat(txn.amount),
        category: txn.category?.name,
        status: txn.status,
        notes: txn.notes,
        isRecurring: false, // Will be set by AI categorization
        aiConfidence: txn.aiConfidence,
        merchantType: txn.originalData?.merchantType,
        merchantDescription: txn.originalData?.merchantDescription,
      }));

      setTransactions(formattedTransactions);

      // Trigger AI categorization if we have transactions
      if (formattedTransactions.length > 0) {
        const categorizeResponse = await fetch("/api/spending-analyzer/categorize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ analysisId: uploadResult.analysisId }),
        });

        if (categorizeResponse.ok) {
          const categorizeResult = await categorizeResponse.json();
          console.log(`Categorized ${categorizeResult.categorized} transactions`);

          // Refresh transactions to get categorized data
          const refreshResponse = await fetch(
            `/api/spending-analyzer/transactions?analysisId=${uploadResult.analysisId}`
          );

          if (refreshResponse.ok) {
            const refreshedData = await refreshResponse.json();
            const refreshedTransactions = refreshedData.map((txn: any) => ({
              id: txn.id,
              date: new Date(txn.date),
              description: txn.description,
              merchant: txn.merchant,
              amount: parseFloat(txn.amount),
              category: txn.category?.name,
              status: txn.status,
              notes: txn.notes,
              isRecurring: txn.notes?.includes("recurring") || false,
              aiConfidence: txn.aiConfidence,
              merchantType: txn.originalData?.merchantType,
              merchantDescription: txn.originalData?.merchantDescription,
            }));
            setTransactions(refreshedTransactions);
          }
        }
      }

      setIsProcessing(false);
      setAnalysisStatus("completed");

      // Generate basic insights
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
            title: "Upload Complete",
            description: `Successfully processed ${formattedTransactions.length} transactions`,
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
    } catch (error) {
      console.error("Error processing files:", error);
      setAnalysisStatus("error");
      setIsProcessing(false);
      setInsights([
        {
          type: "error",
          title: "Processing Error",
          description: error instanceof Error ? error.message : "Failed to process files",
        },
      ]);
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

  const handleExport = () => {
    // Implement export functionality
    console.log("Exporting analysis...");
  };

  const handleSave = async () => {
    if (!currentAnalysisId) {
      console.error("No analysis ID to save");
      return;
    }

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
              categoryId: txn.category, // Category name or ID
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
          analysisId: currentAnalysisId,
          analysisName: sessionName,
        }),
      });

      if (response.ok) {
        console.log("Session saved successfully");
        fetchSavedSessions(); // Refresh the saved sessions list

        // Show success feedback
        setInsights(prev => [...prev, {
          type: "success",
          title: "Saved",
          description: `All changes saved successfully`,
        }]);
      }
    } catch (error) {
      console.error("Error saving session:", error);
      setInsights(prev => [...prev, {
        type: "error",
        title: "Save Failed",
        description: "Failed to save changes. Please try again.",
      }]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBackToHome = () => {
    setIsSessionStarted(false);
    setTransactions([]);
    setInsights([]);
    setCurrentAnalysisId(null);
    setSessionName("");
    setAnalysisStatus("idle");
    setUploadedFiles([]);
  };

  // Main content when session is started
  if (isSessionStarted) {
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
              <h1 className="text-3xl font-bold tracking-tight">{sessionName}</h1>
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

        {/* Advisor Help Card - Show when transactions are analyzed */}
        {transactions.length > 0 && (
          <Card className="relative overflow-hidden border-2 border-sky-200 shadow-2xl bg-gradient-to-br from-sky-50 to-blue-50 dark:from-sky-950/20 dark:to-blue-950/20">
            {/* Subtle overlay gradient for depth */}
            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-sky-100/30 to-blue-100/40 dark:via-sky-900/10 dark:to-blue-900/10" />
            
            <CardContent className="relative p-8">
              <div className="flex items-center gap-8">
                {advisor ? (
                  /* Advisor Profile Column */
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
                    {/* Full height vertical divider */}
                    <div className="absolute -top-8 -bottom-8 right-0 border-l border-gray-200 dark:border-gray-700" />
                  </div>
                ) : null}
                
                <div className="flex-1 max-w-2xl space-y-3">
                  {!advisor && (
                    <div className="flex items-center gap-2">
                      <div className="flex -space-x-2">
                        <div className="w-8 h-8 rounded-full bg-sky-500 flex items-center justify-center text-white text-xs font-bold shadow-sm">SA</div>
                        <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-bold shadow-sm">MC</div>
                      </div>
                      <Badge className="bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300 border-sky-200 dark:border-sky-700">
                        Expert Advisors Available
                      </Badge>
                    </div>
                  )}
                  
                  <h3 className="cta-title-lg">
                    {advisor
                      ? `Questions about your spending patterns?`
                      : `We found ${Math.round(transactions.reduce((sum, t) => sum + Math.abs(t.amount), 0) * 0.15)}/month in potential savings!`}
                  </h3>
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    {advisor
                      ? `${advisor.firstName} can help you take control of your spending and create a personalized budget that aligns with your goals.`
                      : `Our certified advisors can help you optimize your spending, create a budget that works, and achieve your financial goals faster.`}
                  </p>
                  
                  {!advisor && (
                    <div className="flex items-center gap-4 text-xs text-gray-600 dark:text-gray-400 pt-2">
                      <div className="flex items-center gap-1">
                        <CheckCircle className="h-3 w-3 text-sky-500" />
                        <span>Free consultation</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3 text-sky-500" />
                        <span>15-min response</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Star className="h-3 w-3 text-sky-500" />
                        <span>4.9/5 rating</span>
                      </div>
                    </div>
                  )}
                </div>
                
                <div className={cn(
                  "flex flex-col items-center justify-center gap-2 px-4 min-w-[200px]",
                  !advisor && "ml-auto"
                )}>
                  <AdvisorContactButton 
                    context="Spending Analyzer - Analysis" 
                    variant="default"
                    size="lg"
                    className="w-full"
                  />
                  {!advisor && (
                    <span className="text-xs text-gray-500 dark:text-gray-400">No obligation</span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="upload" className="space-y-4">
          <TabsList className="grid grid-cols-3 w-full max-w-[600px]">
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
          </TabsList>

          <TabsContent value="upload" className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              {/* Connect Bank Card */}
              <Card className="glass-card border-0">
                <div className={cn(
                  advisor ? "" : "opacity-75"
                )}>
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
                        onSuccess={handleBankConnectionSuccess}
                        onError={handleBankConnectionError}
                        className="w-full"
                      />
                    ) : (
                      <Button 
                        className="w-full" 
                        size="lg"
                        disabled
                        variant="outline"
                      >
                        <Lock className="mr-2 h-4 w-4" />
                        Clients Only Feature
                      </Button>
                    )}
                  </CardContent>
                </div>
                {!advisor && (
                  <CardContent className="pt-0">
                    <AdvisorContactButton
                      context="Bank Connection Request"
                      variant="default"
                      size="sm"
                      className="w-full"
                    />
                  </CardContent>
                )}
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
            <div>
              <h2 className="text-2xl font-bold tracking-tight mb-2">Review Transactions</h2>
              <p className="text-muted-foreground mb-4">
                Mark transactions as Keep, Cancel, or Consider for further review
              </p>
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
        </Tabs>
      </div>
    );
  }

  // Initial landing page
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="pt-6">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-md bg-emerald-500/10">
            <Brain className="h-7 w-7 text-emerald-500" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold">Spending Analyzer</h1>
              <Badge className="bg-gradient-to-r from-sky-500 to-blue-500 text-white border-0 px-2 py-1">
                <Sparkles className="h-3 w-3 mr-1" />
                Powered by AI
              </Badge>
            </div>
            <p className="text-muted-foreground mt-2">
              Upload your bank statements to get AI-powered spending insights
            </p>
          </div>
        </div>
      </div>

      {/* Advisor Help Card */}
      <Card className="relative overflow-hidden border-2 border-sky-200 shadow-2xl bg-gradient-to-br from-sky-50 to-blue-50 dark:from-sky-950/20 dark:to-blue-950/20 mb-6">
        {/* Subtle overlay gradient for depth */}
        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-sky-100/30 to-blue-100/40 dark:via-sky-900/10 dark:to-blue-900/10" />
        
        <CardContent className="relative p-8 overflow-hidden">
          <div className="flex items-center gap-8">
            {advisor ? (
              /* Advisor Profile Column */
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
                {/* Full height vertical divider */}
                <div className="absolute -top-8 -bottom-8 right-0 border-l border-gray-200 dark:border-gray-700" />
              </div>
            ) : null}
            
            <div className="flex-1 max-w-2xl space-y-3">
              {!advisor && (
                <div className="flex items-center gap-2">
                  <div className="flex -space-x-2">
                    <div className="w-8 h-8 rounded-full bg-sky-500 flex items-center justify-center text-white text-xs font-bold shadow-sm">SA</div>
                    <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-bold shadow-sm">MC</div>
                  </div>
                  <Badge className="bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300 border-sky-200 dark:border-sky-700">
                    Expert Advisors Available
                  </Badge>
                </div>
              )}
              
              <h3 className="cta-title-lg">
                {advisor
                  ? `Ready to take control of your spending?`
                  : `Start your financial transformation today`}
              </h3>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                {advisor
                  ? `${advisor.firstName} is here to help you understand your spending habits and create a sustainable budget that works for your lifestyle.`
                  : `Get personalized guidance from certified financial advisors who can help you budget, save, invest, and achieve your financial goals.`}
              </p>
              
              {!advisor && (
                <div className="flex items-center gap-4 text-xs text-gray-600 dark:text-gray-400 pt-2">
                  <div className="flex items-center gap-1">
                    <CheckCircle className="h-3 w-3 text-sky-500" />
                    <span>Free consultation</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3 text-sky-500" />
                    <span>15-min response</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Star className="h-3 w-3 text-sky-500" />
                    <span>4.9/5 rating</span>
                  </div>
                </div>
              )}
            </div>
            
            <div className={cn(
              "flex flex-col items-center justify-center gap-2 px-4 min-w-[200px]",
              !advisor && "ml-auto"
            )}>
              <AdvisorContactButton 
                context="Spending Analyzer - Welcome" 
                variant="default"
                size="lg"
                className="w-full"
              />
              {!advisor && (
                <span className="text-xs text-gray-500 dark:text-gray-400">No obligation</span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card
          className="glass-card border-0 cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => setShowNewAnalysisDialog(true)}
        >
          <CardHeader>
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
              <Plus className="h-6 w-6 text-primary" />
            </div>
            <CardTitle>New Review</CardTitle>
            <CardDescription>
              Start a fresh spending review
            </CardDescription>
          </CardHeader>
        </Card>

        <Card
          className="glass-card border-0 cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => setShowSavedSessions(!showSavedSessions)}
        >
          <CardHeader>
            <div className="h-12 w-12 rounded-full bg-green-500/10 flex items-center justify-center mb-3">
              <History className="h-6 w-6 text-green-500" />
            </div>
            <CardTitle>Your Reviews</CardTitle>
            <CardDescription>
              Continue a previous review
            </CardDescription>
          </CardHeader>
        </Card>
      </div>

      {/* Your Reviews */}
      {showSavedSessions && (
        <SessionsDashboard onViewSession={loadSession} />
      )}

      {/* New Review Dialog */}
      <Dialog open={showNewAnalysisDialog} onOpenChange={setShowNewAnalysisDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Start New Review</DialogTitle>
            <DialogDescription>
              Give your spending review a name to get started
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="session-name">Review Name</Label>
            <Input
              id="session-name"
              placeholder="e.g., January 2024 Spending Review"
              value={sessionName}
              onChange={(e) => setSessionName(e.target.value)}
              className="mt-2"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewAnalysisDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleStartSession} disabled={!sessionName.trim()}>
              <Sparkles className="mr-2 h-4 w-4" />
              Start Review
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}