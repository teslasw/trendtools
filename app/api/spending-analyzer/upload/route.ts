import { NextRequest, NextResponse } from "next/server";
import { parse } from "papaparse";
import OpenAI from "openai";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    console.log("[Upload API] Request received");

    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
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
        // Parse PDF files using OCR/Vision
        transactions = await parsePDFWithVision(buffer, file.name);
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

    // Create or update analysis session
    const analysisId = "analysis-" + Date.now();

    // Save analysis to database
    const analysis = await prisma.spendingAnalysis.upsert({
      where: { id: analysisId },
      create: {
        id: analysisId,
        userId: user.id,
        name: analysisName,
        status: "processing",
      },
      update: {
        name: analysisName,
        status: "processing",
      },
    });

    // Save transactions to database
    if (allTransactions.length > 0) {
      // Prepare transaction data for bulk insert
      const transactionData = allTransactions.map((txn) => ({
        userId: user.id,
        bankStatementId: analysisId,
        date: new Date(txn.date),
        description: txn.description || "",
        merchant: txn.merchant || "",
        amount: txn.amount,
        status: "CONSIDER" as const,
      }));

      // Bulk create transactions
      await prisma.transaction.createMany({
        data: transactionData,
        skipDuplicates: true,
      });

      // Update analysis status
      await prisma.bankStatement.update({
        where: { id: analysisId },
        data: { status: "completed" },
      });
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

async function parsePDFWithVision(buffer: Buffer, fileName: string): Promise<any[]> {
  console.log(`[Vision API] Processing PDF: ${fileName}`);

  // Convert PDF pages to images and send to Vision API
  // For now, we'll send the PDF as base64 and let OpenAI handle it
  const base64 = buffer.toString('base64');

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a financial document analyzer. Extract all transactions from bank statements."
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Extract ALL transactions from this bank statement. For each transaction, provide:
              1. date (in YYYY-MM-DD format)
              2. description
              3. amount (negative for debits, positive for credits)
              4. merchant name

              Important:
              - Convert DD/MM/YYYY dates to YYYY-MM-DD
              - Accept dates in 2024 and 2025
              - Include ALL transactions, even small ones

              Return as JSON array: {"transactions": [{"date": "YYYY-MM-DD", "description": "...", "amount": -00.00, "merchant": "..."}]}`
            },
            {
              type: "image_url",
              image_url: {
                url: `data:application/pdf;base64,${base64}`
              }
            }
          ]
        }
      ],
      max_tokens: 4000,
    });

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

    console.log(`[Vision API] Extracted ${transactions.length} transactions from PDF`);
    return transactions;
  } catch (error) {
    console.error("[Vision API] Error processing PDF:", error);
    return [];
  }
}

async function parseImageWithVision(buffer: Buffer, fileName: string): Promise<any[]> {
  console.log(`[Vision API] Processing image: ${fileName}`);

  const base64 = buffer.toString('base64');
  const mimeType = fileName.endsWith('.png') ? 'image/png' : 'image/jpeg';

  try {
    const completion = await openai.chat.completions.create({
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
    });

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
    const completion = await openai.chat.completions.create({
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
    });

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
      const completion = await openai.chat.completions.create({
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
      });

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