const fs = require('fs');
const pdfParse = require('pdf-parse');

async function main() {
  console.log('Reading PDF...');
  const dataBuffer = fs.readFileSync('./2025-09-16.pdf');

  console.log('Parsing PDF...');
  const data = await pdfParse(dataBuffer);
  const pdfText = data.text;

  console.log('========== FULL PDF TEXT (EXACT TEXT SENT TO API) ==========');
  console.log(pdfText);
  console.log('========== END OF PDF TEXT ==========');

  console.log(`\n\nStats:`);
  console.log(`Total length: ${pdfText.length} chars`);
  console.log(`Total lines: ${pdfText.split('\n').length}`);
}

main().catch(console.error);
