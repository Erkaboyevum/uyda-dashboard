import { processAndSendFlyers, processAndSendTemplateFlyers } from '../../server/services/flyerPdf.js';

// A flyer created via a template (andoza) carries a thresholds array (tiered
// discount); manual flyers carry a flat discountPercent instead. Same signal
// getPercentDisplay() in flyerPdf.js relies on — kept in sync with
// server/routes/flyer.js's isTemplateFlyer().
function isTemplateFlyer(flyer) {
  return Array.isArray(flyer.thresholds) && flyer.thresholds.length > 0;
}

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

  const { chatID, flyers, promoterName } = req.body;
  console.log('[flyer/generate] request:', JSON.stringify({ chatID, flyerCount: flyers?.length, promoterName }));

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
    // All flyers in a single request come from the same creation flow, so the
    // first flyer's shape determines which layout the whole batch uses.
    // Handles: image pre-fetch → PDF generation → Telegram delivery, all
    // logged inside the service with timing details.
    const generate = isTemplateFlyer(flyers[0]) ? processAndSendTemplateFlyers : processAndSendFlyers;
    await generate(chatID, flyers, botToken, promoterName);
    return res.json({ success: true, sent: flyers.length });
  } catch (err) {
    const msg = errMsg(err);
    console.error('[flyer/generate] FAILED:', msg);
    return res.status(500).json({ success: false, error: msg });
  }
}
