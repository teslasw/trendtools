const fs = require('fs');
const pdfParse = require('pdf-parse');

// The extraction code from database
function extractTransactions(pdfText) {
  const transactions = [];
  const lines = pdfText.split('\n');

  // Regex patterns to match transaction lines
  const transactionPattern = /^(\w+ \d{1,2})\s+(.+?)\s+(\d+\.\d{2})$/;
  const paymentPattern = /^(\w+ \d{1,2})\s+(.+?)\s+(\d+\.\d{2})\s+CR$/;

  // Iterate over each line to find transactions
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Match payment transactions
    let match = paymentPattern.exec(line);
    if (match) {
      const [_, date, description, amount] = match;
      transactions.push({
        date: `2025-${convertMonth(date.split(' ')[0])}-${padDay(date.split(' ')[1])}`,
        description: description.trim(),
        amount: parseFloat(amount),
        merchant: extractMerchant(description),
      });
      continue;
    }

    // Match regular transactions
    match = transactionPattern.exec(line);
    if (match) {
      const [_, date, description, amount] = match;
      transactions.push({
        date: `2025-${convertMonth(date.split(' ')[0])}-${padDay(date.split(' ')[1])}`,
        description: description.trim(),
        amount: -parseFloat(amount),
        merchant: extractMerchant(description),
      });
    }
  }

  return transactions;

  // Helper function to convert month name to number
  function convertMonth(month) {
    const months = {
      'January': '01', 'February': '02', 'March': '03',
      'April': '04', 'May': '05', 'June': '06',
      'July': '07', 'August': '08', 'September': '09',
      'October': '10', 'November': '11', 'December': '12'
    };
    return months[month];
  }

  // Helper function to pad day with leading zero
  function padDay(day) {
    return day.length === 1 ? '0' + day : day;
  }

  // Helper function to extract merchant name from description
  function extractMerchant(description) {
    const merchantEndIndex = description.indexOf(' ');
    return merchantEndIndex !== -1 ? description.substring(0, merchantEndIndex) : description;
  }
}

async function main() {
  console.log('Reading PDF...');
  const dataBuffer = fs.readFileSync('./2025-09-16.pdf');

  console.log('Parsing PDF...');
  const data = await pdfParse(dataBuffer);
  const pdfText = data.text;

  console.log(`\nPDF Stats:`);
  console.log(`- Total length: ${pdfText.length} chars`);
  console.log(`- Total lines: ${pdfText.split('\n').length}`);

  console.log(`\nFirst 50 lines:`);
  console.log('================');
  pdfText.split('\n').slice(0, 50).forEach((line, idx) => {
    console.log(`${idx}: "${line}"`);
  });

  console.log(`\n\nRunning extraction code...`);
  const transactions = extractTransactions(pdfText);

  console.log(`\n\nResults:`);
  console.log(`- Found ${transactions.length} transactions`);

  if (transactions.length > 0) {
    console.log(`\nFirst 5 transactions:`);
    transactions.slice(0, 5).forEach(txn => {
      console.log(txn);
    });
  } else {
    console.log('\nNo transactions found. Let me check what lines match the patterns...');

    const lines = pdfText.split('\n');
    const transactionPattern = /^(\w+ \d{1,2})\s+(.+?)\s+(\d+\.\d{2})$/;
    const paymentPattern = /^(\w+ \d{1,2})\s+(.+?)\s+(\d+\.\d{2})\s+CR$/;

    console.log('\nLines that start with month names:');
    lines.forEach((line, idx) => {
      const trimmed = line.trim();
      if (/^(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}/i.test(trimmed)) {
        console.log(`Line ${idx}: "${trimmed}"`);
        console.log(`  - Matches transactionPattern: ${transactionPattern.test(trimmed)}`);
        console.log(`  - Matches paymentPattern: ${paymentPattern.test(trimmed)}`);
      }
    });
  }
}

main().catch(console.error);
