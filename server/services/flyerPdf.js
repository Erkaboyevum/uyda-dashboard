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

const CELL_W = PAGE_W / COLS;   // ≈ 280.67 pt  — used as flyerWidth in loops
const CELL_H = PAGE_H / ROWS;   // = 595.5  pt  — used as flyerHeight in loops

// ─────────────────────────────────────────────────────────────────────────────
// ASSETS
// ─────────────────────────────────────────────────────────────────────────────

const FRONT_IMAGE_URL = 'https://cdn.erkaboyev.uz/Flyer/Flyer_front.png';
const BACK_IMAGE_URL  = 'https://cdn.erkaboyev.uz/Flyer/Flyer_back.png';

// Original JulietaUla repo — the authoritative source for Montserrat ExtraBold TTF.
const MONTSERRAT_EXTRABOLD_URL =
  'https://raw.githubusercontent.com/JulietaUla/Montserrat/master/fonts/ttf/Montserrat-ExtraBold.ttf';

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

// Background images: NOT cached — fresh fetch every request so a one-off CDN
// failure never poisons subsequent calls.
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

// Font bytes: SAFE to cache in-process — TTF files are static.
// Warm Vercel instances reuse the cached buffer with zero network overhead.
// Failed fetches are NOT cached so the next request can retry.
const _fontCache = new Map();

async function fetchFontBytes(url) {
  if (_fontCache.has(url)) {
    console.log('[pdf] font: in-process cache hit');
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
    console.log(`[pdf] font fetched and cached — ${buf.length}B`);
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

// Code128 barcode → PNG buffer.  pdf-lib's drawImage dimensions scale the result.
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

// Returns the absolute bottom-left corner of a grid cell in pdf-lib coordinates.
// flyerX = left edge, flyerY = bottom edge (Y=0 is page bottom in pdf-lib).
function cellOrigin(col, row) {
  return {
    flyerX: col * CELL_W,
    flyerY: PAGE_H - (row + 1) * CELL_H,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// PDF GENERATORS
//
// All rendering positions are calculated as percentages of the flyer's own
// dimensions (CELL_W × CELL_H), anchored to the cell's bottom-left corner
// (flyerX, flyerY).  Y increases UPWARD — standard pdf-lib convention.
//
// To shift something: change the multiplier.
//   • Higher Y multiplier  → higher on the flyer
//   • Higher X multiplier  → further right on the flyer
// ─────────────────────────────────────────────────────────────────────────────

async function generateFrontPdf(flyers, bgBytes, fontBytes) {
  const pdfDoc = await PDFDocument.create();

  const font = fontBytes
    ? await pdfDoc.embedFont(fontBytes)
    : await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const bgImage = bgBytes ? await embedImageBuf(pdfDoc, bgBytes) : null;

  const perPage  = COLS * ROWS;
  const numPages = Math.ceil(flyers.length / perPage);
  const flyerWidth  = CELL_W;
  const flyerHeight = CELL_H;

  for (let p = 0; p < numPages; p++) {
    const page = pdfDoc.addPage([PAGE_W, PAGE_H]);

    for (let slot = 0; slot < perPage; slot++) {
      const idx = p * perPage + slot;
      if (idx >= flyers.length) break;

      const col = slot % COLS;
      const row = Math.floor(slot / COLS);
      const { flyerX, flyerY } = cellOrigin(col, row);

      // ── Background ────────────────────────────────────────────────────────
      if (bgImage) {
        page.drawImage(bgImage, { x: flyerX, y: flyerY, width: flyerWidth, height: flyerHeight });
      } else {
        page.drawRectangle({
          x: flyerX, y: flyerY, width: flyerWidth, height: flyerHeight,
          color: rgb(0.93, 0.93, 0.93), borderColor: rgb(0.6, 0.6, 0.6), borderWidth: 1,
        });
      }

      const discount = flyers[idx].discountPercent;

      // ── Large primary number ("17") ───────────────────────────────────────
      page.drawText(String(discount), {
        x:     flyerX + flyerWidth  * 0.35,  // centers horizontally before the % sign
        y:     flyerY + flyerHeight * 0.55,  // aligns with the golden % graphic
        size:  flyerHeight * 0.22,           // ~130 pt at 595 pt cell height
        font,
        color: rgb(1, 1, 1),
      });

      // ── Small secondary label ("17%") ─────────────────────────────────────
      page.drawText(`${discount}%`, {
        x:     flyerX + flyerWidth  * 0.15,  // left margin
        y:     flyerY + flyerHeight * 0.27,  // just above pillow, aligned with paragraph
        size:  flyerHeight * 0.04,           // ~24 pt
        font,
        color: rgb(1, 1, 1),
      });
    }
  }

  return Buffer.from(await pdfDoc.save());
}

async function generateBackPdf(flyers, bgBytes) {
  const pdfDoc = await PDFDocument.create();

  const bgImage = bgBytes ? await embedImageBuf(pdfDoc, bgBytes) : null;

  const perPage  = COLS * ROWS;
  const numPages = Math.ceil(flyers.length / perPage);
  const flyerWidth  = CELL_W;
  const flyerHeight = CELL_H;

  for (let p = 0; p < numPages; p++) {
    const page = pdfDoc.addPage([PAGE_W, PAGE_H]);

    for (let slot = 0; slot < perPage; slot++) {
      const idx = p * perPage + slot;
      if (idx >= flyers.length) break;

      const col = slot % COLS;
      const row = Math.floor(slot / COLS);
      const { flyerX, flyerY } = cellOrigin(col, row);

      // ── Background ────────────────────────────────────────────────────────
      if (bgImage) {
        page.drawImage(bgImage, { x: flyerX, y: flyerY, width: flyerWidth, height: flyerHeight });
      } else {
        page.drawRectangle({
          x: flyerX, y: flyerY, width: flyerWidth, height: flyerHeight,
          color: rgb(0.93, 0.93, 0.93), borderColor: rgb(0.6, 0.6, 0.6), borderWidth: 1,
        });
      }

      // ── Barcode (white box at bottom) ─────────────────────────────────────
      const barcodeW = flyerWidth  * 0.60;
      const barcodeH = flyerHeight * 0.07;

      const barcodePng   = await makeBarcodeBuffer(flyers[idx].barcode);
      const barcodeImage = await pdfDoc.embedPng(barcodePng);
      page.drawImage(barcodeImage, {
        x:      flyerX + flyerWidth  * 0.20,  // centers barcode horizontally
        y:      flyerY + flyerHeight * 0.03,  // 3% from bottom — inside white box
        width:  barcodeW,
        height: barcodeH,
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
//   1. Pre-fetch font + both background images in parallel (fully awaited)
//   2. Generate both PDFs in parallel (zero network I/O at this stage)
//   3. Send front PDF → back PDF to Telegram
// ─────────────────────────────────────────────────────────────────────────────

export async function processAndSendFlyers(chatId, flyers, botToken) {
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

  console.log(`[pdf] generating PDFs for ${flyers.length} flyers...`);
  const [frontBuf, backBuf] = await Promise.all([
    generateFrontPdf(flyers, frontImgBuf, fontBytes),
    generateBackPdf(flyers, backImgBuf),
  ]);
  console.log(`[pdf] PDFs ready — front: ${frontBuf.length}B  back: ${backBuf.length}B`);

  await sendDocumentToTelegram(botToken, chatId, frontBuf, 'Flyers_Front.pdf', 'Флайер — олдинги томон 🎟️');
  await sendDocumentToTelegram(botToken, chatId, backBuf,  'Flyers_Back.pdf',  'Флайер — орқа томон 🔖');
  console.log('[pdf] both documents delivered to Telegram');
}
