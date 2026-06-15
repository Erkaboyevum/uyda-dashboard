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
//
// All offsets are measured from the FLYER's TOP-LEFT corner.
// Y increases DOWNWARD (same as Photoshop / CSS).
// Increase OFFSET_Y to move the text lower; decrease to move it higher.
// ─────────────────────────────────────────────────────────────────────────────

const TEXT_PERCENT_OFFSET_X = 150;          // pts from flyer left edge
const TEXT_PERCENT_OFFSET_Y = 200;          // pts from flyer top edge
const TEXT_PERCENT_SIZE     = 48;
const TEXT_PERCENT_COLOR    = rgb(1, 1, 1); // white — change to rgb(1,0.84,0) for gold

// ─────────────────────────────────────────────────────────────────────────────
// BACK PDF — barcode overlay
//
// All offsets are measured from the FLYER's TOP-LEFT corner.
// Y increases DOWNWARD (same as Photoshop / CSS).
// Increase BARCODE_OFFSET_Y to move the barcode lower (toward bottom white box).
// ─────────────────────────────────────────────────────────────────────────────

const BARCODE_OFFSET_X = 80;    // pts from flyer left edge
const BARCODE_OFFSET_Y = 500;   // pts from flyer top edge  ← tune this first
const BARCODE_WIDTH    = 120;   // pts
const BARCODE_HEIGHT   = 40;    // pts

// ─────────────────────────────────────────────────────────────────────────────
// IMAGE URLS
// ─────────────────────────────────────────────────────────────────────────────

const FRONT_IMAGE_URL = 'https://cdn.erkaboyev.uz/Flyer/Flyer_front.png';
const BACK_IMAGE_URL  = 'https://cdn.erkaboyev.uz/Flyer/Flyer_back.png';

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

// One-request image cache (lives for the lifetime of the Node.js process).
const _imgCache = new Map();

async function fetchImage(url) {
  if (_imgCache.has(url)) return _imgCache.get(url);
  try {
    const res = await axios.get(url, {
      responseType: 'arraybuffer',
      timeout: 20_000,
      httpsAgent: cdnAgent,
      validateStatus: s => s === 200,
    });
    const buf = Buffer.from(res.data);
    _imgCache.set(url, buf);
    return buf;
  } catch (err) {
    console.warn(`[flyerPdf] image unavailable (${url}): ${err.message} — placeholder used`);
    _imgCache.set(url, null);
    return null;
  }
}

// Auto-detect JPEG (FF D8) vs PNG (89 50) so we call the right pdf-lib embedder.
// The CDN serves JPEG files with a .png extension, hence the need for this check.
async function embedImageBuf(pdfDoc, buf) {
  const isJpeg = buf[0] === 0xFF && buf[1] === 0xD8;
  return isJpeg ? pdfDoc.embedJpg(buf) : pdfDoc.embedPng(buf);
}

// Code128 barcode → PNG buffer (bwip-js callback API, wrapped as Promise).
function makeBarcodeBuffer(text) {
  return new Promise((resolve, reject) => {
    bwipjs.toBuffer(
      { bcid: 'code128', text, scale: 2, height: 10, includetext: false, backgroundcolor: 'ffffff' },
      (err, png) => (err ? reject(err) : resolve(png)),
    );
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// COORDINATE HELPER
//
// pdf-lib Y axis points UP (origin = page bottom-left).
// Our user-facing offsets point DOWN from the cell's top-left corner.
//
//   cellBottomY  = PAGE_H - (row + 1) * CELL_H   ← pdf-lib y for image/rect
//   cellTopY     = PAGE_H -  row      * CELL_H   ← used to convert top-down offsets
//
// To convert a top-down visual offset into a pdf-lib Y for a drawn element:
//   pdf_y = cellTopY - visualOffsetY - elementHeight
//
// For text, elementHeight ≈ 0 (pdf-lib places text by its baseline, not top).
// ─────────────────────────────────────────────────────────────────────────────

function cellCoords(col, row) {
  const x        = col * CELL_W;
  const bottomY  = PAGE_H - (row + 1) * CELL_H;   // bottom-left — for drawImage / drawRect
  const topY     = PAGE_H -  row      * CELL_H;   // top of cell  — for offset conversion
  return { x, bottomY, topY };
}

// ─────────────────────────────────────────────────────────────────────────────
// PDF 1: Flyers_Front.pdf
// ─────────────────────────────────────────────────────────────────────────────

export async function generateFrontPdf(flyers) {
  const [pdfDoc, bgBytes] = await Promise.all([
    PDFDocument.create(),
    fetchImage(FRONT_IMAGE_URL),
  ]);
  const font    = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
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

      // Background image (fills the entire flyer cell)
      if (bgImage) {
        page.drawImage(bgImage, { x, y: bottomY, width: CELL_W, height: CELL_H });
      } else {
        page.drawRectangle({
          x, y: bottomY, width: CELL_W, height: CELL_H,
          color: rgb(0.93, 0.93, 0.93), borderColor: rgb(0.6, 0.6, 0.6), borderWidth: 1,
        });
      }

      // Discount % text — offset from flyer top-left, Y increases downward
      const discount = String(flyers[idx].discountPercent);
      page.drawText(discount, {
        x:     x + TEXT_PERCENT_OFFSET_X,
        y:     topY - TEXT_PERCENT_OFFSET_Y,   // baseline in pdf-lib coords
        size:  TEXT_PERCENT_SIZE,
        font,
        color: TEXT_PERCENT_COLOR,
      });
    }
  }

  return Buffer.from(await pdfDoc.save());
}

// ─────────────────────────────────────────────────────────────────────────────
// PDF 2: Flyers_Back.pdf
// ─────────────────────────────────────────────────────────────────────────────

export async function generateBackPdf(flyers) {
  const [pdfDoc, bgBytes] = await Promise.all([
    PDFDocument.create(),
    fetchImage(BACK_IMAGE_URL),
  ]);
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

      // Background image (fills the entire flyer cell)
      if (bgImage) {
        page.drawImage(bgImage, { x, y: bottomY, width: CELL_W, height: CELL_H });
      } else {
        page.drawRectangle({
          x, y: bottomY, width: CELL_W, height: CELL_H,
          color: rgb(0.93, 0.93, 0.93), borderColor: rgb(0.6, 0.6, 0.6), borderWidth: 1,
        });
      }

      // Barcode — offset from flyer top-left, Y increases downward
      // (topY - BARCODE_OFFSET_Y - BARCODE_HEIGHT) converts to pdf-lib bottom-left
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
// ─────────────────────────────────────────────────────────────────────────────

export async function processAndSendFlyers(chatId, flyers, botToken) {
  const [frontBuf, backBuf] = await Promise.all([
    generateFrontPdf(flyers),
    generateBackPdf(flyers),
  ]);
  await sendDocumentToTelegram(botToken, chatId, frontBuf, 'Flyers_Front.pdf', 'Флайер — олдинги томон 🎟️');
  await sendDocumentToTelegram(botToken, chatId, backBuf,  'Flyers_Back.pdf',  'Флайер — орқа томон 🔖');
}
