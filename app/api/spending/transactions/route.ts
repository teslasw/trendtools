import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateApi, apiResponse, apiError } from "@/lib/api-auth";
import { z } from "zod";

const querySchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  categoryId: z.string().optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(50),
});

// GET /api/spending/transactions - Get user transactions
export async function GET(request: NextRequest) {
  const { user, error } = await authenticateApi(request);

  if (!user) {
    return apiError(error || "Authentication required", "AUTH_REQUIRED", 401);
  }

  try {
    const { searchParams } = new URL(request.url);
    const params = {
      startDate: searchParams.get("startDate") || undefined,
      endDate: searchParams.get("endDate") || undefined,
      categoryId: searchParams.get("categoryId") || undefined,
      page: searchParams.get("page") || "1",
      limit: searchParams.get("limit") || "50",
    };

    const validation = querySchema.safeParse(params);
    if (!validation.success) {
      return apiError("Invalid query parameters", "VALIDATION_ERROR", 400, validation.error.errors);
    }

    const { startDate, endDate, categoryId, page, limit } = validation.data;

    // Build where clause
    const where: any = {
      userId: user.id,
    };

    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate);
      if (endDate) where.date.lte = new Date(endDate);
    }

    if (categoryId) {
      where.categoryId = categoryId;
    }

    // Get total count
    const total = await prisma.transaction.count({ where });

    // Get transactions
    const transactions = await prisma.transaction.findMany({
      where,
      include: {
        category: {
          select: {
            id: true,
            name: true,
            icon: true,
            color: true,
          },
        },
      },
      orderBy: { date: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    });

    return apiResponse({
      transactions: transactions.map(t => ({
        id: t.id,
        date: t.date,
        description: t.description,
        amount: t.amount.toNumber(),
        category: t.category ? {
          id: t.category.id,
          name: t.category.name,
          icon: t.category.icon,
          color: t.category.color,
        } : null,
        merchant: t.merchant,
        notes: t.notes,
      })),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Transactions fetch error:", error);
    return apiError("Failed to fetch transactions", "SERVER_ERROR", 500);
  }
}

// POST /api/spending/transactions - Create a new transaction
const createTransactionSchema = z.object({
  date: z.string(),
  description: z.string().min(1),
  amount: z.number(),
  categoryId: z.string().optional(),
  merchant: z.string().optional(),
  notes: z.string().optional(),
});

export async function POST(request: NextRequest) {
  const { user, error } = await authenticateApi(request);

  if (!user) {
    return apiError(error || "Authentication required", "AUTH_REQUIRED", 401);
  }

  try {
    const body = await request.json();

    const validation = createTransactionSchema.safeParse(body);
    if (!validation.success) {
      return apiError("Invalid transaction data", "VALIDATION_ERROR", 400, validation.error.errors);
    }

    const data = validation.data;

    // Create transaction
    const transaction = await prisma.transaction.create({
      data: {
        userId: user.id,
        date: new Date(data.date),
        description: data.description,
        amount: data.amount,
        categoryId: data.categoryId,
        merchant: data.merchant,
        notes: data.notes,
      },
      include: {
        category: true,
      },
    });

    return apiResponse({
      message: "Transaction created successfully",
      transaction: {
        id: transaction.id,
        date: transaction.date,
        description: transaction.description,
        amount: transaction.amount.toNumber(),
        category: transaction.category,
        merchant: transaction.merchant,
        notes: transaction.notes,
      },
    }, 201);
  } catch (error) {
    console.error("Transaction creation error:", error);
    return apiError("Failed to create transaction", "SERVER_ERROR", 500);
  }
}