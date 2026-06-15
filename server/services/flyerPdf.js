import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import bwipjs from 'bwip-js';
import axios from 'axios';
import FormData from 'form-data';

// ─────────────────────────────────────────────────────────────────────────────
// LAYOUT CONFIG — adjust these to change the grid without touching logic
// ─────────────────────────────────────────────────────────────────────────────

// A3 Portrait: 297mm × 420mm = 842 × 1191 pts  (1 pt = 0.353 mm)
const A3_W = 842;
const A3_H = 1191;

const COLS = 2;   // flyers per row
const ROWS = 3;   // rows per page

const CELL_W = A3_W / COLS;  // 421 pt
const CELL_H = A3_H / ROWS;  // 397 pt

// ─────────────────────────────────────────────────────────────────────────────
// FRONT PDF — text overlay positions (relative to each cell's bottom-left)
// ─────────────────────────────────────────────────────────────────────────────

const FRONT = {
  // Large bold number printed next to the big golden "%" sign on the design
  bigNumber: {
    x:     82,                       // pts right of cell left edge
    y:     208,                      // pts above cell bottom edge
    size:  86,
    color: rgb(0.976, 0.816, 0.133), // golden yellow  (#F9D022)
  },

  // Smaller number embedded inside the paragraph/description text block
  smallNumber: {
    x:     126,
    y:     132,
    size:  17,
    color: rgb(1, 1, 1),             // white
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// BACK PDF — barcode overlay position (relative to each cell's bottom-left)
// ─────────────────────────────────────────────────────────────────────────────

const BACK = {
  barcode: {
    x:      61,    // pts right of cell left edge
    y:      26,    // pts above cell bottom edge
    width:  299,   // pts
    height: 58,    // pts
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Image URLs
// ─────────────────────────────────────────────────────────────────────────────

const FRONT_IMAGE_URL = 'https://cdn.erkaboyev.uz/Flyer/Flyer_front.png';
const BACK_IMAGE_URL  = 'https://cdn.erkaboyev.uz/Flyer/Flyer_back.png';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

// Simple in-process cache so the two images are only downloaded once per run.
const _imageCache = new Map();

async function fetchPng(url) {
  if (_imageCache.has(url)) return _imageCache.get(url);

  const res = await axios.get(url, {
    responseType: 'arraybuffer',
    timeout: 20_000,
  });
  const buf = Buffer.from(res.data);
  _imageCache.set(url, buf);
  return buf;
}

/**
 * Returns the (x, y) of a cell's bottom-left corner in pdf-lib page coordinates.
 * pdf-lib origin is bottom-left of the page.
 */
function cellOrigin(col, row) {
  return {
    x: col * CELL_W,
    y: A3_H - (row + 1) * CELL_H,
  };
}

/**
 * Generate a Code128 barcode PNG buffer for the given text.
 */
async function makeBarcodeBuffer(text) {
  return new Promise((resolve, reject) => {
    bwipjs.toBuffer(
      {
        bcid:            'code128',
        text:            text,
        scale:           3,
        height:          14,          // mm — controls barcode stripe height
        includetext:     false,
        backgroundcolor: 'ffffff',
      },
      (err, png) => (err ? reject(err) : resolve(png)),
    );
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// PDF 1: Flyers_Front.pdf
// ─────────────────────────────────────────────────────────────────────────────

export async function generateFrontPdf(flyers) {
  const [pdfDoc, bgBytes] = await Promise.all([
    PDFDocument.create(),
    fetchPng(FRONT_IMAGE_URL),
  ]);

  const font    = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const bgImage = await pdfDoc.embedPng(bgBytes);

  const perPage = COLS * ROWS;
  const numPages = Math.ceil(flyers.length / perPage);

  for (let p = 0; p < numPages; p++) {
    const page = pdfDoc.addPage([A3_W, A3_H]);

    for (let slot = 0; slot < perPage; slot++) {
      const idx = p * perPage + slot;
      if (idx >= flyers.length) break;

      const col        = slot % COLS;
      const row        = Math.floor(slot / COLS);
      const { x: cx, y: cy } = cellOrigin(col, row);
      const discount   = String(flyers[idx].discountPercent);

      // Background image fills the entire cell
      page.drawImage(bgImage, {
        x: cx, y: cy,
        width: CELL_W, height: CELL_H,
      });

      // Large discount number next to the golden % glyph
      page.drawText(discount, {
        x:    cx + FRONT.bigNumber.x,
        y:    cy + FRONT.bigNumber.y,
        size: FRONT.bigNumber.size,
        font,
        color: FRONT.bigNumber.color,
      });

      // Small discount number inside the paragraph block
      page.drawText(discount, {
        x:    cx + FRONT.smallNumber.x,
        y:    cy + FRONT.smallNumber.y,
        size: FRONT.smallNumber.size,
        font,
        color: FRONT.smallNumber.color,
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
    fetchPng(BACK_IMAGE_URL),
  ]);

  const bgImage = await pdfDoc.embedPng(bgBytes);

  const perPage = COLS * ROWS;
  const numPages = Math.ceil(flyers.length / perPage);

  for (let p = 0; p < numPages; p++) {
    const page = pdfDoc.addPage([A3_W, A3_H]);

    for (let slot = 0; slot < perPage; slot++) {
      const idx = p * perPage + slot;
      if (idx >= flyers.length) break;

      const col        = slot % COLS;
      const row        = Math.floor(slot / COLS);
      const { x: cx, y: cy } = cellOrigin(col, row);

      // Background image fills the entire cell
      page.drawImage(bgImage, {
        x: cx, y: cy,
        width: CELL_W, height: CELL_H,
      });

      // Generate barcode and embed — each flyer gets its own unique barcode
      const barcodePng   = await makeBarcodeBuffer(flyers[idx].barcode);
      const barcodeImage = await pdfDoc.embedPng(barcodePng);

      page.drawImage(barcodeImage, {
        x:      cx + BACK.barcode.x,
        y:      cy + BACK.barcode.y,
        width:  BACK.barcode.width,
        height: BACK.barcode.height,
      });
    }
  }

  return Buffer.from(await pdfDoc.save());
}

// ─────────────────────────────────────────────────────────────────────────────
// Telegram delivery
// ─────────────────────────────────────────────────────────────────────────────

async function sendDocumentToTelegram(botToken, chatId, pdfBuffer, filename, caption) {
  const url  = `https://api.telegram.org/bot${botToken}/sendDocument`;
  const form = new FormData();

  form.append('chat_id', String(chatId));
  form.append('document', pdfBuffer, {
    filename,
    contentType: 'application/pdf',
  });
  if (caption) form.append('caption', caption);

  const res = await axios.post(url, form, {
    headers:       form.getHeaders(),
    maxBodyLength: Infinity,
    timeout:       40_000,
  });

  if (!res.data?.ok) {
    throw new Error(`Telegram API error: ${JSON.stringify(res.data)}`);
  }

  return res.data;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main entry — called by the route handler
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @param {string|number} chatId    Telegram user ID
 * @param {Array<{ barcode: string, discountPercent: number }>} flyers
 * @param {string} botToken         Telegram bot token
 */
export async function processAndSendFlyers(chatId, flyers, botToken) {
  // Generate both PDFs in parallel — background images are cached after first request
  const [frontBuf, backBuf] = await Promise.all([
    generateFrontPdf(flyers),
    generateBackPdf(flyers),
  ]);

  // Send sequentially so Telegram delivers them in order
  await sendDocumentToTelegram(botToken, chatId, frontBuf, 'Flyers_Front.pdf', 'Флайер — олдинги томон 🎟️');
  await sendDocumentToTelegram(botToken, chatId, backBuf,  'Flyers_Back.pdf',  'Флайер — орқа томон 🔖');
}
