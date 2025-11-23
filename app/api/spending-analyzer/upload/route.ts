import { NextRequest, NextResponse } from "next/server";
import { parse } from "papaparse";
import OpenAI from "openai";
import { createClient } from "@/lib/supabase/server";
import { getDb, generateId } from "@/lib/db";
import { logger } from "@/lib/logger";
import { createChatCompletion } from "@/lib/openai-wrapper";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    console.log("[Upload API] Request received");

    // Check authentication with Supabase
    const supabase = await createClient();
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

    if (authError || !authUser) {
      console.error("[Upload API] Auth error:", authError);
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = await getDb();
    const { data: user, error: userError } = await db
      .from("User")
      .select("*")
      .eq("id", authUser.id)
      .single();

    if (userError || !user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const formData = await req.formData();
    const files = formData.getAll("files") as File[];
    const analysisName = formData.get("analysisName") as string;

    console.log(`[Upload API] Received ${files.length} files for analysis: ${analysisName}`);

    if (!files.length) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 });
    }

    const allTransactions: any[] = [];

    for (const file of files) {
      const fileName = file.name.toLowerCase();
      const buffer = Buffer.from(await file.arrayBuffer());

      console.log(`[Processing] ${file.name} (${file.size} bytes)`);

      let transactions = [];

      if (fileName.endsWith(".csv")) {
        // Parse CSV files
        transactions = await parseCSV(buffer);
      } else if (fileName.endsWith(".pdf")) {
        // Parse PDF files using smart format learning
        const result = await parsePDFWithVision(buffer, file.name);
        transactions = result.transactions;
        // Store extraction metadata for this file
        (file as any).extractionMetadata = {
          bankName: result.bankName,
          statementType: result.statementType,
          extractionMethod: result.extractionMethod,
          transactionCount: result.transactions.length,
          formatId: result.formatId,
          formatFingerprint: result.formatFingerprint,
        };
      } else if (fileName.match(/\.(png|jpg|jpeg|gif|webp)$/)) {
        // Parse screenshots/images using Vision
        transactions = await parseImageWithVision(buffer, file.name);
      } else if (fileName.endsWith(".ofx") || fileName.endsWith(".qif")) {
        // Parse OFX/QIF files
        transactions = await parseOFXQIF(buffer);
      } else {
        console.log(`[Warning] Unsupported file type: ${file.name}`);
      }

      allTransactions.push(...transactions);
    }

    // Create analysis session
    const analysisId = generateId();

    // Save analysis to database
    const { data: analysis, error: analysisError } = await db
      .from("SpendingAnalysis")
      .insert({
        id: analysisId,
        userId: user.id,
        name: analysisName,
        status: "processing",
      })
      .select()
      .single();

    if (analysisError || !analysis) {
      console.error("[Upload API] Failed to create analysis:", analysisError);
      return NextResponse.json({ error: "Failed to create analysis" }, { status: 500 });
    }

    // Create bank statement record for each file
    let bankStatementId: string | null = null;
    if (files.length > 0) {
      // Get extraction metadata from the first file (if it's a PDF)
      const firstFile = files[0] as any;
      const metadata = firstFile.extractionMetadata;

      const { data: bankStatement, error: bankStatementError } = await db
        .from("BankStatement")
        .insert({
          id: generateId(),
          userId: user.id,
          analysisId: analysisId,
          filename: files.map(f => f.name).join(", "),
          status: "processing",
          bankName: metadata?.bankName,
          statementType: metadata?.statementType,
          extractionMethod: metadata?.extractionMethod,
          formatFingerprint: metadata?.formatFingerprint,
          formatId: metadata?.formatId,
          extractionMetadata: metadata ? {
            transactionCount: metadata.transactionCount,
            processedAt: new Date().toISOString(),
          } : null,
        })
        .select()
        .single();

      if (bankStatementError || !bankStatement) {
        console.error("[Upload API] Failed to create bank statement:", bankStatementError);
        return NextResponse.json({ error: "Failed to create bank statement" }, { status: 500 });
      }

      bankStatementId = bankStatement.id;

      console.log(`[Upload API] Bank: ${metadata?.bankName || 'Unknown'}, Method: ${metadata?.extractionMethod || 'N/A'}${metadata?.formatId ? ' (using learned format)' : ''}`);
    }

    // Save transactions to database
    if (allTransactions.length > 0 && bankStatementId) {
      // Extract unique categories and create them if they don't exist
      const uniqueCategories = [...new Set(allTransactions.map(txn => txn.category).filter(Boolean))];
      const categoryMap = new Map<string, string>(); // category name -> category ID

      for (const categoryName of uniqueCategories) {
        const { data: existing, error: categoryFindError } = await db
          .from("Category")
          .select("*")
          .eq("name", categoryName)
          .single();

        if (existing && !categoryFindError) {
          categoryMap.set(categoryName, existing.id);
        } else {
          const { data: newCategory, error: categoryCreateError } = await db
            .from("Category")
            .insert({
              id: generateId(),
              name: categoryName,
              isSystem: false,
            })
            .select()
            .single();

          if (!categoryCreateError && newCategory) {
            categoryMap.set(categoryName, newCategory.id);
            console.log(`[Category] Created new category: ${categoryName}`);
          }
        }
      }

      // Prepare transaction data for bulk insert
      const transactionData = allTransactions.map((txn) => ({
        id: generateId(),
        userId: user.id,
        bankStatementId: bankStatementId!,
        date: new Date(txn.date).toISOString(),
        description: txn.description || "",
        merchant: txn.merchant || "",
        amount: txn.amount,
        status: "CONSIDER" as const,
        categoryId: txn.category ? categoryMap.get(txn.category) : null,
        originalData: {
          merchantType: txn.merchantType,
          merchantDescription: txn.merchantDescription,
          rawDescription: txn.description,
        },
      }));

      // Bulk create transactions
      const { error: transactionError } = await db
        .from("Transaction")
        .insert(transactionData);

      if (transactionError) {
        console.error("[Upload API] Failed to insert transactions:", transactionError);
        return NextResponse.json({ error: "Failed to save transactions" }, { status: 500 });
      }

      console.log(`[Upload API] Saved ${allTransactions.length} transactions with ${uniqueCategories.length} categories`);

      // Update status
      const { error: analysisUpdateError } = await db
        .from("SpendingAnalysis")
        .update({ status: "completed" })
        .eq("id", analysisId);

      if (analysisUpdateError) {
        console.error("[Upload API] Failed to update analysis status:", analysisUpdateError);
      }

      const { error: statementUpdateError } = await db
        .from("BankStatement")
        .update({
          status: "completed",
          processedAt: new Date().toISOString(),
        })
        .eq("id", bankStatementId);

      if (statementUpdateError) {
        console.error("[Upload API] Failed to update bank statement status:", statementUpdateError);
      }
    }

    const response = {
      analysisId: analysisId,
      transactionCount: allTransactions.length,
      filesProcessed: files.length,
      status: "success",
      message: `Successfully processed ${files.length} file(s) with ${allTransactions.length} transactions`,
      transactions: allTransactions.slice(0, 10), // Return first 10 for preview
    };

    console.log("[Upload API] Complete:", response.message);

    return NextResponse.json(response);
  } catch (error) {
    console.error("[Upload API] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to process files" },
      { status: 500 }
    );
  }
}

async function parseCSV(buffer: Buffer): Promise<any[]> {
  const text = buffer.toString("utf-8");
  const result = parse(text, {
    header: true,
    skipEmptyLines: true,
  });

  console.log(`[CSV Parser] Found ${result.data.length} rows`);

  if (result.data.length > 0) {
    // Send to OpenAI for intelligent parsing
    console.log(`[OpenAI] Sending CSV data for AI parsing...`);

    try {
      return await parseWithOpenAI(result.data);
    } catch (aiError) {
      console.error("[OpenAI] Error:", aiError);
      // Fallback to basic parsing if AI fails
      return basicParse(result.data);
    }
  }

  return [];
}

// Create a fingerprint from the first page of a PDF
function createStatementFingerprint(pdfText: string): string {
  // Take first 2000 chars (roughly first page) and create a hash
  // Remove dates and amounts to make fingerprint stable across different statement periods
  const firstPage = pdfText.substring(0, 2000);

  // Remove common variable parts that change between statements
  const normalized = firstPage
    .replace(/\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/g, 'DATE') // Remove dates
    .replace(/\$?[\d,]+\.\d{2}/g, 'AMOUNT') // Remove amounts
    .replace(/\d{4,}/g, 'NUMBER') // Remove long numbers (account numbers, etc.)
    .replace(/\s+/g, ' ') // Normalize whitespace
    .toLowerCase()
    .trim();

  // Create a simple hash (we'll use the first 500 chars as fingerprint)
  return Buffer.from(normalized.substring(0, 500)).toString('base64');
}

// Detect bank from PDF content
function detectBank(pdfText: string): { bank: string; statementType: string } {
  const textLower = pdfText.toLowerCase();
  const first1000 = pdfText.substring(0, 1000).toLowerCase();

  // American Express
  if (first1000.includes('american express') || first1000.includes('amex')) {
    return { bank: 'American Express', statementType: 'credit_card' };
  }

  // Commonwealth Bank
  if (first1000.includes('commonwealth bank') || first1000.includes('commbank')) {
    return { bank: 'Commonwealth Bank', statementType: 'transaction' };
  }

  // NAB
  if (first1000.includes('national australia bank') || first1000.includes('nab')) {
    return { bank: 'NAB', statementType: 'transaction' };
  }

  // Westpac
  if (first1000.includes('westpac')) {
    return { bank: 'Westpac', statementType: 'transaction' };
  }

  // ANZ
  if (first1000.includes('anz bank') || first1000.includes('australia and new zealand banking')) {
    return { bank: 'ANZ', statementType: 'transaction' };
  }

  // ING
  if (first1000.includes('ing bank') || first1000.includes('ing direct')) {
    return { bank: 'ING', statementType: 'transaction' };
  }

  // Macquarie
  if (first1000.includes('macquarie bank')) {
    return { bank: 'Macquarie', statementType: 'transaction' };
  }

  // Bank of Melbourne
  if (first1000.includes('bank of melbourne')) {
    return { bank: 'Bank of Melbourne', statementType: 'transaction' };
  }

  // St.George
  if (first1000.includes('st.george') || first1000.includes('st george')) {
    return { bank: 'St.George', statementType: 'transaction' };
  }

  return { bank: 'Unknown', statementType: 'unknown' };
}

async function parsePDFWithVision(buffer: Buffer, fileName: string): Promise<{
  transactions: any[];
  bankName: string;
  statementType: string;
  extractionMethod: string;
  formatId?: string;
  formatFingerprint?: string;
}> {
  console.log(`[PDF Parser] Processing PDF: ${fileName}`);

  try {
    // Dynamically import pdf-parse to avoid webpack bundling issues
    const pdfParse = (await import('pdf-parse')).default;

    // Extract text from PDF
    const pdfData = await pdfParse(buffer);
    const pdfText = pdfData.text;

    console.log(`[PDF Parser] Extracted ${pdfText.length} characters of text from PDF`);

    // Detect bank
    const { bank, statementType } = detectBank(pdfText);
    console.log(`[PDF Parser] Detected bank: ${bank} (${statementType})`);

    // Create fingerprint from first page
    const fingerprint = createStatementFingerprint(pdfText);
    console.log(`[PDF Parser] Statement fingerprint: ${fingerprint.substring(0, 50)}...`);

    // Check if we have a learned format for this fingerprint
    console.log(`[PDF Parser] Checking database for cached format...`);
    const db = await getDb();
    const { data: cachedFormat, error: formatError } = await db
      .from("StatementFormat")
      .select("id, extractionCode, formatDescription, bankName, statementType")
      .eq("formatFingerprint", fingerprint)
      .single();

    // If no format found, cachedFormat will be null (not an error)
    const hasCachedFormat = cachedFormat && !formatError;

    let transactions: any[] = [];
    let extractionMethod = '';
    let formatId: string | undefined;

    if (hasCachedFormat && cachedFormat?.extractionCode) {
      // Use cached extraction code (NO AI cost!)
      console.log(`[PDF Parser] ✓ Using cached extraction code (NO AI cost!)`);
      console.log(`[PDF Parser] Format: ${cachedFormat.formatDescription}`);

      // Update usage stats - get current count and increment manually
      const { data: currentFormat } = await db
        .from("StatementFormat")
        .select("useCount")
        .eq("id", cachedFormat.id)
        .single();

      const { error: updateError } = await db
        .from("StatementFormat")
        .update({
          lastUsedAt: new Date().toISOString(),
          useCount: (currentFormat?.useCount || 0) + 1,
        })
        .eq("id", cachedFormat.id);

      if (updateError) {
        console.error("[PDF Parser] Failed to update usage stats:", updateError);
      }

      // Execute the code locally
      transactions = await extractTransactionsWithCode(
        pdfText,
        cachedFormat.extractionCode,
        bank,
        statementType
      );

      extractionMethod = 'cached_code';
      formatId = cachedFormat.id;

      console.log(`[PDF Parser] ✓ Extracted ${transactions.length} transactions using cached code`);
    } else {
      // Learn new format with OpenAI
      console.log(`[PDF Parser] No cached format found. Learning with OpenAI...`);

      const learnResult = await learnFormatWithOpenAI(
        pdfText,
        bank,
        statementType,
        fingerprint
      );

      if (learnResult.success && learnResult.transactions.length > 0) {
        transactions = learnResult.transactions;
        extractionMethod = learnResult.extractionCode ? 'openai_learned_code' : 'openai_direct';

        // Save the learned format for future use
        if (learnResult.extractionCode) {
          const newFormatId = generateId();
          const { data: savedFormat, error: saveError } = await db
            .from("StatementFormat")
            .insert({
              id: newFormatId,
              bankName: bank,
              statementType: statementType,
              formatFingerprint: fingerprint,
              extractionCode: learnResult.extractionCode,
              formatDescription: learnResult.formatDescription || `${bank} ${statementType}`,
              sampleFirstPage: pdfText.substring(0, 2000),
              sampleTransactions: learnResult.transactions.slice(0, 5),
              confidence: learnResult.confidence || 0.8,
              learnedAt: new Date().toISOString(),
              lastUsedAt: new Date().toISOString(),
              useCount: 1,
            })
            .select()
            .single();

          if (!saveError && savedFormat) {
            formatId = savedFormat.id;
            console.log(`[PDF Parser] ✓ Saved extraction code for future use (format ID: ${savedFormat.id})`);
          } else {
            console.error("[PDF Parser] Failed to save format:", saveError);
          }
        }

        console.log(`[PDF Parser] ✓ Extracted ${transactions.length} transactions with OpenAI`);
      }
    }

    // If we got transactions, enhance and return
    if (transactions.length > 0) {
      // Enhance with merchant cache
      const enhanced = await enhanceTransactionsWithAI(transactions);

      return {
        transactions: enhanced,
        bankName: bank,
        statementType,
        extractionMethod,
        formatId,
        formatFingerprint: fingerprint,
      };
    }

    // OpenAI failed or returned 0 transactions - fallback to pattern matcher
    console.log(`[PDF Parser] OpenAI extraction failed, trying universal pattern matcher...`);
    const patternTransactions = parsePDFWithPatterns(pdfText);

    if (patternTransactions.length > 0) {
      console.log(`[PDF Parser] ✓ Pattern matcher extracted ${patternTransactions.length} transactions`);

      const enhanced = await enhanceTransactionsWithAI(patternTransactions);

      return {
        transactions: enhanced,
        bankName: bank,
        statementType,
        extractionMethod: 'pattern_fallback',
        formatFingerprint: fingerprint,
      };
    }

    // Last resort: Direct AI extraction (this should rarely happen with n8n)
    console.log(`[PDF Parser] ⚠ All methods failed, using direct OpenAI as last resort...`);
    const aiResult = await extractTransactionsWithAI(pdfText);

    if (aiResult.transactions.length > 0) {
      console.log(`[PDF Parser] ✓ Extracted ${aiResult.transactions.length} transactions with direct AI`);

      const enhanced = await enhanceTransactionsWithAI(aiResult.transactions);

      return {
        transactions: enhanced,
        bankName: bank,
        statementType,
        extractionMethod: 'direct_ai_fallback',
        formatFingerprint: fingerprint,
      };
    }

    return {
      transactions: [],
      bankName: bank,
      statementType,
      extractionMethod: 'failed',
      formatFingerprint: fingerprint,
    };
  } catch (error) {
    console.error("[PDF Parser] Error processing PDF:", error);
    return {
      transactions: [],
      bankName: 'Unknown',
      statementType: 'unknown',
      extractionMethod: 'failed',
    };
  }
}

function parsePDFWithPatterns(text: string): any[] {
  const transactions: any[] = [];
  const lines = text.split('\n');

  // Smart universal approach: Handle both single-line AND multi-line formats
  // Step 1: Find all date patterns (could be month names or numeric dates)
  const datePatterns = [
    /^(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2})\s+/i, // "August 22"
    /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/,  // DD/MM/YYYY or MM/DD/YYYY
    /(\d{1,2}[\/\-]\d{1,2})/,                // DD/MM or MM/DD
    /(\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2})/,    // YYYY-MM-DD
  ];

  // Amount pattern - can be at end of line OR on its own line
  const amountPattern = /(\d{1,3}(?:,\d{3})*\.\d{2})/g;

  const currentYear = new Date().getFullYear();
  const potentialTransactions: any[] = [];

  // Strategy: Find lines starting with a date, then look ahead for amounts
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line.length < 5) continue;

    // Check if line starts with a date
    let dateMatch = null;
    let dateStr = null;
    let parsedDate = null;

    // Try month name format first (American Express style)
    const monthMatch = line.match(/^(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2})\s+/i);
    if (monthMatch) {
      const monthName = monthMatch[1];
      const day = monthMatch[2];
      const monthMap: { [key: string]: number } = {
        january: 0, february: 1, march: 2, april: 3, may: 4, june: 5,
        july: 6, august: 7, september: 8, october: 9, november: 10, december: 11
      };
      const month = monthMap[monthName.toLowerCase()];
      parsedDate = new Date(currentYear, month, parseInt(day));
      dateStr = monthMatch[0].trim();
    } else {
      // Try numeric date formats
      for (const pattern of datePatterns) {
        dateMatch = line.match(pattern);
        if (dateMatch) {
          dateStr = dateMatch[1];
          parsedDate = parseDateFromStatement(dateStr, currentYear);
          if (parsedDate) break;
        }
      }
    }

    if (!parsedDate || !dateStr) continue;

    // Found a date! Now extract merchant/description from this line
    const descriptionPart = line.substring(line.indexOf(dateStr) + dateStr.length).trim();
    if (descriptionPart.length < 2) continue;

    // Look for amount on SAME line first
    const amountsOnSameLine = descriptionPart.match(amountPattern);
    if (amountsOnSameLine && amountsOnSameLine.length > 0) {
      // Single-line format: date, description, amount all on one line
      const lastAmount = amountsOnSameLine[amountsOnSameLine.length - 1];
      const amount = parseFloat(lastAmount.replace(/,/g, ''));
      if (!isNaN(amount) && amount > 0) {
        const description = descriptionPart.substring(0, descriptionPart.lastIndexOf(lastAmount)).trim();
        const merchant = extractMerchant(description);

        potentialTransactions.push({
          date: parsedDate.toISOString().split('T')[0],
          description: description || descriptionPart,
          amount: -amount, // Negative for expenses
          merchant: merchant || description,
          format: 'single-line',
        });
        continue;
      }
    }

    // Multi-line format: Look ahead in next 1-5 lines for amounts
    let foundAmount = false;
    for (let j = i + 1; j <= Math.min(i + 5, lines.length - 1); j++) {
      const nextLine = lines[j].trim();
      if (!nextLine) continue;

      // Skip currency indicator lines
      if (nextLine.match(/^(UNITED STATES DOLLAR|EUROPEAN UNION EURO|AUSTRALIAN DOLLAR|AUD|USD|EUR|GBP)/i)) {
        continue;
      }

      // Skip conversion info lines
      if (nextLine.match(/^AUD.*includes conversion/i)) {
        continue;
      }

      // Look for amounts on this line
      const amounts = nextLine.match(amountPattern);
      if (amounts && amounts.length > 0) {
        // Found amount(s)! Use the LAST amount (typically the AUD amount for Amex)
        const lastAmount = amounts[amounts.length - 1];
        const amount = parseFloat(lastAmount.replace(/,/g, ''));

        if (!isNaN(amount) && amount > 0) {
          const merchant = extractMerchant(descriptionPart);

          potentialTransactions.push({
            date: parsedDate.toISOString().split('T')[0],
            description: descriptionPart,
            amount: -amount, // Negative for expenses
            merchant: merchant || descriptionPart,
            format: 'multi-line',
          });
          foundAmount = true;
          break;
        }
      }
    }

    if (foundAmount) {
      // Skip ahead past the lines we just processed
      i += 3; // Skip currency and amount lines
    }
  }

  // Only accept if we found at least 5 transactions
  if (potentialTransactions.length >= 5) {
    console.log(`[Pattern Parser] Found ${potentialTransactions.length} potential transactions`);

    // Count formats
    const singleLine = potentialTransactions.filter(t => t.format === 'single-line').length;
    const multiLine = potentialTransactions.filter(t => t.format === 'multi-line').length;
    console.log(`[Pattern Parser] Format breakdown: ${singleLine} single-line, ${multiLine} multi-line`);

    // Clean up and return all transactions
    for (const txn of potentialTransactions) {
      let description = txn.description;

      // Remove reference numbers
      description = description.replace(/REF:\s*\d+/gi, '').trim();
      description = description.replace(/\bREF\s+\d+/gi, '').trim();

      // Remove card numbers
      description = description.replace(/CARD\s+\d{4}/gi, '').trim();
      description = description.replace(/\*{4}\d{4}/g, '').trim();

      // Remove transaction types
      description = description.replace(/^(EFTPOS|POS|VISA|DEBIT|CREDIT|PURCHASE|PAYMENT|DIRECT DEBIT|DD)\s+/gi, '').trim();

      // Remove country/location codes at end
      description = description.replace(/\s+(UNITED STATES|NEW YORK|CALIFORNIA|SAN FRANCISCO|AMSTERDAM|DUBLIN|LONDON|SINGAPORE|AUSTRALIA)\s*$/gi, '').trim();

      // Remove phone numbers
      description = description.replace(/\d{3}-\d{3}-\d{4}/g, '').trim();

      // Clean up spacing
      description = description.replace(/\s{2,}/g, ' ').trim();

      if (description.length >= 2) {
        transactions.push({
          date: txn.date,
          description: description,
          amount: txn.amount,
          merchant: extractMerchant(description),
        });
      }
    }

    console.log(`[Pattern Parser] Successfully extracted ${transactions.length} transactions`);
  } else {
    console.log(`[Pattern Parser] Only found ${potentialTransactions.length} potential transactions (need at least 5)`);
  }

  return transactions;
}

function parseDateFromStatement(dateStr: string, currentYear: number): Date | null {
  // Handle MM/DD or DD/MM format
  if (/^\d{1,2}\/\d{1,2}$/.test(dateStr)) {
    const [part1, part2] = dateStr.split('/').map(Number);
    // Try both DD/MM and MM/DD (prioritize DD/MM for Australian banks)
    const ddMmDate = new Date(currentYear, part2 - 1, part1);
    if (ddMmDate.getDate() === part1 && ddMmDate.getMonth() === part2 - 1) {
      return ddMmDate;
    }
    // Fallback to MM/DD
    const mmDdDate = new Date(currentYear, part1 - 1, part2);
    if (mmDdDate.getDate() === part2 && mmDdDate.getMonth() === part1 - 1) {
      return mmDdDate;
    }
  }

  // Handle full date formats
  return parseFlexibleDate(dateStr);
}

async function enhanceTransactionsWithAI(transactions: any[], sessionId?: string): Promise<any[]> {
  console.log(`[Merchant Cache] Loading known merchants...`);

  // Load existing merchant metadata from database
  const db = await getDb();
  const { data: knownMerchants, error: merchantError } = await db
    .from("Transaction")
    .select(`
      merchant,
      originalData,
      category:Category (
        name
      )
    `)
    .not("originalData", "is", null);

  if (merchantError) {
    console.error("[Merchant Cache] Error loading merchants:", merchantError);
  }

  // Filter to distinct merchants
  const uniqueMerchants = knownMerchants?.filter((txn, index, self) =>
    index === self.findIndex((t) => t.merchant === txn.merchant)
  ) || [];

  // Build merchant lookup cache
  const merchantCache = new Map<string, any>();
  uniqueMerchants.forEach((txn) => {
    if (txn.merchant && txn.originalData) {
      const data = txn.originalData as any;
      merchantCache.set(txn.merchant.toLowerCase(), {
        merchantType: data.merchantType,
        merchantDescription: data.merchantDescription,
        category: Array.isArray(txn.category) ? txn.category[0]?.name : txn.category?.name,
      });
    }
  });

  console.log(`[Merchant Cache] Loaded ${merchantCache.size} known merchants`);

  // Helper function to find best merchant match (fuzzy matching)
  const findBestMerchantMatch = (merchant: string): any => {
    if (!merchant) return null;

    const searchKey = merchant.toLowerCase().trim();

    // 1. Try exact match first
    if (merchantCache.has(searchKey)) {
      return merchantCache.get(searchKey);
    }

    // 2. Try partial match - check if any cached merchant contains or is contained in the search
    for (const [cachedKey, cachedData] of merchantCache.entries()) {
      // Remove common suffixes/prefixes for better matching
      const cleanedSearch = searchKey.replace(/\s+(pty|ltd|limited|corp|corporation|inc)$/i, '').trim();
      const cleanedCached = cachedKey.replace(/\s+(pty|ltd|limited|corp|corporation|inc)$/i, '').trim();

      // If they match after cleaning, or if one contains the other (and both are >3 chars to avoid false positives)
      if (cleanedSearch.length > 3 && cleanedCached.length > 3) {
        if (cleanedSearch === cleanedCached ||
            cleanedSearch.includes(cleanedCached) ||
            cleanedCached.includes(cleanedSearch)) {
          console.log(`[Merchant Cache] Fuzzy match: "${merchant}" → "${cachedKey}"`);
          return cachedData;
        }
      }
    }

    return null;
  };

  // Separate transactions into known and unknown
  const enhanced = [];
  const unknownTransactions = [];
  const unknownIndices = [];

  transactions.forEach((txn, idx) => {
    const cached = findBestMerchantMatch(txn.merchant);

    if (cached) {
      // Use cached merchant data
      enhanced[idx] = {
        ...txn,
        merchantType: cached.merchantType,
        merchantDescription: cached.merchantDescription,
        category: cached.category || txn.category,
      };
      console.log(`[Merchant Cache] ✓ ${txn.merchant} (cached)`);
    } else {
      // Need to fetch from OpenAI
      unknownTransactions.push(txn);
      unknownIndices.push(idx);
    }
  });

  console.log(`[Merchant Cache] ${enhanced.filter(Boolean).length} cached, ${unknownTransactions.length} unknown`);

  // Only send unknown merchants to OpenAI
  if (unknownTransactions.length > 0) {
    console.log(`[AI Enhancement] Fetching metadata for ${unknownTransactions.length} unknown merchants...`);
    logger.info(
      "AI Enhancement",
      `Starting merchant metadata enrichment for ${unknownTransactions.length} merchants`,
      undefined,
      sessionId
    );

    const batchSize = 20;
    for (let i = 0; i < unknownTransactions.length; i += batchSize) {
      const batch = unknownTransactions.slice(i, i + batchSize);
      const batchIndices = unknownIndices.slice(i, i + batchSize);

      try {
        const merchantList = batch.map((t, idx) => `${idx}: ${t.merchant || t.description}`).join('\n');

        const completion = await createChatCompletion(
          openai,
          {
            model: "gpt-4o-mini",
            messages: [
              {
                role: "system",
                content: "You are a merchant metadata expert. Provide industry type and description for each merchant."
              },
              {
                role: "user",
                content: `For each merchant, provide:
1. merchantType (e.g., "Technology/Database", "Telecommunications", "E-commerce", "Streaming Service")
2. merchantDescription (1 sentence about what they do)
3. category (one of: Groceries, Utilities, Entertainment, Transport, Healthcare, Shopping, Dining, Bills, Income, Transfer, Subscriptions, Insurance, Education, Travel, Other)

Merchants:
${merchantList}

Return JSON: {"0": {"merchantType": "...", "merchantDescription": "...", "category": "..."}, "1": {...}}`
              }
            ],
            response_format: { type: "json_object" },
            temperature: 0.1,
            max_tokens: 2000,
          },
          "Merchant Metadata Enrichment",
          { sessionId, timeout: 30000 }
        );

        const response = completion.choices[0].message.content;
        if (response) {
          const metadata = JSON.parse(response);
          let enrichedCount = 0;
          batch.forEach((txn, idx) => {
            const data = metadata[idx.toString()];
            const originalIdx = batchIndices[idx];
            enhanced[originalIdx] = {
              ...txn,
              merchantType: data?.merchantType || "Other",
              merchantDescription: data?.merchantDescription || "",
              category: data?.category || txn.category,
            };
            console.log(`[AI Enhancement] ✓ ${txn.merchant} → ${data?.merchantType}`);
            enrichedCount++;
          });
          logger.info(
            "AI Enhancement",
            `Successfully enriched ${enrichedCount} merchants in batch`,
            undefined,
            sessionId
          );
        }
      } catch (error: any) {
        const errorMessage = error?.message || String(error);
        logger.error(
          "AI Enhancement",
          `Merchant metadata enrichment failed for batch`,
          { error: errorMessage, batchSize: batch.length },
          sessionId
        );
        // Fall back to original data without metadata
        batch.forEach((txn, idx) => {
          enhanced[batchIndices[idx]] = txn;
        });
      }
    }
  }

  // Fill any gaps with original data
  transactions.forEach((txn, idx) => {
    if (!enhanced[idx]) {
      enhanced[idx] = txn;
    }
  });

  console.log(`[AI Enhancement] Complete: ${enhanced.length} transactions processed`);
  return enhanced;
}

// Extract transactions by EXECUTING previously learned code (NO AI!)
async function extractTransactionsWithCode(
  pdfText: string,
  extractionCode: string,
  bank: string,
  statementType: string
): Promise<any[]> {
  console.log(`[Code Execution] Running learned extraction code for ${bank}...`);
  console.log(`[Code Execution] PDF text length: ${pdfText.length} chars`);
  console.log(`[Code Execution] PDF text sample (first 500 chars):`);
  console.log(pdfText.substring(0, 500));
  console.log(`[Code Execution] PDF text sample (lines 1-20):`);
  console.log(pdfText.split('\n').slice(0, 20).join('\n'));

  try {
    // Execute the function code and call it in one step
    console.log(`[Code Execution] Executing code...`);
    const transactions = eval(`${extractionCode}; extractTransactions(pdfText);`);

    console.log(`[Code Execution] Eval returned type: ${typeof transactions}`);
    console.log(`[Code Execution] Is array: ${Array.isArray(transactions)}`);
    console.log(`[Code Execution] Result:`, transactions);

    if (!Array.isArray(transactions)) {
      console.error(`[Code Execution] Function did not return an array, got: ${typeof transactions}`);
      return [];
    }

    console.log(`[Code Execution] ✓ Extracted ${transactions.length} transactions WITHOUT AI!`);
    if (transactions.length > 0) {
      console.log(`[Code Execution] Sample transaction:`, transactions[0]);
    }
    return transactions;
  } catch (error) {
    console.error("[Code Execution] Error executing learned code:", error);
    console.error("[Code Execution] Error message:", (error as Error).message);
    console.error("[Code Execution] Error stack:", (error as Error).stack);
    // Fallback to AI if code execution fails
    return [];
  }
}

async function extractTransactionsWithAI(pdfText: string): Promise<{ transactions: any[]; extractionCode?: string; formatDescription?: string }> {
  // Truncate if too large
  let text = pdfText;
  if (text.length > 30000) {
    console.log(`[AI Extraction] Text too large, truncating to 30k chars`);
    text = text.substring(0, 30000);
  }

  console.log(`[AI Extraction] Sending ${text.length} chars to OpenAI...`);

  try {
    const completion = await createChatCompletion(
      openai,
      {
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are a financial document analyzer expert at both extracting transactions AND creating reusable JavaScript extraction code."
          },
          {
            role: "user",
            content: `Analyze this bank statement text and:
1. Extract ALL transactions as JSON
2. Write JavaScript code that can extract transactions from this same format in the future

Bank statement text:
${text}

The extraction code should:
- Be a function named 'extractTransactions' that takes pdfText parameter
- Split text by \\n and iterate through lines
- Handle the specific format of THIS statement (could be single-line or multi-line transactions)
- Return array: [{date: 'YYYY-MM-DD', merchant: string, amount: number, description: string}]

Return JSON:
{
  "transactions": [/* all transactions */],
  "extractionCode": "function extractTransactions(pdfText) { ... }",
  "formatDescription": "brief description"
}

Important:
- Extract ALL transactions (typically 50-200+)
- Negative amounts = expenses, positive = income
- Parse dates to YYYY-MM-DD format`
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.1,
        max_tokens: 16000,
      },
      "AI Transaction Extraction",
      { timeout: 90000, maxRetries: 2 }
    );

    const response = completion.choices[0].message.content;
    if (!response) {
      throw new Error("No response from OpenAI");
    }

    const parsed = JSON.parse(response);
    const transactions = parsed.transactions || [];
    const extractionCode = parsed.extractionCode;
    const formatDescription = parsed.formatDescription;

    console.log(`[AI Extraction] Extracted ${transactions.length} transactions`);
    if (extractionCode) {
      console.log(`[AI Extraction] Also received extraction code (${extractionCode.length} chars)`);
    }

    return { transactions, extractionCode, formatDescription };
  } catch (error) {
    console.error("[AI Extraction] Error:", error);
    return { transactions: [] };
  }
}

// Learn statement format with OpenAI and generate reusable extraction code
async function learnFormatWithOpenAI(
  pdfText: string,
  bank: string,
  statementType: string,
  formatFingerprint: string
): Promise<{
  success: boolean;
  transactions: any[];
  extractionCode?: string;
  formatDescription?: string;
  confidence?: number;
}> {
  console.log(`[Format Learning] Learning new format for ${bank} (${statementType})`);

  // Truncate if too large
  let text = pdfText;
  if (text.length > 30000) {
    console.log(`[Format Learning] Text too large, truncating to 30k chars`);
    text = text.substring(0, 30000);
  }

  // Single attempt - if prompt produces bad code, retrying won't help
  try {

    const completion = await createChatCompletion(
      openai,
      {
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are an expert at analyzing bank statement formats and creating executable JavaScript code to extract transactions. You provide both immediate transaction extraction AND reusable code for future extractions of the same format."
          },
          {
            role: "user",
            content: `Analyze this ${bank} ${statementType} bank statement and complete TWO tasks:

TASK 1: Extract ALL transactions immediately
TASK 2: Generate reusable JavaScript extraction code for this exact format

CRITICAL: The PDF text uses \\n newline characters. Analyze the line structure carefully to understand if transactions are single-line or multi-line format.

BANK STATEMENT TEXT:
${text}

EXTRACTION CODE REQUIREMENTS:
- Function named 'extractTransactions' that takes pdfText parameter
- Use pdfText.split('\\n') to process line by line
- Identify the transaction pattern (could be single-line or multi-line)
- Handle date formats (convert to YYYY-MM-DD)
- Extract merchant name, amount, description
- Use regex patterns and string manipulation ONLY (NO AI calls in the code!)
- Include detailed comments explaining the format and logic
- Return array: [{date: 'YYYY-MM-DD', merchant: string, amount: number, description: string}]

IMPORTANT:
- Extract ALL transactions (typically 50-200+ transactions)
- Negative amounts = expenses/debits
- Positive amounts = income/credits
- Be precise with amount parsing (handle commas, decimals, currency symbols)
- Test your extraction code logic mentally against the provided text

RETURN JSON EXACTLY IN THIS FORMAT:
{
  "transactions": [
    {"date": "YYYY-MM-DD", "merchant": "...", "amount": -50.00, "description": "..."},
    ...all transactions
  ],
  "extractionCode": "function extractTransactions(pdfText) {\\n  // Complete executable JavaScript function\\n  const transactions = [];\\n  const lines = pdfText.split('\\\\n');\\n  // ... your extraction logic\\n  return transactions;\\n}",
  "formatDescription": "Brief description of the statement format (e.g., 'American Express multi-line format with currency lines')",
  "confidence": 0.95
}

The confidence should be 0.0-1.0 based on how certain you are the extraction code will work correctly.`
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.1,
        max_tokens: 16000,
      },
      "Format Learning",
      { timeout: 120000, maxRetries: 1 }
    );

      const response = completion.choices[0].message.content;
      if (!response) {
        throw new Error("No response from OpenAI");
      }

      const parsed = JSON.parse(response);
      const transactions = parsed.transactions || [];
      const extractionCode = parsed.extractionCode;
      const formatDescription = parsed.formatDescription || `${bank} ${statementType}`;
      const confidence = parsed.confidence || 0.8;

      console.log(`[Format Learning] ✓ Extracted ${transactions.length} transactions`);
      console.log(`[Format Learning] Confidence: ${confidence}`);

      if (!extractionCode) {
        console.warn(`[Format Learning] No extraction code provided`);
        return {
          success: true,
          transactions,
        };
      }

      console.log(`[Format Learning] ✓ Generated extraction code (${extractionCode.length} chars)`);

      // Validate the extraction code by testing it
      if (transactions.length > 0) {
        try {
          console.log(`[Format Learning] Validating extraction code...`);
          const testTransactions = await extractTransactionsWithCode(
            pdfText,
            extractionCode,
            bank,
            statementType
          );

          // Check if validation produced similar results (allow 20% variance)
          const validationSuccess = testTransactions.length >= transactions.length * 0.8;
          console.log(`[Format Learning] Validation: ${testTransactions.length} vs ${transactions.length} transactions`);

          if (!validationSuccess) {
            console.warn(`[Format Learning] Validation failed - code extracted ${testTransactions.length} but AI extracted ${transactions.length}`);
            logger.warn("Format Learning", `Code validation failed - using AI transactions instead`);

            // Return AI-extracted transactions without code (don't waste tokens retrying)
            return {
              success: true,
              transactions,
            };
          }

          console.log(`[Format Learning] ✓ Validation passed!`);
        } catch (validationError) {
          console.error(`[Format Learning] Validation error:`, validationError);

          // If not last attempt, retry
          if (attempt < maxRetries) {
            console.log(`[Format Learning] Retrying due to validation error...`);
            continue;
          }

          // On last attempt, return AI-extracted transactions without code
          return {
            success: true,
            transactions,
          };
        }
      }

      // Success! Return transactions and validated code
      return {
        success: true,
        transactions,
        extractionCode,
        formatDescription,
        confidence,
      };

    } catch (error) {
      console.error(`[Format Learning] Attempt ${attempt} error:`, error);

      // If last attempt, return failure
      if (attempt === maxRetries) {
        console.error("[Format Learning] All retry attempts failed");
        return {
          success: false,
          transactions: [],
        };
      }

      // Otherwise, retry after a short delay
      await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
    }
  }

  // Should never reach here, but just in case
  return {
    success: false,
    transactions: [],
  };
}

async function parseImageWithVision(buffer: Buffer, fileName: string): Promise<any[]> {
  console.log(`[Vision API] Processing image: ${fileName}`);

  const base64 = buffer.toString('base64');
  const mimeType = fileName.endsWith('.png') ? 'image/png' : 'image/jpeg';

  try {
    const completion = await createChatCompletion(
      openai,
      {
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are a financial document analyzer. Extract all transactions from bank statement screenshots."
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Extract ALL transactions from this bank statement screenshot. For each transaction, provide:
                1. date (in YYYY-MM-DD format)
                2. description
                3. amount (negative for debits, positive for credits)
                4. merchant name

                Important:
                - Convert DD/MM/YYYY dates to YYYY-MM-DD
                - Accept dates in 2024 and 2025
                - Include ALL visible transactions
                - If the image shows a mobile app or website, extract all transaction data

                Return as JSON: {"transactions": [{"date": "YYYY-MM-DD", "description": "...", "amount": -00.00, "merchant": "..."}]}`
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:${mimeType};base64,${base64}`
                }
              }
            ]
          }
        ],
        max_tokens: 4000,
      },
      "PDF Vision Parsing",
      { timeout: 90000, maxRetries: 2 }
    );

    const response = completion.choices[0].message.content;
    if (!response) {
      throw new Error("No response from Vision API");
    }

    let transactions = [];
    try {
      const parsed = JSON.parse(response);
      transactions = parsed.transactions || [];
    } catch (parseError) {
      console.error("[Vision API] Failed to parse response:", parseError);
      console.error("[Vision API] Raw response:", response.substring(0, 500));
      return [];
    }

    console.log(`[Vision API] Extracted ${transactions.length} transactions from image`);
    return transactions;
  } catch (error) {
    console.error("[Vision API] Error processing image:", error);
    return [];
  }
}

async function parseOFXQIF(buffer: Buffer): Promise<any[]> {
  const text = buffer.toString("utf-8");
  console.log(`[OFX/QIF Parser] Processing file...`);

  try {
    // Send to OpenAI for parsing
    const completion = await createChatCompletion(
      openai,
      {
        model: "gpt-4-turbo-preview",
        messages: [
          {
            role: "system",
            content: "You are a financial data parser for OFX and QIF formats."
          },
          {
            role: "user",
            content: `Parse this OFX/QIF file and extract all transactions. Return as JSON:
            {"transactions": [{"date": "YYYY-MM-DD", "description": "...", "amount": -00.00, "merchant": "..."}]}

            File content:
            ${text}`
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.1,
      },
      "OFX/QIF Parsing",
      { timeout: 60000, maxRetries: 2 }
    );

    const response = completion.choices[0].message.content;
    if (!response) {
      throw new Error("No response from OpenAI");
    }

    try {
      const parsed = JSON.parse(response);
      return parsed.transactions || [];
    } catch (parseError) {
      console.error("[OFX/QIF Parser] Failed to parse response:", parseError);
      console.error("[OFX/QIF Parser] Raw response:", response.substring(0, 500));
      return [];
    }
  } catch (error) {
    console.error("[OFX/QIF Parser] Error:", error);
    return [];
  }
}

async function parseWithOpenAI(rows: any[]): Promise<any[]> {
  // Batch processing to handle large files - reduced size to avoid token limits
  const batchSize = 50; // Reduced from 100 to avoid token limits
  const allTransactions = [];

  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    const columns = Object.keys(rows[0]);

    // Add delay between batches to avoid rate limits (wait 2 seconds between batches)
    if (i > 0) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    const prompt = `
You are a financial data parser. Analyze this bank statement CSV data and extract transactions.

Columns found: ${columns.join(", ")}

For EACH row, extract:
1. date (in ISO format YYYY-MM-DD) - Convert DD/MM/YYYY to YYYY-MM-DD
2. description (transaction description)
3. amount (negative for debits, positive for credits)
4. merchant (extracted from description)

Important:
- Accept dates in 2024 and 2025
- Handle DD/MM/YYYY format (common in Australia)
- Negative amounts are expenses/debits
- Positive amounts are income/credits
- Include ALL transactions, skip NONE

Return JSON: {"transactions": [{"date": "2024-07-26", "description": "...", "amount": -50.00, "merchant": "..."}]}

Data to parse (${batch.length} rows):
${JSON.stringify(batch)}
`;

    try {
      const completion = await createChatCompletion(
        openai,
        {
          model: "gpt-4o",
          messages: [
            {
              role: "system",
              content: "You are a financial CSV parser. Extract ALL transactions accurately."
            },
            {
              role: "user",
              content: prompt
            }
          ],
          response_format: { type: "json_object" },
          temperature: 0.1,
          max_tokens: 2000, // Reduced to ensure complete responses
        },
        `CSV Parsing (Batch ${i/batchSize + 1})`,
        { timeout: 45000, maxRetries: 2 }
      );

      const response = completion.choices[0].message.content;
      if (response) {
        try {
          const parsed = JSON.parse(response);
          const transactions = parsed.transactions || [];
          allTransactions.push(...transactions);
          console.log(`[OpenAI] Parsed batch ${i/batchSize + 1}: ${transactions.length} transactions`);
        } catch (parseError) {
          console.error(`[OpenAI] Failed to parse response for batch ${i/batchSize + 1}:`, parseError);
          console.error(`[OpenAI] Raw response:`, response.substring(0, 500));
          // Try to extract transactions manually if JSON parsing fails
          const fallbackTransactions = basicParse(batch);
          allTransactions.push(...fallbackTransactions);
          console.log(`[OpenAI] Using fallback parser: ${fallbackTransactions.length} transactions`);
        }
      }
    } catch (error) {
      console.error(`[OpenAI] Error parsing batch ${i/batchSize + 1}:`, error);
    }
  }

  console.log(`[OpenAI] Total parsed: ${allTransactions.length} transactions`);
  return allTransactions;
}

function basicParse(rows: any[]): any[] {
  // Fallback basic parser for when AI is unavailable
  const transactions = [];

  for (const row of rows) {
    let date = null;
    let description = "";
    let amount = 0;

    // Look for common column patterns
    for (const [key, value] of Object.entries(row)) {
      const keyLower = key.toLowerCase();

      if (keyLower.includes('date') && value) {
        date = parseFlexibleDate(String(value));
      } else if (keyLower.includes('description') || keyLower.includes('narrative')) {
        description = String(value);
      } else if (keyLower.includes('amount') || keyLower.includes('debit') || keyLower.includes('credit')) {
        const parsed = parseAmount(String(value));
        if (parsed !== 0) {
          amount = parsed;
        }
      }
    }

    if (date && amount !== 0) {
      transactions.push({
        date: date.toISOString(),
        description,
        amount,
        merchant: extractMerchant(description),
      });
    }
  }

  console.log(`[Basic Parser] Parsed ${transactions.length} transactions`);
  return transactions;
}

function parseFlexibleDate(dateStr: string): Date | null {
  if (!dateStr) return null;

  const cleaned = dateStr.trim();

  // Handle DD/MM/YYYY format (common in Australia)
  const ddmmyyyyMatch = cleaned.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (ddmmyyyyMatch) {
    const [, day, month, year] = ddmmyyyyMatch;
    const date = new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`);

    // Accept dates from 2020 to 2030
    if (!isNaN(date.getTime()) && date.getFullYear() >= 2020 && date.getFullYear() <= 2030) {
      return date;
    }
  }

  // Try other formats
  const date = new Date(cleaned);
  if (!isNaN(date.getTime()) && date.getFullYear() >= 2020 && date.getFullYear() <= 2030) {
    return date;
  }

  return null;
}

function parseAmount(amountStr: string | number): number {
  if (typeof amountStr === "number") return amountStr;
  if (!amountStr) return 0;

  const str = amountStr.toString().trim();
  if (!str || str === '-' || str === '') return 0;

  const isNegative = str.startsWith('(') && str.endsWith(')') || str.includes('-');
  let cleaned = str.replace(/[\$£€¥\s(),]/g, "");
  cleaned = cleaned.replace(/-/g, "");
  const amount = parseFloat(cleaned) || 0;

  return isNegative ? -Math.abs(amount) : amount;
}

function extractMerchant(description: string): string {
  if (!description) return "";

  let cleaned = description
    .replace(/^(POS |EFTPOS |VISA |DEBIT |CREDIT |PURCHASE |PAYMENT |DIRECT DEBIT |DD |)/, '')
    .replace(/^(CARD\s+\d{4}\s+)/, '')
    .replace(/\s+\d{2}\/\d{2}\/\d{2,4}.*$/, '')
    .replace(/\s+REF:.*$/, '')
    .trim();

  const parts = cleaned.split(/\s{2,}|\s+(?=\d{4,})/);
  return parts[0] || cleaned.split(' ').slice(0, 3).join(' ');
}