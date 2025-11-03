# Supabase Realtime Setup Guide

This guide explains how to set up Supabase Realtime for the Spending Analyzer sessions dashboard to get instant updates without polling.

## Features

- **Real-time Updates**: Sessions dashboard updates instantly when analysis status changes
- **Optimistic UI**: Users see "Analysing..." → "Ready" → "Viewed" status changes in real-time
- **Fallback Mechanism**: If Supabase is not configured, the app automatically falls back to polling every 5 seconds
- **Bandwidth Efficient**: Only receives updates for changed records, not full table scans

## Option 1: Use Existing PostgreSQL with Supabase (Recommended)

You can connect Supabase to your existing PostgreSQL database and use it ONLY for Realtime features while keeping Prisma for all database operations.

### Step 1: Create Supabase Project

1. Go to [https://supabase.com](https://supabase.com) and create a free account
2. Click "New Project"
3. Enter project details (name, password, region)
4. Wait for project to be provisioned (~2 minutes)

### Step 2: Connect to Your Existing Database

1. In Supabase dashboard, go to **Database** → **Settings**
2. Find your default Supabase connection string (we'll replace this)
3. Go to **Settings** → **Database Settings**
4. Under "Connection Pooling", enable **Use connection pooler**
5. Click **Change connection string** (if available in your plan)

**OR**

Use Supabase as a separate service just for Realtime:
1. Keep your current PostgreSQL database for Prisma
2. Use Supabase's built-in database only for Realtime subscriptions
3. In this case, you'll need to sync the `SpendingAnalysis` table to both databases

### Step 3: Enable Realtime for SpendingAnalysis Table

1. In Supabase dashboard, go to **Database** → **Replication**
2. Find the `SpendingAnalysis` table
3. Toggle **Realtime** to ON
4. This enables real-time updates for this table

### Step 4: Get API Keys

1. Go to **Settings** → **API**
2. Copy the following:
   - **Project URL** (looks like `https://xxxxx.supabase.co`)
   - **anon/public** key (long string starting with `eyJ...`)

### Step 5: Add to Environment Variables

Add these to your `.env` file:

```bash
# Supabase Realtime
NEXT_PUBLIC_SUPABASE_URL="https://xxxxx.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### Step 6: Restart Your Dev Server

```bash
npm run dev
```

## Option 2: Migrate Fully to Supabase (Optional)

If you want to use Supabase as your primary database:

### Step 1: Export Your Current Schema

```bash
pg_dump -U mal -d trend_advisory --schema-only > schema.sql
```

### Step 2: Import to Supabase

1. In Supabase dashboard, go to **SQL Editor**
2. Paste your schema from `schema.sql`
3. Run the query

### Step 3: Migrate Data

```bash
pg_dump -U mal -d trend_advisory --data-only > data.sql
```

Then import data.sql via Supabase SQL Editor.

### Step 4: Update DATABASE_URL

Replace your current PostgreSQL connection string with Supabase's:

```bash
DATABASE_URL="postgresql://postgres:your-password@db.xxxxx.supabase.co:5432/postgres"
```

### Step 5: Enable Realtime

Follow Step 3 from Option 1 above.

## How It Works

The SessionsDashboard component (`/app/dashboard/tools/spending-analyzer/components/SessionsDashboard.tsx`) automatically:

1. **Checks for Supabase config** - If `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set
2. **Subscribes to changes** - Listens to INSERT, UPDATE, DELETE events on `SpendingAnalysis` table
3. **Updates UI instantly** - When a session's status changes from "processing" → "completed", the UI updates immediately
4. **Falls back to polling** - If Supabase is not configured, polls every 5 seconds

### Database Migration

The `viewedAt` field has been added to the `SpendingAnalysis` model in Prisma:

```prisma
model SpendingAnalysis {
  id            String   @id @default(cuid())
  userId        String
  name          String
  status        String   @default("processing")
  viewedAt      DateTime? // Track when user first views completed analysis
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  user          User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  statements    BankStatement[]
  insights      SpendingInsight[]
}
```

To apply this migration:

```bash
npx prisma migrate dev --name add_viewed_at_to_spending_analysis
```

**Note**: You'll need to fix your database credentials first. The current password `password123` is not working.

## API Endpoints

### Mark Session as Viewed

```
POST /api/spending-analyzer/sessions/[id]/view
```

This endpoint is automatically called when a user views a session for the first time. It sets the `viewedAt` timestamp.

## Troubleshooting

### 1. Realtime not working

- Check browser console for connection errors
- Verify API keys are correct
- Ensure Realtime is enabled for the table in Supabase dashboard
- Check that the table name matches exactly: `SpendingAnalysis` (case-sensitive)

### 2. Falling back to polling

If you see this in the console:
```
[Realtime] Supabase not configured, falling back to polling
```

This means the environment variables are not set. The app will work fine, just with 5-second polling instead of instant updates.

### 3. Database schema mismatch

If your Supabase database doesn't have the same schema as your local PostgreSQL:
- Run the Prisma migration on both databases
- Or use Option 1 (keep them separate) and only use Supabase for Realtime

## Cost Considerations

- **Supabase Free Tier**: 500MB database, 2GB bandwidth, unlimited Realtime connections
- **Polling Fallback**: Uses ~12 requests/minute per user (720/hour) - suitable for testing but not production
- **Realtime**: Uses 1 connection per user, minimal bandwidth

## Benefits of Realtime vs Polling

| Feature | Realtime (Supabase) | Polling (Fallback) |
|---------|--------------------|--------------------|
| Update latency | Instant (<100ms) | 0-5 seconds |
| Server requests | 1 connection | 12/minute per user |
| Bandwidth | Minimal (only changes) | Full API response every 5s |
| Scalability | Excellent | Limited |
| User experience | Best | Good |

## Next Steps

1. ✅ Install Supabase client library
2. ✅ Create Realtime subscription component
3. ✅ Add API endpoint for marking sessions as viewed
4. ✅ Integrate SessionsDashboard into main page
5. ⏳ Fix database credentials and run migration
6. ⏳ Set up Supabase project and add credentials to `.env`
7. ⏳ Test real-time updates

Once you've added the Supabase credentials to your `.env` file, the sessions dashboard will automatically start using Realtime updates!
