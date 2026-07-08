import { Router } from 'express';
import { processAndSendFlyers, processAndSendTemplateFlyers } from '../services/flyerPdf.js';

const router = Router();

// A flyer created via a template (andoza) carries a thresholds array (tiered
// discount); manual flyers carry a flat discountPercent instead. This is the
// same signal getPercentDisplay() in flyerPdf.js already relies on.
function isTemplateFlyer(flyer) {
  return Array.isArray(flyer.thresholds) && flyer.thresholds.length > 0;
}

/**
 * POST /flyer/generate
 *
 * Body: { chatID: string|number, flyers: [{ barcode: string, discountPercent?: number, thresholds?: Array }], promoterName?: string }
 * Each flyer has either a flat discountPercent (simple/manual) or a thresholds array (tiered/template).
 * promoterName (the counterparty's display name) is optional — used to label the Telegram filename/caption.
 *
 * Generates Flyers_Front.pdf and Flyers_Back.pdf and sends both to chatID via Telegram.
 * Template flyers (thresholds present) use the front.png/back.png template layout with the
 * barcode placed in the white area of back.png; manual flyers keep the existing grid layout.
 * Returns immediately after kicking off generation (non-blocking for the frontend).
 */
router.post('/generate', async (req, res) => {
  const { chatID, flyers, promoterName } = req.body;

  if (!chatID) {
    return res.status(400).json({ success: false, error: 'chatID is required' });
  }
  if (!Array.isArray(flyers) || flyers.length === 0) {
    return res.status(400).json({ success: false, error: 'flyers must be a non-empty array' });
  }

  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) {
    return res.status(500).json({ success: false, error: 'TELEGRAM_BOT_TOKEN not configured' });
  }

  // Respond immediately so the Mini App UI doesn't block.
  // PDF generation + Telegram upload runs in the background.
  res.json({ success: true, queued: flyers.length });

  // All flyers in a single request come from the same creation flow, so the
  // first flyer's shape determines which layout the whole batch uses.
  const generate = isTemplateFlyer(flyers[0]) ? processAndSendTemplateFlyers : processAndSendFlyers;

  generate(chatID, flyers, botToken, promoterName).catch(err => {
    console.error(`[flyer] chatID=${chatID} error:`, err.message);
  });
});

export default router;
