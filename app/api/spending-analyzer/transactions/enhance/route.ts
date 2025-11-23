import { NextRequest, NextResponse } from "next/server";
import { authenticateApi, apiResponse, apiError } from "@/lib/api-auth";
import { createClient } from "@/lib/supabase/server";
import OpenAI from "openai";
import { createChatCompletion } from "@/lib/openai-wrapper";
import { logger } from "@/lib/logger";
import { generateId } from "@/lib/db";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    const { user, error: authError } = await authenticateApi(req);
    if (!user) {
      return apiError("Unauthorized", "AUTH_ERROR", 401);
    }

    const { analysisId } = await req.json();

    if (!analysisId) {
      return apiError("analysisId is required", "VALIDATION_ERROR", 400);
    }

    logger.info("Merchant Enhancement", `Re-enhancing transactions for analysis ${analysisId}`, undefined, analysisId);

    const supabase = await createClient();

    // First, get bank statements for this analysis
    const { data: bankStatements, error: bsError } = await supabase
      .from("BankStatement")
      .select("id")
      .eq("analysisId", analysisId);

    if (bsError) {
      logger.error("Merchant Enhancement", "Failed to fetch bank statements", { error: bsError }, analysisId);
      return apiError("Failed to fetch bank statements", "DATABASE_ERROR", 500);
    }

    if (!bankStatements || bankStatements.length === 0) {
      return apiResponse({ message: "No bank statements found", enhanced: 0 });
    }

    const bankStatementIds = bankStatements.map(bs => bs.id);

    // Fetch all transactions for these bank statements BEFORE clearing
    // (so we can preserve the raw merchant text)
    const { data: transactions, error: txnError } = await supabase
      .from("Transaction")
      .select("id, merchant, description, originalData")
      .in("bankStatementId", bankStatementIds);

    if (txnError) {
      logger.error("Merchant Enhancement", "Failed to fetch transactions", { error: txnError }, analysisId);
      return apiError("Failed to fetch transactions", "DATABASE_ERROR", 500);
    }

    if (!transactions || transactions.length === 0) {
      return apiResponse({ message: "No transactions found", enhanced: 0 });
    }

    logger.info("Merchant Enhancement", `Found ${transactions.length} transactions to enhance`, undefined, analysisId);

    // Re-enhance transactions in batches (smaller batches due to more complex prompt with coordinates)
    const batchSize = 10;
    let enhancedCount = 0;

    for (let i = 0; i < transactions.length; i += batchSize) {
      const batch = transactions.slice(i, i + batchSize);

      try {
        const merchantList = batch
          .map((t, idx) => `${idx}: ${t.merchant || t.description}`)
          .join("\n");

        const completion = await createChatCompletion(
          openai,
          {
            model: "gpt-4o-mini",
            messages: [
              {
                role: "system",
                content:
                  "You are a merchant metadata expert. Provide industry type and description for each merchant.",
              },
              {
                role: "user",
                content: `Analyze each merchant transaction and extract detailed information. For merchant names with location codes (e.g., "DOG ED CENTRE 49144 WEST WODONGA"), identify the actual business name and location.

For each merchant, provide:
1. businessName - The actual business/brand name (e.g., "DOG ED CENTRE 49144 WEST WODONGA" → "Dog Education Centre")
2. merchantType - Industry/business type (e.g., "Pet Services/Dog Training", "E-commerce/Retail", "Streaming/Entertainment")
3. location - City and country if identifiable (e.g., "West Wodonga, Australia" or "Sydney, Australia" or "United States")
4. merchantDescription - Detailed description of what they do (e.g., "Provides dog training and education services")
5. category - One of: Groceries, Utilities, Entertainment, Transport, Healthcare, Shopping, Dining, Bills, Income, Transfer, Subscriptions, Insurance, Education, Travel, Pet Services, Other
6. latitude - Approximate latitude of the location (as a number, e.g., -36.1167 for West Wodonga). Use null if location cannot be determined.
7. longitude - Approximate longitude of the location (as a number, e.g., 146.8833 for West Wodonga). Use null if location cannot be determined.

Merchants:
${merchantList}

Return JSON: {"0": {"businessName": "...", "merchantType": "...", "location": "...", "merchantDescription": "...", "category": "...", "latitude": -36.1167, "longitude": 146.8833}, "1": {...}}`,
              },
            ],
            response_format: { type: "json_object" },
            temperature: 0.1,
            max_tokens: 2000,
          },
          "Merchant Metadata Re-Enhancement",
          { sessionId: analysisId, timeout: 30000 }
        );

        const response = completion.choices[0].message.content;
        if (response) {
          const metadata = JSON.parse(response);

          // Update each transaction in the batch
          for (let idx = 0; idx < batch.length; idx++) {
            const txn = batch[idx];
            const data = metadata[idx.toString()];

            if (data) {
              const updatedOriginalData = {
                ...(txn.originalData || {}),
                // Preserve existing rawMerchant, or save current merchant if not set
                rawMerchant: (txn.originalData as any)?.rawMerchant || txn.merchant,
                businessName: data.businessName,
                merchantType: data.merchantType,
                location: data.location,
                merchantDescription: data.merchantDescription,
                latitude: data.latitude,
                longitude: data.longitude,
              };

              // Look up or create category
              let categoryId: string | null = null;
              if (data.category) {
                const { data: existingCategory } = await supabase
                  .from("Category")
                  .select("*")
                  .ilike("name", data.category)
                  .single();

                if (existingCategory) {
                  categoryId = existingCategory.id;
                } else {
                  // Create new category
                  const { data: newCategory, error: catError } = await supabase
                    .from("Category")
                    .insert({
                      id: generateId(),
                      name: data.category,
                      isSystem: false,
                    })
                    .select()
                    .single();

                  if (newCategory && !catError) {
                    categoryId = newCategory.id;
                  }
                }
              }

              const updateData: any = {
                originalData: updatedOriginalData,
              };

              if (categoryId) {
                updateData.categoryId = categoryId;
              }

              // Keep merchant as-is (raw statement text)
              // businessName is stored in originalData for reference

              const { error: updateError } = await supabase
                .from("Transaction")
                .update(updateData)
                .eq("id", txn.id);

              if (!updateError) {
                enhancedCount++;
              } else {
                logger.error(
                  "Merchant Enhancement",
                  `Failed to update transaction ${txn.id}`,
                  { error: updateError },
                  analysisId
                );
              }
            }
          }

          logger.info(
            "Merchant Enhancement",
            `Successfully enhanced batch ${Math.floor(i / batchSize) + 1}`,
            { count: batch.length },
            analysisId
          );
        }
      } catch (error: any) {
        const errorMessage = error?.message || String(error);
        logger.error(
          "Merchant Enhancement",
          `Batch ${Math.floor(i / batchSize) + 1} failed`,
          { error: errorMessage, batchSize: batch.length },
          analysisId
        );
        // Continue with next batch even if this one fails
      }
    }

    logger.info(
      "Merchant Enhancement",
      `Re-enhancement complete`,
      { total: transactions.length, enhanced: enhancedCount },
      analysisId
    );

    return apiResponse({
      message: `Successfully enhanced ${enhancedCount} of ${transactions.length} transactions`,
      enhanced: enhancedCount,
      total: transactions.length,
    });
  } catch (error: any) {
    logger.error("Merchant Enhancement", "Re-enhancement failed", { error: error?.message });
    return apiError(
      error?.message || "Failed to enhance transactions",
      "ENHANCEMENT_ERROR",
      500
    );
  }
}
