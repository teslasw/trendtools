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
      // Get consent URL from our backend
      const authResponse = await fetch("/api/banking/auth", {
        method: "POST",
      });

      if (!authResponse.ok) {
        throw new Error("Failed to get authorization");
      }

      const { consentUrl, userId, connectionId } = await authResponse.json();

      // Open Basiq consent in a popup window
      const consentWindow = window.open(
        consentUrl,
        "basiq-consent",
        "width=600,height=700,left=200,top=100"
      );

      setStatus("Please complete bank authorization in the popup window...");

      // Poll for connection status
      const pollInterval = setInterval(async () => {
        try {
          const statusResponse = await fetch(
            `/api/banking/consent?connectionId=${connectionId}`
          );

          if (statusResponse.ok) {
            const status = await statusResponse.json();

            if (status.status === "active" && status.accounts.length > 0) {
              clearInterval(pollInterval);
              if (consentWindow && !consentWindow.closed) {
                consentWindow.close();
              }

              setStatus("Connection successful! Syncing accounts...");
              setConnecting(false);

              if (onSuccess) {
                onSuccess(userId, connectionId);
              }

              // Sync the connected accounts
              await syncAccounts(connectionId);
            }
          }
        } catch (error) {
          console.error("Error polling connection status:", error);
        }

        // Stop polling if window is closed
        if (consentWindow && consentWindow.closed) {
          clearInterval(pollInterval);
          setStatus("Connection cancelled");
          setConnecting(false);
          setTimeout(() => setStatus(null), 3000);
        }
      }, 3000); // Poll every 3 seconds

      // Stop polling after 5 minutes
      setTimeout(() => {
        clearInterval(pollInterval);
        if (connecting) {
          setStatus("Connection timeout. Please try again.");
          setConnecting(false);
          setTimeout(() => setStatus(null), 3000);
        }
      }, 300000);
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

  const syncAccounts = async (connectionId: string) => {
    try {
      const response = await fetch("/api/banking/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ connectionId }),
      });

      if (response.ok) {
        const result = await response.json();
        setStatus(`Connected! Synced ${result.totalTransactionsSynced} transactions`);
        
        setTimeout(() => {
          setStatus(null);
          // Optionally reload to show new data
          window.location.reload();
        }, 3000);
      }
    } catch (error) {
      console.error("Error syncing accounts:", error);
    }
  };

  // No need to load external script anymore

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
          {status.includes("successful") ? (
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

