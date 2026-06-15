import { generateFrontPdf, generateBackPdf, processAndSendFlyers } from '../../server/services/flyerPdf.js';

// Stringify any thrown value (Error, string, object) into a readable message
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
  console.log('[flyer/generate] body:', JSON.stringify({ chatID, flyerCount: flyers?.length }));

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

  // Step-by-step so we know exactly which step fails
  try {
    console.log('[flyer/generate] step 1: generating front PDF...');
    const frontBuf = await generateFrontPdf(flyers);
    console.log(`[flyer/generate] front OK — ${frontBuf.length} bytes`);

    console.log('[flyer/generate] step 2: generating back PDF...');
    const backBuf = await generateBackPdf(flyers);
    console.log(`[flyer/generate] back OK — ${backBuf.length} bytes`);

    console.log('[flyer/generate] step 3: sending to Telegram...');
    await processAndSendFlyers(chatID, flyers, botToken);
    console.log('[flyer/generate] Telegram send OK');

    return res.json({ success: true, sent: flyers.length });
  } catch (err) {
    const msg = errMsg(err);
    console.error('[flyer/generate] FAILED:', msg);
    return res.status(500).json({ success: false, error: msg });
  }
}
