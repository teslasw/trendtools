/**
 * Database client using Supabase Data API
 * This replaces Prisma for all database operations
 */
import { createClient } from './supabase/server'
import type { Database } from './supabase/database.types'

export type { Database, Tables, TablesInsert, TablesUpdate } from './supabase/database.types'

/**
 * Get authenticated Supabase client for database operations
 * Use this in API routes and server components
 */
export async function getDb() {
  return await createClient()
}

/**
 * Helper to generate CUIDs (compatible with Prisma's default)
 */
export function generateId(): string {
  // Simple CUID-like generator (use a proper library in production)
  const timestamp = Date.now().toString(36)
  const randomStr = Math.random().toString(36).substring(2, 15)
  return `c${timestamp}${randomStr}`
}
