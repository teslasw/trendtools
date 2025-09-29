"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { FileUploadZone } from "./components/FileUploadZone";
import { TransactionTable, type Transaction } from "./components/TransactionTable";
import { SpendingDashboard } from "./components/SpendingDashboard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ClientOnlyBadge } from "@/components/ui/client-badge";
import { AdvisorContactButton } from "@/components/advisor-contact";
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
} from "lucide-react";
import { cn } from "@/lib/utils";

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
        }));

        setTransactions(formattedTransactions);
        setCurrentAnalysisId(sessionId);
        setAnalysisStatus("completed");

        // Set the session name
        const session = savedSessions.find(s => s.id === sessionId);
        if (session) {
          setSessionName(session.name);
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

  const handleConnectBank = () => {
    if (!isClient) {
      return;
    }
    // TODO: Implement bank connection
    console.log("Connecting to bank...");
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

      // Set the current analysis ID
      setCurrentAnalysisId(uploadResult.analysisId);

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
      const transactionsResponse = await fetch(
        `/api/spending-analyzer/transactions?analysisId=${uploadResult.analysisId}`
      );

      if (!transactionsResponse.ok) {
        throw new Error("Failed to fetch transactions");
      }

      const transactionData = await transactionsResponse.json();

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
            }));
            setTransactions(refreshedTransactions);
          }
        }
      }

      setIsProcessing(false);
      setAnalysisStatus("completed");

      // Generate basic insights
      if (formattedTransactions.length > 0) {
        const totalSpent = formattedTransactions.reduce(
          (sum: number, t: Transaction) => sum + Math.abs(t.amount),
          0
        );

        setInsights([
          {
            type: "summary",
            title: "Upload Complete",
            description: `Successfully processed ${formattedTransactions.length} transactions totaling $${totalSpent.toFixed(2)}`,
            value: formattedTransactions.length,
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
      }
    } catch (error) {
      console.error("Error saving session:", error);
    }
  };

  // Main content when session is started
  if (isSessionStarted) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{sessionName}</h1>
            <p className="text-muted-foreground mt-2">
              Analyze your spending patterns with AI-powered insights
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleSave}>
              <Save className="mr-2 h-4 w-4" />
              Save
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
          <Card className="relative overflow-hidden border-2 border-emerald-400/50 shadow-2xl bg-gradient-to-br from-emerald-50 via-teal-50/80 to-cyan-50 dark:from-emerald-950/40 dark:via-teal-950/30 dark:to-cyan-950/40">
            {/* Morphing gradient background */}
            <div 
              className="absolute inset-0 animate-gradient-morph opacity-30"
              style={{
                background: `linear-gradient(135deg, 
                  rgba(16, 185, 129, 0.3) 0%, 
                  rgba(20, 184, 166, 0.2) 25%, 
                  rgba(6, 182, 212, 0.3) 50%, 
                  rgba(20, 184, 166, 0.2) 75%, 
                  rgba(16, 185, 129, 0.3) 100%)`,
                backgroundSize: '200% 200%'
              }}
            />
            
            {/* Secondary morphing layer */}
            <div 
              className="absolute inset-0 animate-gradient-morph opacity-20"
              style={{
                background: `radial-gradient(circle at 30% 50%, 
                  rgba(52, 211, 153, 0.4) 0%, 
                  transparent 50%)`,
                backgroundSize: '200% 200%',
                animationDelay: '-5s',
                animationDuration: '20s'
              }}
            />
            
            {/* Soft glow spots */}
            <div className="absolute top-10 right-20 w-40 h-40 bg-emerald-400/30 rounded-full blur-3xl" />
            <div className="absolute bottom-10 left-20 w-48 h-48 bg-teal-400/30 rounded-full blur-3xl" />
            
            <CardContent className="relative p-8">
              <div className="flex items-center justify-between gap-6">
                <div className="flex-1 space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="flex -space-x-2">
                      <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-white text-xs font-bold">SA</div>
                      <div className="w-8 h-8 rounded-full bg-teal-500 flex items-center justify-center text-white text-xs font-bold">MC</div>
                    </div>
                    <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20">
                      Expert Advisors Available
                    </Badge>
                  </div>
                  
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                    We found ${Math.round(transactions.reduce((sum, t) => sum + Math.abs(t.amount), 0) * 0.15)}/month in potential savings!
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    Our certified advisors can help you optimize your spending, create a budget that works, and achieve your financial goals faster.
                  </p>
                  
                  <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2">
                    <div className="flex items-center gap-1">
                      <CheckCircle className="h-3 w-3 text-emerald-500" />
                      <span>Free consultation</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3 text-emerald-500" />
                      <span>15-min response</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Star className="h-3 w-3 text-emerald-500" />
                      <span>4.9/5 rating</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-col items-center gap-2">
                  <AdvisorContactButton 
                    context="Spending Analyzer - Analysis" 
                    variant="default"
                    size="lg"
                    className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white border-0 shadow-lg hover:shadow-xl transition-all transform hover:scale-105"
                  />
                  <span className="text-xs text-muted-foreground">No obligation</span>
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
              <Card className="glass-card border-0 shadow-xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    Connect Your Bank
                    {!isClient && <ClientOnlyBadge />}
                  </CardTitle>
                  <CardDescription>
                    Securely connect to your bank for automatic transaction import
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button 
                    className="w-full" 
                    size="lg"
                    onClick={handleConnectBank}
                    disabled={!isClient}
                    variant={isClient ? "default" : "outline"}
                  >
                    {isClient ? (
                      <>
                        <Building2 className="mr-2 h-4 w-4" />
                        Connect Bank Account
                      </>
                    ) : (
                      <>
                        <Lock className="mr-2 h-4 w-4" />
                        Clients Only Feature
                      </>
                    )}
                  </Button>
                  {!isClient && (
                    <p className="text-xs text-muted-foreground mt-3 text-center">
                      Upgrade to a client account to access bank connections
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Manual Upload Card */}
              <Card className="glass-card border-0 shadow-xl">
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
            <Card className="glass-card border-0 shadow-xl">
              <CardHeader>
                <CardTitle>Review Transactions</CardTitle>
                <CardDescription>
                  Mark transactions as Keep, Cancel, or Consider for further review
                </CardDescription>
              </CardHeader>
              <CardContent>
                <TransactionTable
                  transactions={transactions}
                  onUpdateTransaction={handleUpdateTransaction}
                  onBulkUpdate={handleBulkUpdate}
                />
              </CardContent>
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
      <div>
        <h1 className="text-3xl font-bold">Spending Analyzer</h1>
        <p className="text-muted-foreground mt-2">
          Upload your bank statements to get AI-powered spending insights
        </p>
      </div>

      {/* Advisor Help Card */}
      <Card className="relative overflow-hidden border-2 border-emerald-400/50 shadow-2xl bg-gradient-to-br from-emerald-50 via-teal-50/80 to-cyan-50 dark:from-emerald-950/40 dark:via-teal-950/30 dark:to-cyan-950/40 mb-6">
        {/* Morphing gradient background */}
        <div 
          className="absolute inset-0 animate-gradient-morph opacity-30"
          style={{
            background: `linear-gradient(135deg, 
              rgba(16, 185, 129, 0.3) 0%, 
              rgba(20, 184, 166, 0.2) 25%, 
              rgba(6, 182, 212, 0.3) 50%, 
              rgba(20, 184, 166, 0.2) 75%, 
              rgba(16, 185, 129, 0.3) 100%)`,
            backgroundSize: '200% 200%'
          }}
        />
        
        {/* Secondary morphing layer */}
        <div 
          className="absolute inset-0 animate-gradient-morph opacity-20"
          style={{
            background: `radial-gradient(circle at 30% 50%, 
              rgba(52, 211, 153, 0.4) 0%, 
              transparent 50%)`,
            backgroundSize: '200% 200%',
            animationDelay: '-5s',
            animationDuration: '20s'
          }}
        />
        
        {/* Soft glow spots */}
        <div className="absolute top-10 right-20 w-40 h-40 bg-emerald-400/30 rounded-full blur-3xl" />
        <div className="absolute bottom-10 left-20 w-48 h-48 bg-teal-400/30 rounded-full blur-3xl" />
        
        <CardContent className="relative p-8">
          <div className="flex items-center justify-between gap-6">
            <div className="flex-1 space-y-3">
              <div className="flex items-center gap-2">
                <div className="flex -space-x-2">
                  <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-white text-xs font-bold">SA</div>
                  <div className="w-8 h-8 rounded-full bg-teal-500 flex items-center justify-center text-white text-xs font-bold">MC</div>
                </div>
                <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20">
                  Expert Advisors Available
                </Badge>
              </div>
              
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                Start your financial transformation today
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Get personalized guidance from certified financial advisors who can help you budget, save, invest, and achieve your financial goals.
              </p>
              
              <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2">
                <div className="flex items-center gap-1">
                  <CheckCircle className="h-3 w-3 text-emerald-500" />
                  <span>Free consultation</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3 text-emerald-500" />
                  <span>15-min response</span>
                </div>
                <div className="flex items-center gap-1">
                  <Star className="h-3 w-3 text-emerald-500" />
                  <span>4.9/5 rating</span>
                </div>
              </div>
            </div>
            
            <div className="flex flex-col items-center gap-2">
              <AdvisorContactButton 
                context="Spending Analyzer - Welcome" 
                variant="default"
                size="lg"
                className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white border-0 shadow-lg hover:shadow-xl transition-all transform hover:scale-105"
              />
              <span className="text-xs text-muted-foreground">No obligation</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card 
          className="glass-card border-0 shadow-xl cursor-pointer hover:shadow-2xl transition-shadow"
          onClick={() => setShowNewAnalysisDialog(true)}
        >
          <CardHeader>
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
              <Plus className="h-6 w-6 text-primary" />
            </div>
            <CardTitle>New Analysis</CardTitle>
            <CardDescription>
              Start a fresh spending analysis session
            </CardDescription>
          </CardHeader>
        </Card>

        <Card 
          className={cn(
            "glass-card border-0 shadow-xl transition-shadow",
            isClient ? "cursor-pointer hover:shadow-2xl" : "opacity-75"
          )}
          onClick={isClient ? handleConnectBank : undefined}
        >
          <CardHeader>
            <div className="h-12 w-12 rounded-full bg-amber-500/10 flex items-center justify-center mb-3">
              <Building2 className="h-6 w-6 text-amber-500" />
            </div>
            <CardTitle className="flex items-center">
              Connect Bank
              {!isClient && <ClientOnlyBadge />}
            </CardTitle>
            <CardDescription>
              {isClient 
                ? "Securely connect to your bank account" 
                : "Available for advisory clients only"}
            </CardDescription>
          </CardHeader>
        </Card>

        <Card 
          className="glass-card border-0 shadow-xl cursor-pointer hover:shadow-2xl transition-shadow"
          onClick={() => setShowSavedSessions(!showSavedSessions)}
        >
          <CardHeader>
            <div className="h-12 w-12 rounded-full bg-green-500/10 flex items-center justify-center mb-3">
              <History className="h-6 w-6 text-green-500" />
            </div>
            <CardTitle>Saved Sessions</CardTitle>
            <CardDescription>
              Continue with a previous analysis
            </CardDescription>
          </CardHeader>
        </Card>
      </div>

      {/* Saved Sessions */}
      {showSavedSessions && (
        <Card className="glass-card border-0 shadow-xl">
          <CardHeader>
            <CardTitle>Your Saved Sessions</CardTitle>
            <CardDescription>
              Select a session to continue analyzing
            </CardDescription>
          </CardHeader>
          <CardContent>
            {savedSessions.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No saved sessions yet</p>
                <Button 
                  className="mt-4" 
                  onClick={() => setShowNewAnalysisDialog(true)}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Start Your First Analysis
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {savedSessions.map((session) => (
                  <div
                    key={session.id}
                    className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                  >
                    <div>
                      <h4 className="font-semibold">{session.name}</h4>
                      <p className="text-sm text-muted-foreground">
                        {session.transactionCount} transactions • ${session.totalAmount.toFixed(2)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Created {new Date(session.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => loadSession(session.id)}
                      >
                        Continue
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          if (confirm(`Delete "${session.name}"?`)) {
                            deleteSession(session.id);
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* New Analysis Dialog */}
      <Dialog open={showNewAnalysisDialog} onOpenChange={setShowNewAnalysisDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Start New Analysis</DialogTitle>
            <DialogDescription>
              Give your spending analysis a name to get started
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="session-name">Session Name</Label>
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
              Start Analysis
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}