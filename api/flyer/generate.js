import { processAndSendFlyers } from '../../server/services/flyerPdf.js';

function errMsg(e) {
  if (!e) return 'unknown error';
  if (typeof e === 'string') return e;
  if (e instanceof Error) return `${e.message}\n${e.stack ?? ''}`;
  try { return JSON.stringify(e); } catch { return String(e); }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { chatID, flyers } = req.body;
  console.log('[flyer/generate] request:', JSON.stringify({ chatID, flyerCount: flyers?.length }));

  if (!chatID) {
    return res.status(400).json({ success: false, error: 'chatID is required' });
  }
  if (!Array.isArray(flyers) || flyers.length === 0) {
    return res.status(400).json({ success: false, error: 'flyers must be a non-empty array' });
  }

  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) {
    console.error('[flyer/generate] TELEGRAM_BOT_TOKEN not set');
    return res.status(500).json({ success: false, error: 'TELEGRAM_BOT_TOKEN not configured on server' });
  }

  try {
    // processAndSendFlyers handles: image pre-fetch → PDF generation → Telegram delivery.
    // All steps are logged inside the service with timing details.
    await processAndSendFlyers(chatID, flyers, botToken);
    return res.json({ success: true, sent: flyers.length });
  } catch (err) {
    const msg = errMsg(err);
    console.error('[flyer/generate] FAILED:', msg);
    return res.status(500).json({ success: false, error: msg });
  }
}
