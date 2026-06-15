import { processAndSendFlyers } from '../../server/services/flyerPdf.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { chatID, flyers } = req.body;

  if (!chatID) {
    return res.status(400).json({ success: false, error: 'chatID is required' });
  }
  if (!Array.isArray(flyers) || flyers.length === 0) {
    return res.status(400).json({ success: false, error: 'flyers must be a non-empty array' });
  }

  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) {
    return res.status(500).json({ success: false, error: 'TELEGRAM_BOT_TOKEN not configured on server' });
  }

  try {
    await processAndSendFlyers(chatID, flyers, botToken);
    return res.json({ success: true, sent: flyers.length });
  } catch (err) {
    console.error('[flyer/generate]', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
}
