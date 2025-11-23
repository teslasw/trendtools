export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      Account: {
        Row: {
          access_token: string | null
          expires_at: number | null
          id: string
          id_token: string | null
          provider: string
          providerAccountId: string
          refresh_token: string | null
          scope: string | null
          session_state: string | null
          token_type: string | null
          type: string
          userId: string
        }
        Insert: {
          access_token?: string | null
          expires_at?: number | null
          id: string
          id_token?: string | null
          provider: string
          providerAccountId: string
          refresh_token?: string | null
          scope?: string | null
          session_state?: string | null
          token_type?: string | null
          type: string
          userId: string
        }
        Update: {
          access_token?: string | null
          expires_at?: number | null
          id?: string
          id_token?: string | null
          provider?: string
          providerAccountId?: string
          refresh_token?: string | null
          scope?: string | null
          session_state?: string | null
          token_type?: string | null
          type?: string
          userId?: string
        }
        Relationships: [
          {
            foreignKeyName: "Account_userId_fkey"
            columns: ["userId"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
        ]
      }
      BankStatement: {
        Row: {
          analysisId: string | null
          bankName: string | null
          extractionMetadata: Json | null
          extractionMethod: string | null
          filename: string
          fileUrl: string | null
          formatFingerprint: string | null
          formatId: string | null
          id: string
          processedAt: string | null
          statementType: string | null
          status: string
          uploadedAt: string
          userId: string
        }
        Insert: {
          analysisId?: string | null
          bankName?: string | null
          extractionMetadata?: Json | null
          extractionMethod?: string | null
          filename: string
          fileUrl?: string | null
          formatFingerprint?: string | null
          formatId?: string | null
          id: string
          processedAt?: string | null
          statementType?: string | null
          status?: string
          uploadedAt?: string
          userId: string
        }
        Update: {
          analysisId?: string | null
          bankName?: string | null
          extractionMetadata?: Json | null
          extractionMethod?: string | null
          filename?: string
          fileUrl?: string | null
          formatFingerprint?: string | null
          formatId?: string | null
          id?: string
          processedAt?: string | null
          statementType?: string | null
          status?: string
          uploadedAt?: string
          userId?: string
        }
        Relationships: [
          {
            foreignKeyName: "BankStatement_analysisId_fkey"
            columns: ["analysisId"]
            isOneToOne: false
            referencedRelation: "SpendingAnalysis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "BankStatement_formatId_fkey"
            columns: ["formatId"]
            isOneToOne: false
            referencedRelation: "StatementFormat"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "BankStatement_userId_fkey"
            columns: ["userId"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
        ]
      }
      Category: {
        Row: {
          color: string | null
          createdAt: string
          icon: string | null
          id: string
          isSystem: boolean
          name: string
          parentId: string | null
        }
        Insert: {
          color?: string | null
          createdAt?: string
          icon?: string | null
          id: string
          isSystem?: boolean
          name: string
          parentId?: string | null
        }
        Update: {
          color?: string | null
          createdAt?: string
          icon?: string | null
          id?: string
          isSystem?: boolean
          name?: string
          parentId?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "Category_parentId_fkey"
            columns: ["parentId"]
            isOneToOne: false
            referencedRelation: "Category"
            referencedColumns: ["id"]
          },
        ]
      }
      SpendingAnalysis: {
        Row: {
          createdAt: string
          id: string
          name: string
          status: string
          updatedAt: string
          userId: string
          viewedAt: string | null
        }
        Insert: {
          createdAt?: string
          id: string
          name: string
          status?: string
          updatedAt?: string
          userId: string
          viewedAt?: string | null
        }
        Update: {
          createdAt?: string
          id?: string
          name?: string
          status?: string
          updatedAt?: string
          userId?: string
          viewedAt?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "SpendingAnalysis_userId_fkey"
            columns: ["userId"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
        ]
      }
      StatementFormat: {
        Row: {
          bankName: string
          confidence: number | null
          extractionCode: string | null
          formatDescription: string | null
          formatFingerprint: string
          id: string
          lastUsedAt: string
          learnedAt: string
          patternNotes: string | null
          sampleFirstPage: string | null
          sampleTransactions: Json | null
          statementType: string
          useCount: number
        }
        Insert: {
          bankName: string
          confidence?: number | null
          extractionCode?: string | null
          formatDescription?: string | null
          formatFingerprint: string
          id: string
          lastUsedAt?: string
          learnedAt?: string
          patternNotes?: string | null
          sampleFirstPage?: string | null
          sampleTransactions?: Json | null
          statementType: string
          useCount?: number
        }
        Update: {
          bankName?: string
          confidence?: number | null
          extractionCode?: string | null
          formatDescription?: string | null
          formatFingerprint?: string
          id?: string
          lastUsedAt?: string
          learnedAt?: string
          patternNotes?: string | null
          sampleFirstPage?: string | null
          sampleTransactions?: Json | null
          statementType?: string
          useCount?: number
        }
        Relationships: []
      }
      Transaction: {
        Row: {
          aiConfidence: number | null
          amount: number
          bankStatementId: string | null
          categoryId: string | null
          createdAt: string
          date: string
          description: string
          id: string
          merchant: string | null
          notes: string | null
          originalData: Json | null
          status: Database["public"]["Enums"]["TransactionStatus"] | null
          updatedAt: string
          userId: string
        }
        Insert: {
          aiConfidence?: number | null
          amount: number
          bankStatementId?: string | null
          categoryId?: string | null
          createdAt?: string
          date: string
          description: string
          id: string
          merchant?: string | null
          notes?: string | null
          originalData?: Json | null
          status?: Database["public"]["Enums"]["TransactionStatus"] | null
          updatedAt?: string
          userId: string
        }
        Update: {
          aiConfidence?: number | null
          amount?: number
          bankStatementId?: string | null
          categoryId?: string | null
          createdAt?: string
          date?: string
          description?: string
          id?: string
          merchant?: string | null
          notes?: string | null
          originalData?: Json | null
          status?: Database["public"]["Enums"]["TransactionStatus"] | null
          updatedAt?: string
          userId?: string
        }
        Relationships: [
          {
            foreignKeyName: "Transaction_bankStatementId_fkey"
            columns: ["bankStatementId"]
            isOneToOne: false
            referencedRelation: "BankStatement"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "Transaction_categoryId_fkey"
            columns: ["categoryId"]
            isOneToOne: false
            referencedRelation: "Category"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "Transaction_userId_fkey"
            columns: ["userId"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
        ]
      }
      User: {
        Row: {
          advisorId: string | null
          createdAt: string
          email: string
          emailVerified: boolean
          firstName: string | null
          id: string
          image: string | null
          lastName: string | null
          mfaEnabled: boolean
          mfaSecret: string | null
          passwordHash: string | null
          phone: string | null
          role: Database["public"]["Enums"]["UserRole"]
          status: Database["public"]["Enums"]["UserStatus"]
          updatedAt: string
        }
        Insert: {
          advisorId?: string | null
          createdAt?: string
          email: string
          emailVerified?: boolean
          firstName?: string | null
          id: string
          image?: string | null
          lastName?: string | null
          mfaEnabled?: boolean
          mfaSecret?: string | null
          passwordHash?: string | null
          phone?: string | null
          role?: Database["public"]["Enums"]["UserRole"]
          status?: Database["public"]["Enums"]["UserStatus"]
          updatedAt?: string
        }
        Update: {
          advisorId?: string | null
          createdAt?: string
          email?: string
          emailVerified?: boolean
          firstName?: string | null
          id?: string
          image?: string | null
          lastName?: string | null
          mfaEnabled?: boolean
          mfaSecret?: string | null
          passwordHash?: string | null
          phone?: string | null
          role?: Database["public"]["Enums"]["UserRole"]
          status?: Database["public"]["Enums"]["UserStatus"]
          updatedAt?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      TransactionStatus: "KEEP" | "CANCEL" | "CONSIDER"
      UserRole: "CUSTOMER" | "ADMIN"
      UserStatus: "ACTIVE" | "SUSPENDED" | "INVITED"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never
