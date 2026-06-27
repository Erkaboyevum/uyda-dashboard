export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { text } = req.body || {};
  if (!text || !String(text).trim()) {
    return res.status(400).json({ detail: "Matn bo'sh bo'lmasligi kerak" });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ detail: 'GEMINI_API_KEY serverda sozlanmagan' });
  }

  // System instruction orqali modelni faqat JSON chiqarishga majburlash
  const systemInstruction = `Sen moliyaviy buyruqlarni tahlil qiladigan JSON generatorsan.
QOIDA: Har doim FAQAT sof JSON obyekti qaytar. Hech qanday markdown, kod bloki, izoh, tushuntirish YOZMA.
Javob to'g'ridan-to'g'ri { bilan boshlanishi va } bilan tugashi SHART.`;

  const userPrompt = `Quyidagi o'zbekcha moliyaviy buyruqni tahlil qil:
"${String(text).trim()}"

Quyidagi JSON tuzilishida javob qaytar (boshqa hech narsa yozma):
{"document_type":"...","sum_amount":0,"operation":"...","action_type":"...","comment":"..."}

Qoidalar:
- document_type: "Приход" (kirim/tushum/olindi) yoki "Расход" (chiqim/to'landi/sarflandi)
- sum_amount: faqat raqam. "ming"=×1000, "mln"/"million"=×1000000
- operation (faqat Расход uchun): "На расходы" yoki "Поставщику" yoki "Инвестиции"
- action_type: elektr/gaz/suv/kommunal bo'lsa "Коммунальные", aks holda "Прочие"
- comment: 3-5 so'zlik qisqa izoh`;

  try {
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemInstruction }] },
          contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
          generationConfig: {
            temperature: 0,
            maxOutputTokens: 256,
            responseMimeType: 'application/json',
          },
        }),
      }
    );

    if (!geminiRes.ok) {
      const errBody = await geminiRes.text();
      return res.status(502).json({ detail: `Gemini API xatosi: ${errBody}` });
    }

    const geminiData = await geminiRes.json();

    // Barcha parts ichidan matn yig'amiz (thinking modellar bir nechta part chiqarishi mumkin)
    const parts = geminiData?.candidates?.[0]?.content?.parts || [];
    const rawText = parts.map(p => p.text || '').join('').trim();

    const parsed = extractJson(rawText);
    if (!parsed) {
      // Debug uchun xom javobni loglash
      console.error('[analyze] JSON topilmadi. Raw:', rawText.slice(0, 500));
      return res.status(422).json({
        detail: 'Buyruqdan ma\'lumot ajratib bo\'lmadi. Pul summasi va operatsiya turini aniqroq ayting.',
      });
    }

    const sumAmount = parseFloat(parsed.sum_amount) || 0;
    if (sumAmount <= 0) {
      return res.status(422).json({ detail: 'Pul miqdori topilmadi. Masalan: "500 ming so\'m chiqim" deb yozing.' });
    }

    return res.status(200).json({
      document_type: parsed.document_type || 'Расход',
      sum_amount: sumAmount,
      operation: parsed.operation || 'На расходы',
      action_type: parsed.action_type || 'Прочие',
      comment: parsed.comment || '',
    });
  } catch (err) {
    return res.status(500).json({ detail: err.message || 'Tahlilda xatolik yuz berdi' });
  }
}

// Markdown kod bloki, extra matn va boshqa shovqindan JSON ni ajratib olish
function extractJson(raw) {
  if (!raw) return null;

  // 1. responseMimeType=application/json bo'lsa to'g'ridan-to'g'ri parse
  try { return JSON.parse(raw); } catch {}

  // 2. ```json ... ``` yoki ``` ... ``` bloki
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) {
    try { return JSON.parse(fenced[1].trim()); } catch {}
  }

  // 3. Birinchi { dan oxirgi } gacha
  const start = raw.indexOf('{');
  const end   = raw.lastIndexOf('}');
  if (start !== -1 && end > start) {
    try { return JSON.parse(raw.slice(start, end + 1)); } catch {}
  }

  return null;
}
