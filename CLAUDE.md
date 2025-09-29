# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Trend Advisory Customer Portal - A Next.js 15 financial advisory platform with tools for spending analysis, superannuation calculations, and user management.

## Development Commands

```bash
# Development
npm run dev           # Start Next.js dev server (port 3000)

# Build & Production
npm run build         # Build for production
npm run start         # Start production server
npm run lint          # Run ESLint

# Database (Prisma)
npm run db:push       # Push schema changes to database
npm run db:migrate    # Create and apply migrations
npm run db:studio     # Open Prisma Studio GUI
npm run db:generate   # Generate Prisma Client
npm run db:seed       # Run database seeding
```

## Architecture & Stack

### Core Technologies
- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript 5.x with strict mode
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: NextAuth.js v4 with credentials + OAuth (Google/Facebook)
- **UI Components**: Radix UI primitives + shadcn/ui components
- **Styling**: Tailwind CSS with custom animations
- **State Management**: React Hook Form + Zod validation
- **AI Integration**: OpenAI API for spending analysis

### Project Structure
```
app/                    # Next.js App Router pages and API routes
  ├── api/             # API endpoints organized by feature
  │   ├── admin/       # Admin-only endpoints
  │   ├── auth/        # Authentication (NextAuth + custom)
  │   ├── spending*/   # Spending analyzer endpoints
  │   └── tools/       # Financial tool endpoints
  ├── admin/           # Admin portal pages
  ├── auth/            # Authentication pages (signin/register)
  └── dashboard/       # Customer portal pages
components/            
  ├── ui/              # Reusable UI components (shadcn/ui based)
  └── providers/       # Context providers (theme, auth)
lib/                   # Utility functions and configurations
  ├── auth.ts          # NextAuth configuration
  ├── prisma.ts        # Prisma client singleton
  └── api-auth.ts      # API authentication utilities
prisma/
  ├── schema.prisma    # Database schema
  └── seed.ts          # Database seeding script
```

### Key Architectural Patterns

1. **Authentication Flow**:
   - NextAuth handles session management with JWT strategy
   - Custom credentials provider validates against Prisma database
   - OAuth providers (Google/Facebook) conditionally loaded based on env vars
   - API routes verify auth using `lib/api-auth.ts` utilities

2. **Database Access**:
   - All database operations through Prisma Client
   - Singleton pattern in `lib/prisma.ts` prevents connection exhaustion
   - Complex relations: Users ↔ Groups ↔ Tools with permission layers

3. **API Structure**:
   - RESTful endpoints under `/api`
   - Role-based access control (ADMIN/CUSTOMER)
   - Standard error handling with typed responses
   - Rate limiting considerations in design

4. **Component Architecture**:
   - Radix UI provides unstyled, accessible primitives
   - shadcn/ui components wrap Radix with Tailwind styling
   - Client components marked with "use client" directive
   - Server components default for data fetching

5. **Financial Tools**:
   - Modular tool system with database-driven permissions
   - Spending Analyzer: File upload → AI categorization → Manual review
   - Superannuation Calculator: Multi-parameter projections
   - Tools accessed via group memberships or individual permissions

### Environment Configuration

Required environment variables:
```
DATABASE_URL            # PostgreSQL connection string
NEXTAUTH_SECRET         # Random string for JWT signing
NEXTAUTH_URL           # Application URL

# Optional OAuth
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
FACEBOOK_CLIENT_ID
FACEBOOK_CLIENT_SECRET

# Optional AI
OPENAI_API_KEY         # For spending analysis
```

### Common Development Tasks

**Adding a new API endpoint**:
1. Create route file in `app/api/[feature]/route.ts`
2. Use `lib/api-auth.ts` for authentication
3. Access database via `prisma` from `lib/prisma.ts`
4. Follow existing error handling patterns

**Creating new UI components**:
1. Check if shadcn/ui has the component: `npx shadcn-ui@latest add [component]`
2. Otherwise create in `components/ui/` following existing patterns
3. Use Radix UI primitives for complex interactions
4. Apply Tailwind classes consistently with design system

**Database schema changes**:
1. Modify `prisma/schema.prisma`
2. Run `npm run db:migrate` to create migration
3. Update seed script if needed
4. Regenerate client with `npm run db:generate`

**Working with the Spending Analyzer**:
- Upload endpoint processes CSV/PDF files
- Transactions stored with AI confidence scores
- Categories system supports hierarchical structure
- Status tracking: KEEP/CANCEL/CONSIDER for recommendations