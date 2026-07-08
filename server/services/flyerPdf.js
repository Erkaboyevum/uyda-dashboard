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

// FRONT PDF — secondary "17%" label near "chegirmani qo'lga kiriting" text
const TEXT_SECONDARY_OFFSET_X = 36;
const TEXT_SECONDARY_OFFSET_Y = 281;   // pts from cell BOTTOM edge (upward)
const TEXT_SECONDARY_SIZE     = 13;
const TEXT_SECONDARY_COLOR    = rgb(1, 1, 1);

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

// Font URLs — cached in-process after first fetch.
const FREDOKA_URL      = 'https://raw.githubusercontent.com/google/fonts/main/ofl/fredokaone/FredokaOne-Regular.ttf';
const MONTSERRAT_URL   = 'https://raw.githubusercontent.com/google/fonts/main/ofl/montserrat/static/Montserrat-ExtraBold.ttf';

let _fredokaCache    = null;
let _montserratCache = null;

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

// Font bytes cached in-process; returns null on failure (→ HelveticaBold fallback).
async function fetchFredoka() {
  if (_fredokaCache) return _fredokaCache;
  try {
    const res = await axios.get(FREDOKA_URL, { responseType: 'arraybuffer', timeout: 20_000, validateStatus: s => s === 200 });
    _fredokaCache = Buffer.from(res.data);
    return _fredokaCache;
  } catch (err) {
    console.warn(`[pdf] Fredoka font unavailable: ${err.message} — HelveticaBold fallback`);
    return null;
  }
}

async function fetchMontserrat() {
  if (_montserratCache) return _montserratCache;
  try {
    const res = await axios.get(MONTSERRAT_URL, { responseType: 'arraybuffer', timeout: 20_000, validateStatus: s => s === 200 });
    _montserratCache = Buffer.from(res.data);
    return _montserratCache;
  } catch (err) {
    console.warn(`[pdf] Montserrat font unavailable: ${err.message} — HelveticaBold fallback`);
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
    const brightness = 0.65 + 0.30 * (depth - i) / depth;
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

// Simple flyers carry a flat discountPercent; tiered (template) flyers carry
// a thresholds array instead — show a min-max range in that case.
function getPercentDisplay(flyer) {
  if (Array.isArray(flyer.thresholds) && flyer.thresholds.length > 0) {
    const percents = flyer.thresholds.map(th => th.discountPercent);
    const min = Math.min(...percents);
    const max = Math.max(...percents);
    return min === max ? String(max) : `${min}-${max}`;
  }
  return String(flyer.discountPercent);
}

// ─────────────────────────────────────────────────────────────────────────────
// PDF GENERATORS
// Both accept a pre-fetched bgBytes buffer (may be null → gray placeholder).
// The buffer is embedded into the pdf document ONCE, then reused for every cell.
// ─────────────────────────────────────────────────────────────────────────────

async function generateFrontPdf(flyers, bgBytes, fredokaBytes, montserratBytes) {
  const pdfDoc = await PDFDocument.create();

  const font           = fredokaBytes    ? await pdfDoc.embedFont(fredokaBytes)    : await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const secondaryFont  = montserratBytes ? await pdfDoc.embedFont(montserratBytes) : await pdfDoc.embedFont(StandardFonts.HelveticaBold);

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

      const percentText = getPercentDisplay(flyers[idx]);

      const secX = x + TEXT_SECONDARY_OFFSET_X;
      const secY = bottomY + TEXT_SECONDARY_OFFSET_Y;
      const secT = `${percentText}%`;
      // Draw twice with 0.4pt offset — fake-bold for small sizes
      page.drawText(secT, { x: secX + 0.4, y: secY, size: TEXT_SECONDARY_SIZE, font: secondaryFont, color: TEXT_SECONDARY_COLOR });
      page.drawText(secT, { x: secX,       y: secY, size: TEXT_SECONDARY_SIZE, font: secondaryFont, color: TEXT_SECONDARY_COLOR });

      // Ranges ("10-30") are wider than a flat 1-2 digit percent — shrink to fit the cell.
      draw3DText(page, percentText, {
        x:     x + TEXT_PERCENT_OFFSET_X,
        y:     topY - TEXT_PERCENT_OFFSET_Y,
        size:  percentText.length > 2 ? TEXT_PERCENT_SIZE * 0.55 : TEXT_PERCENT_SIZE,
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
// TEMPLATE (ANDOZA) LAYOUT — one flyer per page, full-bleed front.png / back.png.
// Used only for flyers created via the template flow (flyer.thresholds present).
// Manual flyers keep using generateFrontPdf / generateBackPdf above, untouched.
// ─────────────────────────────────────────────────────────────────────────────

const TEMPLATE_FRONT_IMAGE_URL = 'https://silly-hamster-97d004.netlify.app/front.png';
const TEMPLATE_BACK_IMAGE_URL  = 'https://silly-hamster-97d004.netlify.app/back.png';

// PDF page size for the template layout — matches back.png/front.png's native
// 1299×2598 (1:2) aspect ratio exactly, scaled down to sane point dimensions.
const TEMPLATE_PAGE_W = 420;
const TEMPLATE_PAGE_H = 840;

// Barcode box on the BACK page, as fractions of the drawn back.png image —
// NOT hardcoded points, so this stays correct if the asset is swapped for one
// with different native pixel dimensions (as long as the white area proportions
// are similar). Origin top-left, Y increases DOWNWARD (top fraction + height).
// Box sits centered horizontally, below the "QR-kodni skanerlang" text, inside
// the white strip at the bottom of back.png — clear of the orange QR card and
// the product photo above it.
const TEMPLATE_BARCODE_BOX_X_FRAC      = 0.25;
const TEMPLATE_BARCODE_BOX_Y_FRAC      = 0.91;
const TEMPLATE_BARCODE_BOX_WIDTH_FRAC  = 0.50;
const TEMPLATE_BARCODE_BOX_HEIGHT_FRAC = 0.075;

// Scales (imgW,imgH) to fit inside (boxW,boxH) without distortion, centered.
function fitContain(imgW, imgH, boxX, boxY, boxW, boxH) {
  const scale = Math.min(boxW / imgW, boxH / imgH);
  const width  = imgW * scale;
  const height = imgH * scale;
  return { x: boxX + (boxW - width) / 2, y: boxY + (boxH - height) / 2, width, height };
}

// Full-bleed background page: draws bgImage fit-to-page (contain, no distortion).
function drawFullBleedPage(page, bgImage, pageW, pageH) {
  if (!bgImage) {
    page.drawRectangle({ x: 0, y: 0, width: pageW, height: pageH, color: rgb(0.93, 0.93, 0.93) });
    return { x: 0, y: 0, width: pageW, height: pageH };
  }
  const rect = fitContain(bgImage.width, bgImage.height, 0, 0, pageW, pageH);
  page.drawImage(bgImage, rect);
  return rect;
}

export async function generateTemplateFrontPdf(flyers, bgBytes) {
  const pdfDoc  = await PDFDocument.create();
  const bgImage = bgBytes ? await embedImageBuf(pdfDoc, bgBytes) : null;

  for (let i = 0; i < flyers.length; i++) {
    const page = pdfDoc.addPage([TEMPLATE_PAGE_W, TEMPLATE_PAGE_H]);
    drawFullBleedPage(page, bgImage, TEMPLATE_PAGE_W, TEMPLATE_PAGE_H);
  }

  return Buffer.from(await pdfDoc.save());
}

export async function generateTemplateBackPdf(flyers, bgBytes) {
  const pdfDoc  = await PDFDocument.create();
  const bgImage = bgBytes ? await embedImageBuf(pdfDoc, bgBytes) : null;

  for (let i = 0; i < flyers.length; i++) {
    const page = pdfDoc.addPage([TEMPLATE_PAGE_W, TEMPLATE_PAGE_H]);
    const imgRect = drawFullBleedPage(page, bgImage, TEMPLATE_PAGE_W, TEMPLATE_PAGE_H);

    // Barcode box, derived from the drawn image rect (not the raw page) so it
    // stays correct even if the image is letterboxed within the page.
    const boxX      = imgRect.x + TEMPLATE_BARCODE_BOX_X_FRAC * imgRect.width;
    const boxWidth  = TEMPLATE_BARCODE_BOX_WIDTH_FRAC  * imgRect.width;
    const boxHeight = TEMPLATE_BARCODE_BOX_HEIGHT_FRAC * imgRect.height;
    const imgTopY   = imgRect.y + imgRect.height;
    const boxTopY   = imgTopY - TEMPLATE_BARCODE_BOX_Y_FRAC * imgRect.height;
    const boxY      = boxTopY - boxHeight;

    // Reuses the SAME barcode generator as the manual flow — identical value/format.
    const barcodePng   = await makeBarcodeBuffer(flyers[i].barcode);
    const barcodeImage = await pdfDoc.embedPng(barcodePng);
    const drawn = fitContain(barcodeImage.width, barcodeImage.height, boxX, boxY, boxWidth, boxHeight);
    page.drawImage(barcodeImage, drawn);
  }

  return Buffer.from(await pdfDoc.save());
}

// Same execution order guarantee as processAndSendFlyers below.
export async function processAndSendTemplateFlyers(chatId, flyers, botToken) {
  console.log('[pdf] (template) fetching front.png + back.png...');
  const [frontImgBuf, backImgBuf] = await Promise.all([
    fetchImageRaw(TEMPLATE_FRONT_IMAGE_URL),
    fetchImageRaw(TEMPLATE_BACK_IMAGE_URL),
  ]);
  console.log(
    `[pdf] (template) assets ready — front: ${frontImgBuf?.length ?? 'null'}B` +
    `  back: ${backImgBuf?.length ?? 'null'}B`,
  );

  console.log(`[pdf] (template) generating PDFs for ${flyers.length} flyers...`);
  const [frontBuf, backBuf] = await Promise.all([
    generateTemplateFrontPdf(flyers, frontImgBuf),
    generateTemplateBackPdf(flyers, backImgBuf),
  ]);
  console.log(`[pdf] (template) PDFs ready — front: ${frontBuf.length}B  back: ${backBuf.length}B`);

  await sendDocumentToTelegram(botToken, chatId, frontBuf, 'Flyers_Front.pdf', 'Флайер — олдинги томон 🎟️');
  await sendDocumentToTelegram(botToken, chatId, backBuf,  'Flyers_Back.pdf',  'Флайер — орқа томон 🔖');
  console.log('[pdf] (template) both documents delivered to Telegram');
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
  // ── Step 1: Pre-fetch fonts + both background images ─────────────────────
  console.log('[pdf] fetching assets (fonts + background images)...');
  const [fredokaBytes, montserratBytes, frontImgBuf, backImgBuf] = await Promise.all([
    fetchFredoka(),
    fetchMontserrat(),
    fetchImageRaw(FRONT_IMAGE_URL),
    fetchImageRaw(BACK_IMAGE_URL),
  ]);
  console.log(
    `[pdf] assets ready — fredoka: ${fredokaBytes?.length ?? 'null'}B` +
    `  montserrat: ${montserratBytes?.length ?? 'null'}B` +
    `  front: ${frontImgBuf?.length ?? 'null'}B` +
    `  back: ${backImgBuf?.length ?? 'null'}B`,
  );

  // ── Step 2: Generate both PDFs (no network calls for images) ─────────────
  console.log(`[pdf] generating PDFs for ${flyers.length} flyers...`);
  const [frontBuf, backBuf] = await Promise.all([
    generateFrontPdf(flyers, frontImgBuf, fredokaBytes, montserratBytes),
    generateBackPdf(flyers, backImgBuf),
  ]);
  console.log(`[pdf] PDFs ready — front: ${frontBuf.length}B  back: ${backBuf.length}B`);

  // ── Step 3: Send to Telegram ──────────────────────────────────────────────
  await sendDocumentToTelegram(botToken, chatId, frontBuf, 'Flyers_Front.pdf', 'Флайер — олдинги томон 🎟️');
  await sendDocumentToTelegram(botToken, chatId, backBuf,  'Flyers_Back.pdf',  'Флайер — орқа томон 🔖');
  console.log('[pdf] both documents delivered to Telegram');
}
