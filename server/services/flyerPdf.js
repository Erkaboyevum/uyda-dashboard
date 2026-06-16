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
// FRONT PDF — discount % text overlay
// Offsets from FLYER top-left corner; Y increases DOWNWARD.
// ─────────────────────────────────────────────────────────────────────────────

const TEXT_PERCENT_OFFSET_X = 89;
const TEXT_PERCENT_OFFSET_Y = 214;
const TEXT_PERCENT_SIZE     = 82;
const TEXT_PERCENT_COLOR    = rgb(1, 1, 1);

// ─────────────────────────────────────────────────────────────────────────────
// BACK PDF — barcode overlay
// Offsets from FLYER top-left corner; Y increases DOWNWARD.
// ─────────────────────────────────────────────────────────────────────────────

const BARCODE_OFFSET_X = 80;
const BARCODE_OFFSET_Y = 550;
const BARCODE_WIDTH    = 120;
const BARCODE_HEIGHT   = 28;

// ─────────────────────────────────────────────────────────────────────────────
// CDN IMAGE URLS
// ─────────────────────────────────────────────────────────────────────────────

const FRONT_IMAGE_URL = 'https://cdn.erkaboyev.uz/Flyer/Flyer_front.png';
const BACK_IMAGE_URL  = 'https://cdn.erkaboyev.uz/Flyer/Flyer_back.png';

// Stable GitHub raw URL for Fredoka One TTF (google/fonts repo).
// Bytes are cached in-process after the first fetch.
const PERCENT_FONT_URL =
  'https://raw.githubusercontent.com/google/fonts/main/ofl/fredokaone/FredokaOne-Regular.ttf';

let _fontCache = null;

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

// Direct fetch — no caching, strictly awaited, returns null on failure (→ placeholder).
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

// Font bytes cached in-process; falls back to null (→ HelveticaBold) on failure.
async function fetchFontBytes(url) {
  if (_fontCache) return _fontCache;
  try {
    const res = await axios.get(url, {
      responseType: 'arraybuffer',
      timeout: 20_000,
      validateStatus: s => s === 200,
    });
    _fontCache = Buffer.from(res.data);
    return _fontCache;
  } catch (err) {
    console.warn(`[pdf] font unavailable (${url}): ${err.message} — HelveticaBold fallback`);
    return null;
  }
}

// Auto-detect JPEG (FF D8) vs PNG (89 50) — CDN serves JPEG with a .png extension.
async function embedImageBuf(pdfDoc, buf) {
  const isJpeg = buf[0] === 0xFF && buf[1] === 0xD8;
  return isJpeg ? pdfDoc.embedJpg(buf) : pdfDoc.embedPng(buf);
}

// Code128 barcode → PNG buffer; text rendered in Times-Roman below bars.
function makeBarcodeBuffer(text) {
  return new Promise((resolve, reject) => {
    bwipjs.toBuffer(
      {
        bcid: 'code128',
        text,
        scale: 2,
        height: 10,
        includetext: true,
        textfont: 'Times-Roman',
        backgroundcolor: 'ffffff',
      },
      (err, png) => (err ? reject(err) : resolve(png)),
    );
  });
}

// Draws text with a multi-layer 3D extrusion effect (deep shadow → main text).
// Shadow color base: rgb(240, 85, 54) — to'q sariq-to'q.
function draw3DText(page, text, { x, y, size, font, color }) {
  const depth = 5;
  const SR = 240 / 255, SG = 85 / 255, SB = 54 / 255;
  for (let i = depth; i >= 1; i--) {
    const brightness = 0.4 + 0.6 * (depth - i) / depth;
    page.drawText(text, { x: x + i, y: y - i, size, font, color: rgb(SR * brightness, SG * brightness, SB * brightness) });
  }
  page.drawText(text, { x, y, size, font, color });
}

// Converts a top-left-down visual offset to pdf-lib bottom-left coords for a cell.
// bottomY = page-bottom of the cell; topY = page-top of the cell.
function cellCoords(col, row) {
  const x       = col * CELL_W;
  const bottomY = PAGE_H - (row + 1) * CELL_H;
  const topY    = PAGE_H -  row      * CELL_H;
  return { x, bottomY, topY };
}

// ─────────────────────────────────────────────────────────────────────────────
// PDF GENERATORS
// Both accept a pre-fetched bgBytes buffer (may be null → gray placeholder).
// The buffer is embedded into the pdf document ONCE, then reused for every cell.
// ─────────────────────────────────────────────────────────────────────────────

async function generateFrontPdf(flyers, bgBytes, fontBytes) {
  const pdfDoc = await PDFDocument.create();

  // Use Montserrat ExtraBold if available, fall back to HelveticaBold.
  const font = fontBytes
    ? await pdfDoc.embedFont(fontBytes)
    : await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // Embed background ONCE — reused for all cells across all pages.
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

      if (bgImage) {
        page.drawImage(bgImage, { x, y: bottomY, width: CELL_W, height: CELL_H });
      } else {
        page.drawRectangle({
          x, y: bottomY, width: CELL_W, height: CELL_H,
          color: rgb(0.93, 0.93, 0.93), borderColor: rgb(0.6, 0.6, 0.6), borderWidth: 1,
        });
      }

      draw3DText(page, String(flyers[idx].discountPercent), {
        x:     x + TEXT_PERCENT_OFFSET_X,
        y:     topY - TEXT_PERCENT_OFFSET_Y,
        size:  TEXT_PERCENT_SIZE,
        font,
        color: TEXT_PERCENT_COLOR,
      });
    }
  }

  return Buffer.from(await pdfDoc.save());
}

async function generateBackPdf(flyers, bgBytes) {
  const pdfDoc = await PDFDocument.create();

  // Embed background ONCE — reused for all cells across all pages.
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

      if (bgImage) {
        page.drawImage(bgImage, { x, y: bottomY, width: CELL_W, height: CELL_H });
      } else {
        page.drawRectangle({
          x, y: bottomY, width: CELL_W, height: CELL_H,
          color: rgb(0.93, 0.93, 0.93), borderColor: rgb(0.6, 0.6, 0.6), borderWidth: 1,
        });
      }

      // Generate barcode strictly awaited before embedding — unique per flyer.
      const barcodePng   = await makeBarcodeBuffer(flyers[idx].barcode);
      const barcodeImage = await pdfDoc.embedPng(barcodePng);
      page.drawImage(barcodeImage, {
        x:      x + BARCODE_OFFSET_X,
        y:      topY - BARCODE_OFFSET_Y - BARCODE_HEIGHT,
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
// Execution order that guarantees no race conditions:
//   1. Pre-fetch font + BOTH background images (parallel, fully awaited)
//   2. Generate BOTH PDFs (parallel, all data already in memory)
//   3. Send front PDF to Telegram, then back PDF
// ─────────────────────────────────────────────────────────────────────────────

export async function processAndSendFlyers(chatId, flyers, botToken) {
  // ── Step 1: Pre-fetch font + both background images ───────────────────────
  console.log('[pdf] fetching assets (font + background images)...');
  const [fontBytes, frontImgBuf, backImgBuf] = await Promise.all([
    fetchFontBytes(PERCENT_FONT_URL),
    fetchImageRaw(FRONT_IMAGE_URL),
    fetchImageRaw(BACK_IMAGE_URL),
  ]);
  console.log(
    `[pdf] assets ready — font: ${fontBytes?.length ?? 'null'}B` +
    `  front: ${frontImgBuf?.length ?? 'null'}B` +
    `  back: ${backImgBuf?.length ?? 'null'}B`,
  );

  // ── Step 2: Generate both PDFs (no network calls for images) ─────────────
  console.log(`[pdf] generating PDFs for ${flyers.length} flyers...`);
  const [frontBuf, backBuf] = await Promise.all([
    generateFrontPdf(flyers, frontImgBuf, fontBytes),
    generateBackPdf(flyers, backImgBuf),
  ]);
  console.log(`[pdf] PDFs ready — front: ${frontBuf.length}B  back: ${backBuf.length}B`);

  // ── Step 3: Send to Telegram ──────────────────────────────────────────────
  await sendDocumentToTelegram(botToken, chatId, frontBuf, 'Flyers_Front.pdf', 'Флайер — олдинги томон 🎟️');
  await sendDocumentToTelegram(botToken, chatId, backBuf,  'Flyers_Back.pdf',  'Флайер — орқа томон 🔖');
  console.log('[pdf] both documents delivered to Telegram');
}
