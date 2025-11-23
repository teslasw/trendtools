"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  FileText,
  Loader2,
  CheckCircle2,
  Eye,
  Trash2,
  Clock,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { createBrowserClient } from "@/lib/supabase";

interface Session {
  id: string;
  name: string;
  status: string;
  viewedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  transactionCount: number;
  totalAmount: number;
}

interface SessionsDashboardProps {
  onViewSession?: (sessionId: string) => void; // Make optional since we're using router now
}

export function SessionsDashboard({ onViewSession }: SessionsDashboardProps) {
  const router = useRouter();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  // Fetch sessions on mount
  useEffect(() => {
    fetchSessions();
  }, []);

  // Set up Supabase Realtime subscription
  useEffect(() => {
    const supabase = createBrowserClient();

    // If Supabase is not configured, fall back to polling
    if (!supabase) {
      console.log('[Realtime] Supabase not configured, falling back to polling');
      const interval = setInterval(fetchSessions, 5000);
      return () => clearInterval(interval);
    }

    console.log('[Realtime] Setting up Supabase subscription for SpendingAnalysis');

    const channel = supabase
      .channel('spending-analysis-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'SpendingAnalysis',
        },
        (payload) => {
          console.log('[Realtime] Change detected:', payload);

          if (payload.eventType === 'INSERT') {
            // New session created
            fetchSessions();
          } else if (payload.eventType === 'UPDATE') {
            // Session updated (status changed)
            setSessions((prev) =>
              prev.map((session) =>
                session.id === payload.new.id
                  ? {
                      ...session,
                      status: payload.new.status,
                      viewedAt: payload.new.viewedAt,
                      updatedAt: new Date(payload.new.updatedAt),
                    }
                  : session
              )
            );
          } else if (payload.eventType === 'DELETE') {
            // Session deleted
            setSessions((prev) =>
              prev.filter((session) => session.id !== payload.old.id)
            );
          }
        }
      )
      .subscribe((status) => {
        console.log('[Realtime] Subscription status:', status);
      });

    return () => {
      console.log('[Realtime] Cleaning up subscription');
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchSessions = async () => {
    try {
      const response = await fetch("/api/spending-analyzer/sessions");
      if (!response.ok) throw new Error("Failed to fetch sessions");

      const data = await response.json();
      setSessions(data.map((s: any) => ({
        ...s,
        createdAt: new Date(s.createdAt),
        updatedAt: new Date(s.updatedAt),
        viewedAt: s.viewedAt ? new Date(s.viewedAt) : null,
      })));
    } catch (error) {
      console.error("Error fetching sessions:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (sessionId: string) => {
    if (!confirm("Are you sure you want to delete this review?")) {
      return;
    }

    setDeleting(sessionId);
    try {
      const response = await fetch(
        `/api/spending-analyzer/sessions?id=${sessionId}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) throw new Error("Failed to delete review");

      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
    } catch (error) {
      console.error("Error deleting session:", error);
      alert("Failed to delete review");
    } finally {
      setDeleting(null);
    }
  };

  const getStatusBadge = (session: Session) => {
    if (session.status === "processing") {
      return (
        <Badge variant="secondary" className="bg-blue-100 text-blue-700">
          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
          Analysing...
        </Badge>
      );
    }

    if (session.status === "completed" && !session.viewedAt) {
      return (
        <Badge variant="secondary" className="bg-green-100 text-green-700">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Ready
        </Badge>
      );
    }

    if (session.status === "completed" && session.viewedAt) {
      return (
        <Badge variant="outline">
          <Eye className="h-3 w-3 mr-1" />
          Viewed {format(session.viewedAt, "MMM d, h:mm a")}
        </Badge>
      );
    }

    return (
      <Badge variant="destructive">
        Failed
      </Badge>
    );
  };

  const handleViewSession = (sessionId: string) => {
    // Navigate to the session view page with the ID in the URL
    router.push(`/dashboard/tools/spending-analyzer/${sessionId}`);
  };

  const getActionButton = (session: Session) => {
    if (session.status === "processing") {
      return (
        <Button variant="outline" size="sm" disabled>
          <Clock className="h-4 w-4 mr-1" />
          Processing
        </Button>
      );
    }

    if (session.status === "completed") {
      return (
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleViewSession(session.id)}
        >
          <Eye className="h-4 w-4 mr-1" />
          {session.viewedAt ? "View Again" : "View"}
        </Button>
      );
    }

    return null;
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Your Reviews</h2>
          <p className="text-muted-foreground">
            View and manage your spending reviews
          </p>
        </div>
        <Card className="glass-card border-0 shadow-xl">
          <div className="flex items-center justify-center p-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </Card>
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className="space-y-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Your Reviews</h2>
          <p className="text-muted-foreground">
            View and manage your spending reviews
          </p>
        </div>
        <Card className="glass-card border-0 shadow-xl">
          <div className="p-12 text-center">
            <h3 className="text-lg font-semibold mb-2">No Reviews Yet</h3>
            <p className="text-sm text-muted-foreground">
              Upload a bank statement to get started
            </p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Your Reviews</h2>
        <p className="text-muted-foreground">
          View and manage your spending reviews
        </p>
      </div>
      <Card className="glass-card border-0 shadow-xl overflow-hidden">
        <Table>
            <TableHeader className="bg-white dark:bg-gray-900">
              <TableRow>
                <TableHead className="font-bold">Name</TableHead>
                <TableHead className="font-bold">Created</TableHead>
                <TableHead className="font-bold">Status</TableHead>
                <TableHead className="font-bold text-right">Transactions</TableHead>
                <TableHead className="font-bold text-right">Total Amount</TableHead>
                <TableHead className="font-bold text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sessions.map((session) => (
                <TableRow key={session.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{session.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm text-muted-foreground">
                      {format(session.createdAt, "MMM d, yyyy")}
                      <br />
                      <span className="text-xs">
                        {format(session.createdAt, "h:mm a")}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>{getStatusBadge(session)}</TableCell>
                  <TableCell className="text-right">
                    {session.status === "completed" ? (
                      <span className="font-medium">
                        {session.transactionCount}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {session.status === "completed" && session.totalAmount > 0 ? (
                      <span className="font-medium">
                        {formatCurrency(session.totalAmount)}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      {getActionButton(session)}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(session.id)}
                        disabled={deleting === session.id}
                      >
                        {deleting === session.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4 text-red-600" />
                        )}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
        </Table>
      </Card>
    </div>
  );
}
