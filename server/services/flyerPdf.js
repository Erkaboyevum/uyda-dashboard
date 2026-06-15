import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import bwipjs from 'bwip-js';
import axios from 'axios';
import FormData from 'form-data';
import https from 'https';

const cdnAgent = new https.Agent({ rejectUnauthorized: false });

// ─────────────────────────────────────────────────────────────────────────────
// PAGE & GRID
// A3 Portrait: 842 × 1191 pts.  Grid: 3 cols × 2 rows = 6 flyers per page.
// ─────────────────────────────────────────────────────────────────────────────

const PAGE_W = 842;
const PAGE_H = 1191;
const COLS   = 3;
const ROWS   = 2;

const CELL_W = PAGE_W / COLS;   // ≈ 280.67 pt
const CELL_H = PAGE_H / ROWS;   // = 595.5  pt

// ─────────────────────────────────────────────────────────────────────────────
// FRONT PDF — primary discount number (large, on the golden % graphic)
// X: from flyer LEFT edge.  Y: from flyer TOP edge, increasing DOWNWARD.
// Increase OFFSET_Y to move text lower; decrease to move higher.
// ─────────────────────────────────────────────────────────────────────────────

const TEXT_PERCENT_OFFSET_X = 60;           // pts from flyer left edge
const TEXT_PERCENT_OFFSET_Y = 200;          // pts from flyer top edge  ← increase → lower
const TEXT_PERCENT_SIZE     = 100;
const TEXT_PERCENT_COLOR    = rgb(1, 1, 1); // white

// ─────────────────────────────────────────────────────────────────────────────
// FRONT PDF — secondary discount label ("17%", before "chegirmani qo'lga kiriting!")
// X: from flyer LEFT edge.  Y: from flyer BOTTOM edge, increasing UPWARD.
// Increase OFFSET_Y to move text higher; decrease to move lower.
// ─────────────────────────────────────────────────────────────────────────────

const TEXT_SECONDARY_OFFSET_X = 30;            // pts from flyer left edge
const TEXT_SECONDARY_OFFSET_Y = 250;           // pts from flyer BOTTOM edge  ← increase → higher
const TEXT_SECONDARY_SIZE     = 24;
const TEXT_SECONDARY_COLOR    = rgb(1, 1, 1);  // white

// ─────────────────────────────────────────────────────────────────────────────
// BACK PDF — barcode overlay
// X: barcode is auto-centered horizontally within the cell.
// Y: from flyer BOTTOM edge, increasing UPWARD (pdf-lib native).
// Increase BARCODE_OFFSET_Y to move barcode higher; decrease to move lower.
// ─────────────────────────────────────────────────────────────────────────────

const BARCODE_OFFSET_Y = 20;    // pts from flyer BOTTOM edge  ← decrease to move lower
const BARCODE_WIDTH    = 140;   // pts  ← constrained to fit inside white box
const BARCODE_HEIGHT   = 40;    // pts

// ─────────────────────────────────────────────────────────────────────────────
// ASSETS
// ─────────────────────────────────────────────────────────────────────────────

const FRONT_IMAGE_URL = 'https://cdn.erkaboyev.uz/Flyer/Flyer_front.png';
const BACK_IMAGE_URL  = 'https://cdn.erkaboyev.uz/Flyer/Flyer_back.png';

// Stable GitHub raw URL for Montserrat ExtraBold TTF (google/fonts repo).
// The bytes are cached in-process after the first fetch — fonts are static.
const MONTSERRAT_EXTRABOLD_URL =
  'https://raw.githubusercontent.com/google/fonts/main/ofl/montserrat/static/Montserrat-ExtraBold.ttf';

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

// Background images are NOT cached — every request fetches fresh so that a
// CDN failure on one request never poisons subsequent ones.
async function fetchImageRaw(url) {
  try {
    const res = await axios.get(url, {
      responseType: 'arraybuffer',
      timeout: 20_000,
      httpsAgent: cdnAgent,
      validateStatus: s => s === 200,
    });
    return Buffer.from(res.data);
  } catch (err) {
    console.warn(`[pdf] image unavailable (${url}): ${err.message} — placeholder will be used`);
    return null;
  }
}

// Fonts are static and safe to cache across requests within the same
// Vercel instance.  Cache the successful buffer; never cache a failure.
const _fontCache = new Map();

async function fetchFontBytes(url) {
  if (_fontCache.has(url)) {
    console.log('[pdf] font loaded from in-process cache');
    return _fontCache.get(url);
  }
  try {
    const res = await axios.get(url, {
      responseType: 'arraybuffer',
      timeout: 20_000,
      validateStatus: s => s === 200,
    });
    const buf = Buffer.from(res.data);
    _fontCache.set(url, buf);
    console.log(`[pdf] font fetched and cached (${buf.length}B)`);
    return buf;
  } catch (err) {
    console.warn(`[pdf] font unavailable (${url}): ${err.message} — falling back to Helvetica`);
    return null;
  }
}

// Auto-detect JPEG (FF D8) vs PNG (89 50) — CDN serves JPEG with a .png extension.
async function embedImageBuf(pdfDoc, buf) {
  const isJpeg = buf[0] === 0xFF && buf[1] === 0xD8;
  return isJpeg ? pdfDoc.embedJpg(buf) : pdfDoc.embedPng(buf);
}

// Code128 barcode → PNG buffer.
// includetext renders human-readable digits below the bars inside the PNG;
// pdf-lib's drawImage width/height then scales it to the desired size.
function makeBarcodeBuffer(text) {
  return new Promise((resolve, reject) => {
    bwipjs.toBuffer(
      {
        bcid: 'code128',
        text,
        scale: 3,
        height: 12,
        includetext: true,
        textxalign: 'center',
        backgroundcolor: 'ffffff',
      },
      (err, png) => (err ? reject(err) : resolve(png)),
    );
  });
}

function cellCoords(col, row) {
  const x       = col * CELL_W;
  const bottomY = PAGE_H - (row + 1) * CELL_H;
  const topY    = PAGE_H -  row      * CELL_H;
  return { x, bottomY, topY };
}

// ─────────────────────────────────────────────────────────────────────────────
// PDF GENERATORS
// ─────────────────────────────────────────────────────────────────────────────

// fontBytes: Montserrat ExtraBold TTF as Buffer, or null (falls back to Helvetica).
async function generateFrontPdf(flyers, bgBytes, fontBytes) {
  const pdfDoc = await PDFDocument.create();

  // Embed Montserrat ExtraBold if available, otherwise fall back to Helvetica Bold.
  const font = fontBytes
    ? await pdfDoc.embedFont(fontBytes)
    : await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // Embed background ONCE — reused for every cell across all pages.
  const bgImage = bgBytes ? await embedImageBuf(pdfDoc, bgBytes) : null;

  const perPage  = COLS * ROWS;
  const numPages = Math.ceil(flyers.length / perPage);

  for (let p = 0; p < numPages; p++) {
    const page = pdfDoc.addPage([PAGE_W, PAGE_H]);

    for (let slot = 0; slot < perPage; slot++) {
      const idx = p * perPage + slot;
      if (idx >= flyers.length) break;

      const col = slot % COLS;
      const row = Math.floor(slot / COLS);
      const { x, bottomY, topY } = cellCoords(col, row);

      // Background
      if (bgImage) {
        page.drawImage(bgImage, { x, y: bottomY, width: CELL_W, height: CELL_H });
      } else {
        page.drawRectangle({
          x, y: bottomY, width: CELL_W, height: CELL_H,
          color: rgb(0.93, 0.93, 0.93), borderColor: rgb(0.6, 0.6, 0.6), borderWidth: 1,
        });
      }

      // Primary large number (e.g. "17") — Y offset from cell TOP, going down.
      page.drawText(String(flyers[idx].discountPercent), {
        x:     x + TEXT_PERCENT_OFFSET_X,
        y:     topY - TEXT_PERCENT_OFFSET_Y,
        size:  TEXT_PERCENT_SIZE,
        font,
        color: TEXT_PERCENT_COLOR,
      });

      // Secondary label (e.g. "17%") — Y offset from cell BOTTOM, going up.
      // Increase TEXT_SECONDARY_OFFSET_Y to push text higher on the page.
      page.drawText(`${flyers[idx].discountPercent}%`, {
        x:     x + TEXT_SECONDARY_OFFSET_X,
        y:     bottomY + TEXT_SECONDARY_OFFSET_Y,
        size:  TEXT_SECONDARY_SIZE,
        font,
        color: TEXT_SECONDARY_COLOR,
      });
    }
  }

  return Buffer.from(await pdfDoc.save());
}

async function generateBackPdf(flyers, bgBytes) {
  const pdfDoc = await PDFDocument.create();

  // Embed background ONCE — reused for every cell across all pages.
  const bgImage = bgBytes ? await embedImageBuf(pdfDoc, bgBytes) : null;

  const perPage  = COLS * ROWS;
  const numPages = Math.ceil(flyers.length / perPage);

  for (let p = 0; p < numPages; p++) {
    const page = pdfDoc.addPage([PAGE_W, PAGE_H]);

    for (let slot = 0; slot < perPage; slot++) {
      const idx = p * perPage + slot;
      if (idx >= flyers.length) break;

      const col = slot % COLS;
      const row = Math.floor(slot / COLS);
      const { x, bottomY } = cellCoords(col, row);

      // Background
      if (bgImage) {
        page.drawImage(bgImage, { x, y: bottomY, width: CELL_W, height: CELL_H });
      } else {
        page.drawRectangle({
          x, y: bottomY, width: CELL_W, height: CELL_H,
          color: rgb(0.93, 0.93, 0.93), borderColor: rgb(0.6, 0.6, 0.6), borderWidth: 1,
        });
      }

      // Barcode — strictly awaited, unique per flyer.
      // Horizontally centered within the cell; Y is from cell bottom (pdf-lib native).
      const barcodePng   = await makeBarcodeBuffer(flyers[idx].barcode);
      const barcodeImage = await pdfDoc.embedPng(barcodePng);
      page.drawImage(barcodeImage, {
        x:      x + (CELL_W - BARCODE_WIDTH) / 2,  // auto-center within white box
        y:      bottomY + BARCODE_OFFSET_Y,
        width:  BARCODE_WIDTH,
        height: BARCODE_HEIGHT,
      });
    }
  }

  return Buffer.from(await pdfDoc.save());
}

// ─────────────────────────────────────────────────────────────────────────────
// TELEGRAM DELIVERY
// ─────────────────────────────────────────────────────────────────────────────

async function sendDocumentToTelegram(botToken, chatId, pdfBuffer, filename, caption) {
  const form = new FormData();
  form.append('chat_id', String(chatId));
  form.append('document', pdfBuffer, { filename, contentType: 'application/pdf' });
  if (caption) form.append('caption', caption);

  const res = await axios.post(
    `https://api.telegram.org/bot${botToken}/sendDocument`,
    form,
    { headers: form.getHeaders(), maxBodyLength: Infinity, timeout: 40_000 },
  );

  if (!res.data?.ok) throw new Error(`Telegram error: ${JSON.stringify(res.data)}`);
  return res.data;
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN ENTRY
//
//   1. Pre-fetch font + both background images in parallel (all fully awaited)
//   2. Generate both PDFs in parallel (zero network I/O at this stage)
//   3. Send front PDF → then back PDF to Telegram
// ─────────────────────────────────────────────────────────────────────────────

export async function processAndSendFlyers(chatId, flyers, botToken) {
  // Step 1 — fetch all assets upfront; nothing starts until every buffer is ready.
  console.log('[pdf] fetching assets (font + background images)...');
  const [fontBytes, frontImgBuf, backImgBuf] = await Promise.all([
    fetchFontBytes(MONTSERRAT_EXTRABOLD_URL),
    fetchImageRaw(FRONT_IMAGE_URL),
    fetchImageRaw(BACK_IMAGE_URL),
  ]);
  console.log(
    `[pdf] assets ready — font: ${fontBytes?.length ?? 'null'}B` +
    `  front: ${frontImgBuf?.length ?? 'null'}B` +
    `  back: ${backImgBuf?.length ?? 'null'}B`,
  );

  // Step 2 — generate both PDFs in parallel (all data already in memory).
  console.log(`[pdf] generating PDFs for ${flyers.length} flyers...`);
  const [frontBuf, backBuf] = await Promise.all([
    generateFrontPdf(flyers, frontImgBuf, fontBytes),
    generateBackPdf(flyers, backImgBuf),
  ]);
  console.log(`[pdf] PDFs ready — front: ${frontBuf.length}B  back: ${backBuf.length}B`);

  // Step 3 — deliver to Telegram.
  await sendDocumentToTelegram(botToken, chatId, frontBuf, 'Flyers_Front.pdf', 'Флайер — олдинги томон 🎟️');
  await sendDocumentToTelegram(botToken, chatId, backBuf,  'Flyers_Back.pdf',  'Флайер — орқа томон 🔖');
  console.log('[pdf] both documents delivered to Telegram');
}
