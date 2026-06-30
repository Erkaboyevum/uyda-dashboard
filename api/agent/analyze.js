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

  const cleanText = String(text).trim();

  const systemInstruction = `Sen moliyaviy buyruqlarni tahlil qiladigan JSON generatorsan.
QOIDA: Har doim FAQAT sof JSON obyekti qaytar. Hech qanday markdown, kod bloki, izoh, tushuntirish YOZMA.
Javob to'g'ridan-to'g'ri { bilan boshlanishi va } bilan tugashi SHART.`;

  const userPrompt = `Quyidagi o'zbekcha (ko'cha tili, ruscha-o'zbekcha aralash) moliyaviy buyruqni tahlil qil:
"${cleanText}"

FAQAT quyidagi JSON formatda qaytar:
{"document_type":"...","sum_amount":0,"currency":"UZS","operation":"...","action_type":"...","comment":"..."}

QOIDALAR:

document_type:
- "Приход" → kirim, tushum, kassa oldi, savdo, keldi, tushdi
- "Расход" → chiqim, rasxod, to'landi, sarflandi, berdi, chiqdi, to'la, ber

sum_amount: faqat son. "ming"=×1000, "million"/"mln"=×1000000. "ikki yuz ming"=200000.

currency:
- "USD" → $, dollar, usd, baku, baksu, ko'ki, yashil, dolir, dollor
- "UZS" → barcha boshqa holat

operation (faqat Расход uchun):
- "Поставщику" → tovar, mahsulot, postavshik, optom, sklad, firma, diller, diler
- "На расходы" → barcha boshqa Расход

action_type (faqat Расход uchun — quyidagi ro'yxatdan mos birini tanlа, topa olmasa null qaytar):
- "Коммунальные платежи" → svet, gaz, tok, suv, elektr, energiya, kommunal, chiroq, musor, issiqlik, kanalizatsiya, res
- "Оплата поставщикам" → tovar, mahsulot, postavshik, mebel, remont, qurilish, optom, firma, dostavka, sklad, yuk, diller, chinni, tekstil, podguznik, sayding, furshet, abduvali, elcicek, herevin
- "Заработная плата" → oylik, avans, zarp, maosh, ish haqi, zarplata, xodim, kpi, mib, bollarga
- "Бонус" → bonus, premiya, rag'bat, mukofot, suyunchi, taqdirlash, markirovka, shtrix
- "Налоги" → nalog, soliq, yer, mulk, gni, tamojnya, bojxona, qqs, nds, inspektor
- "Командировки" → bilet, komandirovka, safar, taksi, yo'l, mehmonxona, avia, poezd, xitoy, rossiya, vystavka, gastinitsa
- "Расходы маркетплейса" → uzum, wildberries, ozon, marketpleys, zoodmall, market
- "SMM таргет видео" → reklama, smm, target, instagram, telegram, tiktok, facebook, video, rolik, pr
- "Благотворительность" → ehson, sadaqa, masjid, yordam, yetim, beva, kasal, jamiyat, daraxt
- "Сертификация" → sertifikat, litsenziya, ruxsatnoma, standart, sst
- "Техническое обслуживание" → usta, tuzatish, zapchast, benzin, moy, zapravka, kabel, lampa, rozetka, avtomat, texnik, obslujivaniye
- "Мероприятие и представительский расходи" → restoran, choyxona, osh, bayram, futbol, tadbirlar, korporativ, sovg, gul, kubok, 8mart
- "Блоггер" → bloger, blogger, inflyuenser, vayn
- "Канцелярские расходы" → qog'oz, ruchka, printer, kseroks, kantselyariya, qalam, daftar, pechat, kraska, skotch
- "Банковское обслуживание" → bank, komissiya, inkassatsiya, obmen, foiz, xizmat haqi
- "Прочие операционные расходы" → boshqa aniq aniqlangan xarajatlar

comment: original buyruqdan qisqa 3-5 so'zlik izoh`;

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
    const parts = geminiData?.candidates?.[0]?.content?.parts || [];
    const rawText = parts.map(p => p.text || '').join('').trim();

    const parsed = extractJson(rawText);
    if (!parsed) {
      console.error('[analyze] JSON topilmadi. Raw:', rawText.slice(0, 500));
      return res.status(422).json({
        detail: "Buyruqdan ma'lumot ajratib bo'lmadi. Pul summasi va operatsiya turini aniqroq ayting.",
      });
    }

    const sumAmount = parseFloat(parsed.sum_amount) || 0;
    if (sumAmount <= 0) {
      return res.status(422).json({ detail: "Pul miqdori topilmadi. Masalan: '500 ming so'm chiqim' deb yozing." });
    }

    const currency = parsed.currency === 'USD' ? 'USD' : 'UZS';
    const docType  = parsed.document_type || 'Расход';

    // Slot filling: Расход lekin category aniqlanmagan
    if (docType === 'Расход' && !parsed.action_type) {
      const currLabel = currency === 'USD'
        ? `$${sumAmount.toLocaleString()}`
        : `${sumAmount.toLocaleString()} so'm`;
      return res.status(422).json({
        detail: `📝 Siz ${currLabel} dedingiz, lekin nima uchun ekanini aytmadingiz. Iltimos, xarajat maqsadini bildiring (masalan: obedga, arendaga, svetga).`,
      });
    }

    return res.status(200).json({
      document_type: docType,
      sum_amount:    sumAmount,
      currency,
      operation:     parsed.operation   || (docType === 'Расход' ? 'На расходы' : ''),
      action_type:   parsed.action_type || '',
      comment:       parsed.comment     || '',
    });
  } catch (err) {
    return res.status(500).json({ detail: err.message || 'Tahlilda xatolik yuz berdi' });
  }
}

function extractJson(raw) {
  if (!raw) return null;
  try { return JSON.parse(raw); } catch {}
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) { try { return JSON.parse(fenced[1].trim()); } catch {} }
  const start = raw.indexOf('{');
  const end   = raw.lastIndexOf('}');
  if (start !== -1 && end > start) { try { return JSON.parse(raw.slice(start, end + 1)); } catch {} }
  return null;
}
