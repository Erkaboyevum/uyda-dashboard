import { Router } from 'express';
import { processAndSendFlyers } from '../services/flyerPdf.js';

const router = Router();

/**
 * POST /flyer/generate
 *
 * Body: { chatID: string|number, flyers: [{ barcode: string, discountPercent: number }] }
 *
 * Generates Flyers_Front.pdf and Flyers_Back.pdf and sends both to chatID via Telegram.
 * Returns immediately after kicking off generation (non-blocking for the frontend).
 */
router.post('/generate', async (req, res) => {
  const { chatID, flyers } = req.body;

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

  processAndSendFlyers(chatID, flyers, botToken).catch(err => {
    console.error(`[flyer] chatID=${chatID} error:`, err.message);
  });
});

export default router;
