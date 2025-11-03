"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Building2, Clock, CheckCircle, XCircle } from "lucide-react";

interface BasiqConnectProps {
  onSuccess?: (userId: string, connectionId: string) => void;
  onError?: (error: string) => void;
  disabled?: boolean;
  className?: string;
}

export function BasiqConnect({
  onSuccess,
  onError,
  disabled = false,
  className = ""
}: BasiqConnectProps) {
  const [connecting, setConnecting] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const handleConnect = async () => {
    setConnecting(true);
    setStatus("Initializing connection...");

    try {
      // Get auth link from our backend
      const authResponse = await fetch("/api/banking/auth", {
        method: "POST",
      });

      if (!authResponse.ok) {
        const errorData = await authResponse.json();
        throw new Error(errorData.error || "Failed to get authorization");
      }

      const { consentUrl, userId: basiqUserId, connectionId } = await authResponse.json();

      setStatus("Opening bank connection...");

      // Open Basiq auth link in a popup window
      const authWindow = window.open(
        consentUrl,
        "basiq-auth",
        "width=500,height=800,left=200,top=100"
      );

      if (!authWindow) {
        throw new Error("Please allow popups for this site");
      }

      setStatus("Complete the bank connection in the popup...");

      // Poll for connection status
      const pollInterval = setInterval(async () => {
        try {
          const statusResponse = await fetch(
            `/api/banking/consent?connectionId=${connectionId}`
          );

          if (statusResponse.ok) {
            const statusData = await statusResponse.json();

            if (statusData.status === "active" && statusData.accounts.length > 0) {
              clearInterval(pollInterval);
              if (authWindow && !authWindow.closed) {
                authWindow.close();
              }

              setStatus("Connection successful! Syncing accounts...");

              // Sync the connected accounts
              await syncAccounts(connectionId);

              if (onSuccess) {
                onSuccess(basiqUserId, connectionId);
              }

              setStatus("All done!");
              setTimeout(() => {
                setStatus(null);
                window.location.reload();
              }, 2000);

              setConnecting(false);
            }
          }
        } catch (error) {
          console.error("Error polling connection status:", error);
        }

        // Stop polling if window is closed
        if (authWindow && authWindow.closed) {
          clearInterval(pollInterval);
          setStatus("Connection cancelled");
          setConnecting(false);
          setTimeout(() => setStatus(null), 3000);
        }
      }, 3000); // Poll every 3 seconds

      // Stop polling after 10 minutes
      setTimeout(() => {
        clearInterval(pollInterval);
        if (connecting) {
          setStatus("Connection timeout. Please try again.");
          setConnecting(false);
          setTimeout(() => setStatus(null), 3000);
        }
      }, 600000);

    } catch (error) {
      console.error("Error initializing Basiq Connect:", error);
      setStatus(error instanceof Error ? error.message : "Failed to connect");
      setConnecting(false);

      if (onError) {
        onError(error instanceof Error ? error.message : "Failed to connect");
      }

      setTimeout(() => setStatus(null), 5000);
    }
  };

  const syncAccounts = async (cid: string) => {
    try {
      const response = await fetch("/api/banking/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ connectionId: cid }),
      });

      if (response.ok) {
        const result = await response.json();
        setStatus(`Connected! Synced ${result.totalTransactionsSynced} transactions`);
      } else {
        throw new Error("Failed to sync");
      }
    } catch (error) {
      console.error("Error syncing accounts:", error);
      throw error;
    }
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <Button
        className="w-full"
        size="lg"
        onClick={handleConnect}
        disabled={disabled || connecting}
        variant="default"
      >
        {connecting ? (
          <>
            <Clock className="mr-2 h-4 w-4 animate-spin" />
            Connecting...
          </>
        ) : (
          <>
            <Building2 className="mr-2 h-4 w-4" />
            Connect Bank Account
          </>
        )}
      </Button>

      {status && (
        <div className="flex items-center justify-center gap-2 text-xs">
          {status.includes("successful") || status.includes("done") ? (
            <CheckCircle className="h-3 w-3 text-emerald-500" />
          ) : status.includes("failed") || status.includes("cancelled") ? (
            <XCircle className="h-3 w-3 text-destructive" />
          ) : (
            <Clock className="h-3 w-3 text-muted-foreground animate-spin" />
          )}
          <span className="text-muted-foreground">{status}</span>
        </div>
      )}
    </div>
  );
}
