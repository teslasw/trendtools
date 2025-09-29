"use client";

import { useState, useEffect } from "react";
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

  if (!isSessionStarted) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="space-y-4 w-full max-w-4xl">
          <Card className="glass-card border-0 shadow-xl">
            <CardHeader className="text-center">
              <div className="mx-auto h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Brain className="h-6 w-6 text-primary" />
              </div>
              <CardTitle className="text-2xl">Start Analysis Session</CardTitle>
              <CardDescription>
                Give your analysis a name to get started or load a saved session
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="session-name">Session Name</Label>
                <Input
                  id="session-name"
                  placeholder="e.g., January 2024 Spending Review"
                  value={sessionName}
                  onChange={(e) => setSessionName(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleStartSession()}
                  className="mt-2"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={handleStartSession}
                  disabled={!sessionName.trim()}
                  className="flex-1"
                >
                  <Sparkles className="mr-2 h-4 w-4" />
                  Start New Analysis
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowSavedSessions(!showSavedSessions)}
                  className="flex-1"
                >
                  <History className="mr-2 h-4 w-4" />
                  {showSavedSessions ? "Hide" : "Show"} Saved Sessions
                </Button>
              </div>
            </CardContent>
          </Card>

          {showSavedSessions && (
            <Card className="glass-card border-0 shadow-xl">
              <CardHeader>
                <CardTitle>Saved Sessions</CardTitle>
                <CardDescription>
                  Load a previous analysis session
                </CardDescription>
              </CardHeader>
              <CardContent>
                {savedSessions.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">
                    No saved sessions yet
                  </p>
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
                            variant="outline"
                            onClick={() => loadSession(session.id)}
                          >
                            Load
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
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{sessionName}</h1>
          <p className="text-muted-foreground mt-2">
            Upload your bank statements to get AI-powered spending insights
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
          <Card className="glass-card border-0 shadow-xl">
            <CardHeader>
              <CardTitle>Upload Bank Statements</CardTitle>
              <CardDescription>
                Upload your bank statements and let AI categorize your spending
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FileUploadZone
                onFilesUploaded={handleFilesUploaded}
                isProcessing={isProcessing}
              />
            </CardContent>
          </Card>
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