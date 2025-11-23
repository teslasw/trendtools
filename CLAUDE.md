# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Trend Advisory Customer Portal - A Next.js 15 financial advisory platform with tools for spending analysis, superannuation calculations, and user management.

## Development Commands

```bash
# Development
npm run dev           # Start Next.js dev server (port 3003 by default)

# Build & Production
npm run build         # Build for production
npm run start         # Start production server
npm run lint          # Run ESLint

# Database (Supabase)
# Database managed through Supabase Dashboard
# Schema synced with prisma/schema.prisma for reference
```

## Architecture & Stack

### Core Technologies
- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript 5.x with strict mode
- **Database**: PostgreSQL via Supabase Data API
- **Authentication**: Supabase Auth
- **UI Components**: Radix UI primitives + shadcn/ui components
- **Styling**: Tailwind CSS with custom animations
- **State Management**: React Hook Form + Zod validation
- **AI Integration**: OpenAI API for spending analysis

### Project Structure
```
app/                    # Next.js App Router pages and API routes
  ├── api/             # API endpoints organized by feature
  │   ├── admin/       # Admin-only endpoints
  │   ├── auth/        # Authentication endpoints
  │   ├── spending-analyzer/  # Spending analyzer endpoints
  │   ├── statement-format/   # Statement format learning
  │   └── tools/       # Financial tool endpoints
  ├── admin/           # Admin portal pages
  ├── auth/            # Authentication pages (signin/register/callback)
  └── dashboard/       # Customer portal pages
components/
  ├── ui/              # Reusable UI components (shadcn/ui based)
  └── providers/       # Context providers (theme, auth)
lib/                   # Utility functions and configurations
  ├── api-auth.ts      # API authentication utilities (JWT + Supabase)
  ├── db.ts            # Supabase database client wrapper
  ├── supabase/        # Supabase client utilities and types
  │   ├── server.ts    # Server-side Supabase client
  │   ├── client.ts    # Browser-side Supabase client
  │   └── database.types.ts  # Auto-generated TypeScript types
  ├── hooks/           # React hooks
  └── n8n-client.ts    # N8N workflow integration
prisma/
  ├── schema.prisma    # Database schema (reference only)
  └── seed.ts          # Database seeding script
```

### Key Architectural Patterns

1. **Authentication Flow**:
   - Supabase Auth handles session management with cookie-based authentication
   - API routes use dual authentication: Supabase Auth (web) + JWT tokens (mobile/API)
   - `lib/api-auth.ts` provides `authenticateApi()` helper for API routes
   - Middleware in `middleware.ts` protects dashboard and admin routes
   - Role-based access control (ADMIN/CUSTOMER) enforced at both middleware and API level

2. **Database Access**:
   - All database operations through Supabase Data API
   - Client wrapper in `lib/db.ts` provides `getDb()` and `generateId()` helpers
   - TypeScript types auto-generated in `lib/supabase/database.types.ts`
   - Complex relations: Users ↔ Groups ↔ Tools with permission layers
   - Key tables: User, Group, Tool, Category, Transaction, BankStatement, SpendingAnalysis
   - Advanced features: Statement format learning (StatementFormat table) for AI-powered extraction optimization
   - Query pattern: `db.from("Table").select().eq("column", value).single()`

3. **API Structure**:
   - RESTful endpoints under `/api`
   - Authentication via `authenticateApi()` from `lib/api-auth.ts`
   - Standard error handling with `apiError()` and `apiResponse()` helpers
   - Rate limiting available via `checkRateLimit()` utility
   - Typical pattern:
     ```typescript
     const { user, error } = await authenticateApi(request);
     if (!user) return apiError("Unauthorized", "AUTH_ERROR", 401);
     ```

4. **Component Architecture**:
   - Radix UI provides unstyled, accessible primitives
   - shadcn/ui components wrap Radix with Tailwind styling
   - Client components marked with "use client" directive
   - Server components default for data fetching
   - Path aliasing: `@/*` maps to project root

5. **Financial Tools**:
   - Modular tool system with database-driven permissions via Group/UserToolAccess
   - **Spending Analyzer**:
     - File upload (CSV/PDF) → AI-powered transaction extraction
     - Intelligent statement format learning (saves extraction code to avoid repeated AI calls)
     - Transaction categorization with confidence scores
     - Status tracking: KEEP/CANCEL/CONSIDER for recommendations
   - **Age Pension Calculator**: Multi-scenario planning with asset/income tests
   - **Super Calculator**: Superannuation projections
   - **Budget Builder**: Flexible budgeting with multiple frequencies
   - Tools accessed via group memberships or individual UserToolAccess permissions

6. **AI Integration**:
   - OpenAI integration for transaction categorization and extraction
   - Statement format learning: First upload uses AI to generate extraction code, subsequent uploads of same format use saved code (no AI needed)
   - Transaction categorization with confidence scores stored in `aiConfidence` field
   - Spending insights generation (patterns, subscriptions, savings opportunities)

### Environment Configuration

Required environment variables:
```
# Supabase (Database & Auth)
NEXT_PUBLIC_SUPABASE_URL       # Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY  # Supabase anon/public key
SUPABASE_SERVICE_ROLE_KEY      # Supabase service role key (server-side only)

# JWT (for mobile/API access)
JWT_SECRET                     # Secret for JWT token signing

# Optional AI
OPENAI_API_KEY                 # For spending analysis features
```

### Common Development Tasks

**Adding a new API endpoint**:
1. Create route file in `app/api/[feature]/route.ts`
2. Use `authenticateApi()` from `lib/api-auth.ts` for authentication
3. Access database via `getDb()` from `lib/db.ts`
4. Return responses using `NextResponse.json()`
5. Example pattern:
   ```typescript
   import { NextRequest, NextResponse } from "next/server";
   import { getDb, generateId } from "@/lib/db";

   export async function GET(req: NextRequest) {
     const db = await getDb();
     const { data: { user }, error } = await db.auth.getUser();

     if (error || !user) {
       return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
     }

     const { data: records } = await db
       .from("TableName")
       .select("*")
       .eq("userId", user.id);

     return NextResponse.json(records || []);
   }
   ```

**Creating new UI components**:
1. Check if shadcn/ui has the component: `npx shadcn-ui@latest add [component]`
2. Otherwise create in `components/ui/` following existing patterns
3. Use Radix UI primitives for complex interactions
4. Apply Tailwind classes consistently with design system
5. Use `@/` path alias for imports

**Database schema changes**:
1. Make changes via Supabase Dashboard or SQL migrations
2. Update `prisma/schema.prisma` for reference/documentation
3. Regenerate TypeScript types using Supabase MCP tool: `mcp__supabase__generate_typescript_types`
4. Update `lib/supabase/database.types.ts` with generated types

**Working with the Spending Analyzer**:
- Upload endpoint: `app/api/spending-analyzer/upload/route.ts`
- Supports CSV and PDF bank statements
- Statement format fingerprinting: First page hash identifies format
- If format recognized, uses saved extraction code; otherwise uses AI to learn and save new format
- Transactions stored with AI confidence scores
- Categories support hierarchical structure (Category.parentId)
- Status tracking: TransactionStatus enum (KEEP/CANCEL/CONSIDER)
- SpendingAnalysis model links to multiple BankStatements and SpendingInsights
