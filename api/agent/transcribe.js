export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { audio_base64, mime_type } = req.body || {};
  if (!audio_base64) {
    return res.status(400).json({ detail: "audio_base64 maydoni kerak" });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ detail: 'GEMINI_API_KEY serverda sozlanmagan' });
  }

  const sttPrompt =
    "Ushbu audio fayldagi o'zbekcha nutqni o'ta aniq matnga o'gir. " +
    "Nutq ko'cha tilida, jargon yoki ruscha-o'zbekcha aralashgan bo'lishi mumkin " +
    "(masalan: 'svetga', 'zarpga bervor', 'obet', 'arendaga', 'kirdi', 'tushdi'). " +
    "Qanday eshitilsa, mazmunni yo'qotmay shunday yoz. " +
    "DIQQAT: Barcha sonlar va pul miqdorlarini faqat raqamda yoz " +
    "(masalan, 'ikki yuz ming' desa 200000 deb). Ortiqcha izohsiz faqat matnni o'zini qaytar.";

  try {
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              {
                inline_data: {
                  mime_type: mime_type || 'audio/webm',
                  data: audio_base64,
                },
              },
              { text: sttPrompt },
            ],
          }],
          generationConfig: { temperature: 0 },
        }),
      }
    );

    if (!geminiRes.ok) {
      const errBody = await geminiRes.text();
      return res.status(502).json({ detail: `Gemini API xatosi: ${errBody}` });
    }

    const data = await geminiRes.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';

    if (!text) {
      return res.status(422).json({ detail: "Ovozdan matn ajratib bo'lmadi. Qayta urinib ko'ring." });
    }

    return res.status(200).json({ text });
  } catch (err) {
    return res.status(500).json({ detail: err.message || 'Ovoz tahlilida xatolik' });
  }
}
