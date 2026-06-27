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

  const prompt = `Foydalanuvchining ushbu moliyaviy buyrug'ini tahlil qil va FAQAT JSON formatida javob qaytar.
Hech qanday kirish so'zi, tushuntirish yoki salomlashish yozma! Faqat va faqat quyidagi tuzilishdagi JSONni qaytar:

{
  "document_type": "Приход" yoki "Расход" (chiqim/rasxod bo'lsa "Расход", tushum/kirim bo'lsa "Приход"),
  "sum_amount": 200000,
  "operation": "На расходы" yoki "Поставщику" yoki "Инвестиции",
  "action_type": "Kommunal to'lov bo'lsa 'Коммунальные', boshqa xarajat bo'lsa 'Прочие'",
  "comment": "qisqa izoh"
}

Qoidalar:
- "ming" so'zi = 3 ta nol (200 ming = 200000)
- "mln" yoki "million" = 6 ta nol (2 mln = 2000000)
- Kirim/tushum/olindi = "Приход"
- Chiqim/rasxod/to'landi/qilindi = "Расход"
- Kommunal, elektr, gaz, suv → action_type = "Коммунальные"
- Boshqa barcha xarajat → action_type = "Прочие"

Foydalanuvchi buyrug'i: "${String(text).trim()}"`;

  try {
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0, maxOutputTokens: 512 },
        }),
      }
    );

    if (!geminiRes.ok) {
      const errBody = await geminiRes.text();
      return res.status(502).json({ detail: `Gemini API xatosi: ${errBody}` });
    }

    const geminiData = await geminiRes.json();
    const rawText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text || '';

    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return res.status(422).json({ detail: 'AI javobidan JSON topilmadi. Buyruqni aniqroq yozing.' });
    }

    const parsed = JSON.parse(jsonMatch[0]);
    const sumAmount = parseFloat(parsed.sum_amount) || 0;

    if (sumAmount <= 0) {
      return res.status(422).json({ detail: 'Pul miqdori topilmadi. Summani aniq yozing.' });
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
