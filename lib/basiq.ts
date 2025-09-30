import { prisma } from "@/lib/prisma";

const BASIQ_API_URL = process.env.BASIQ_API_URL || "https://au-api.basiq.io";
const BASIQ_API_KEY = process.env.BASIQ_API_KEY || "";

interface BasiqTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

interface BasiqConsentResponse {
  id: string;
  userId: string;
  created: string;
  updated: string;
  status: string;
  url: string;
  expiresAt: string;
}

interface BasiqAccountResponse {
  id: string;
  accountNo: string;
  name: string;
  class: {
    type: string;
    product: string;
  };
  balance: number;
  availableBalance: number;
  currency: string;
  institution: string;
  lastUpdated: string;
}

interface BasiqTransactionResponse {
  id: string;
  accountId: string;
  amount: number;
  balance: number;
  class: string;
  description: string;
  direction: string;
  postDate: string;
  transactionDate: string;
  status: string;
  subClass?: {
    title: string;
    code: string;
  };
  merchant?: {
    name: string;
  };
}

class BasiqClient {
  private token: string | null = null;
  private tokenExpiry: Date | null = null;

  private async getAccessToken(): Promise<string> {
    // Check if we have a valid token
    if (this.token && this.tokenExpiry && this.tokenExpiry > new Date()) {
      return this.token;
    }

    // The BASIQ_API_KEY should already be base64 encoded from Basiq dashboard
    // Get new token
    const response = await fetch(`${BASIQ_API_URL}/token`, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${BASIQ_API_KEY}`,
        "Content-Type": "application/x-www-form-urlencoded",
        "basiq-version": "3.0",
      },
      body: "grant_type=client_credentials&scope=SERVER_ACCESS",
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Basiq token error:", errorText);
      throw new Error(`Failed to get Basiq token: ${response.statusText}`);
    }

    const data: BasiqTokenResponse = await response.json();
    this.token = data.access_token;
    this.tokenExpiry = new Date(Date.now() + (data.expires_in * 1000));
    
    return this.token;
  }

  async createUser(email: string): Promise<string> {
    const token = await this.getAccessToken();
    
    const response = await fetch(`${BASIQ_API_URL}/users`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
        "basiq-version": "3.0",
      },
      body: JSON.stringify({
        email: email,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to create Basiq user: ${response.statusText}`);
    }

    const data = await response.json();
    return data.id;
  }

  async createConsent(
    userId: string, 
    basiqUserId: string,
    purpose: string = "Spending analysis and financial insights"
  ): Promise<BasiqConsentResponse> {
    const token = await this.getAccessToken();
    
    const response = await fetch(`${BASIQ_API_URL}/users/${basiqUserId}/consents`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
        "basiq-version": "3.0",
      },
      body: JSON.stringify({
        type: "cdr",
        scopes: ["ACCOUNTS", "TRANSACTIONS"],
        title: "Trend Advisory Financial Analysis",
        purposes: {
          primary: purpose,
        },
        duration: 365, // 365 days
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to create consent: ${error}`);
    }

    return await response.json();
  }

  async getAccounts(basiqUserId: string): Promise<BasiqAccountResponse[]> {
    const token = await this.getAccessToken();
    
    const response = await fetch(`${BASIQ_API_URL}/users/${basiqUserId}/accounts`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${token}`,
        "basiq-version": "3.0",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to get accounts: ${response.statusText}`);
    }

    const data = await response.json();
    return data.data || [];
  }

  async getTransactions(
    basiqUserId: string, 
    accountId?: string,
    fromDate?: Date,
    limit: number = 500
  ): Promise<BasiqTransactionResponse[]> {
    const token = await this.getAccessToken();
    
    let url = `${BASIQ_API_URL}/users/${basiqUserId}/transactions?limit=${limit}`;
    if (accountId) {
      url += `&filter=account.id.eq('${accountId}')`;
    }
    if (fromDate) {
      url += `&filter=transactionDate.gte('${fromDate.toISOString().split('T')[0]}')`;
    }

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${token}`,
        "basiq-version": "3.0",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to get transactions: ${response.statusText}`);
    }

    const data = await response.json();
    return data.data || [];
  }

  async getConnection(basiqUserId: string, connectionId: string) {
    const token = await this.getAccessToken();
    
    const response = await fetch(`${BASIQ_API_URL}/users/${basiqUserId}/connections/${connectionId}`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${token}`,
        "basiq-version": "3.0",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to get connection: ${response.statusText}`);
    }

    return await response.json();
  }

  async refreshConnection(basiqUserId: string, connectionId: string) {
    const token = await this.getAccessToken();
    
    const response = await fetch(
      `${BASIQ_API_URL}/users/${basiqUserId}/connections/${connectionId}/refresh`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "basiq-version": "3.0",
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to refresh connection: ${response.statusText}`);
    }

    return await response.json();
  }

  async deleteConnection(basiqUserId: string, connectionId: string) {
    const token = await this.getAccessToken();
    
    const response = await fetch(
      `${BASIQ_API_URL}/users/${basiqUserId}/connections/${connectionId}`,
      {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${token}`,
          "basiq-version": "3.0",
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to delete connection: ${response.statusText}`);
    }

    return true;
  }
}

export const basiqClient = new BasiqClient();