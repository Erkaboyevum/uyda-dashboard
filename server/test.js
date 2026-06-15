import 'dotenv/config';
import { generateFrontPdf, generateBackPdf, processAndSendFlyers } from './services/flyerPdf.js';

const TEST_FLYERS = [
  { barcode: 'FL2024001', discountPercent: 15 },
  { barcode: 'FL2024002', discountPercent: 20 },
  { barcode: 'FL2024003', discountPercent: 15 },
  { barcode: 'FL2024004', discountPercent: 25 },
  { barcode: 'FL2024005', discountPercent: 15 },
  { barcode: 'FL2024006', discountPercent: 30 },
  { barcode: 'FL2024007', discountPercent: 15 }, // 7th → forces page 2
];

const CHAT_ID = '1319223069';

async function run() {
  console.log(`\n▶ Generating PDFs for ${TEST_FLYERS.length} flyers (2 pages each)...\n`);

  // ── Step 1: Front PDF ────────────────────────────────────────────────────
  console.time('  front pdf');
  const frontBuf = await generateFrontPdf(TEST_FLYERS);
  console.timeEnd('  front pdf');
  console.log(`  ✓ Flyers_Front.pdf — ${(frontBuf.length / 1024).toFixed(1)} KB`);

  // ── Step 2: Back PDF ─────────────────────────────────────────────────────
  console.time('  back pdf');
  const backBuf = await generateBackPdf(TEST_FLYERS);
  console.timeEnd('  back pdf');
  console.log(`  ✓ Flyers_Back.pdf  — ${(backBuf.length / 1024).toFixed(1)} KB`);

  // ── Step 3: Telegram send ────────────────────────────────────────────────
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) { console.error('\n✗ TELEGRAM_BOT_TOKEN not set in .env'); process.exit(1); }

  console.log(`\n▶ Sending to chatID ${CHAT_ID} via Telegram...`);
  console.time('  telegram');
  await processAndSendFlyers(CHAT_ID, TEST_FLYERS, token);
  console.timeEnd('  telegram');
  console.log('\n✅ Both PDFs delivered to Telegram successfully!\n');
}

run().catch(err => {
  console.error('\n✗ ERROR:', err.message);
  process.exit(1);
});
