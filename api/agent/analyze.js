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

  const userInput = String(text).trim();

  // Step 1: Gemini orqali faqat raw_sum va keywords ajratish (Python Ollama qadami analog)
  let extractedSum = 0;
  let keywordsStr  = '';

  try {
    const extractPrompt = `Foydalanuvchi matnidan pul summasini va asosiy kalit so'zlarni ajratib toza JSON formatida ber.
'ming' 3ta nol, 'million' 6ta nol ekanini hisobla. Gap qo'shma. Agar valyuta belgisi bo'lsa uni olib tashlab faqat sonni o'zini ber.
{"raw_sum": 200000, "keywords": ["kalit", "sozlar"]}
Matn: "${userInput}"`;

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: extractPrompt }] }],
          generationConfig: {
            temperature: 0,
            maxOutputTokens: 512,
            responseMimeType: 'application/json',
            thinkingConfig: { thinkingBudget: 0 },
          },
        }),
      }
    );

    if (!geminiRes.ok) {
      const errBody = await geminiRes.text();
      return res.status(502).json({ detail: `Gemini API xatosi: ${errBody}` });
    }

    const geminiData = await geminiRes.json();
    const parts  = geminiData?.candidates?.[0]?.content?.parts || [];
    const rawTxt = parts.filter(p => !p.thought).map(p => p.text || '').join('').trim();
    const parsed = extractJson(rawTxt);

    if (!parsed) {
      return res.status(422).json({ detail: "Buyruqdan ma'lumot ajratib bo'lmadi. Pul summasi va operatsiya turini aniqroq ayting." });
    }

    extractedSum = parseFloat(parsed.raw_sum) || 0;
    const kwList = Array.isArray(parsed.keywords) ? parsed.keywords.map(k => String(k).toLowerCase()) : [];
    keywordsStr  = kwList.join(' ') + ' ' + userInput.toLowerCase();
  } catch (err) {
    return res.status(500).json({ detail: err.message || 'Tahlilda xatolik yuz berdi' });
  }

  if (extractedSum <= 0) {
    return res.status(422).json({ detail: "💰 Summani aniqlay olmadim! Iltimos, qancha pul ekanligini (masalan: '200 ming') aniq ayting." });
  }

  // Step 2: Python orchestrator kalit so'z matching (to'liq port)
  const has = (words) => words.some(w => keywordsStr.includes(w));

  // Valyuta aniqlash
  const currency = has(['$', 'dollar', 'usd', 'baku', 'baksu', "ko'ki", 'yashil', 'dolir', 'dollor'])
    ? 'USD'
    : 'UZS';

  // Hujjat turi
  let docType, operation, actionType;

  if (has(['kirim', 'tushum', 'kassa oldi', 'savdo'])) {
    docType    = 'Приход';
    operation  = '';
    actionType = '';
  } else {
    docType = 'Расход';

    if (has(['svet', 'gaz', 'kommunal', 'tok', 'musor', 'suv', 'elektr', 'energiya', 'chiroq', 'res', 'kanalizatsiya', 'issiqlik'])) {
      actionType = 'Коммунальные платежи';
      operation  = 'На расходы';
    } else if (has(['abu saxiy', 'qurilish', 'remont', 'mebel', 'tovar', 'postavshik', 'furshet', 'podguznik', 'sayding', 'abduvali', 'chinni', 'korkamaz', 'tekstil', 'elcicek', 'herevin', 'optom', 'dostavka', 'firma', 'sklad', 'yuk', 'diller', 'diler', 'mahsulot'])) {
      actionType = 'Оплата поставщикам';
      operation  = 'Поставщику';
    } else if (has(['oylik', 'avans', 'zarp', 'mib', 'ish haqi', 'zarplata', 'bollarga', 'xodim', 'maosh', 'kpi'])) {
      actionType = 'Заработная плата';
      operation  = 'На расходы';
    } else if (has(['bonus', 'premiya', 'taqdirlash', 'markirovka', 'shtrix', 'suyunchi', "rag'bat", 'mukofot'])) {
      actionType = 'Бонус';
      operation  = 'На расходы';
    } else if (has(['nalog', 'soliq', 'yer', 'mulk', 'inspektor', 'gni', 'tamojnya', 'bojxona', 'qqs', 'nds'])) {
      actionType = 'Налоги';
      operation  = 'На расходы';
    } else if (has(['bilet', 'komandirovka', 'vystavka', 'xitoy', 'rossiya', 'safar', 'taksi', 'yol kira', "yo'l", 'mehmonxona', 'avia', 'poezd', 'gastinitsa'])) {
      actionType = 'Командировки';
      operation  = 'На расходы';
    } else if (has(['uzum', 'marketpleys', 'market', 'wildberries', 'ozon', 'zoodmall'])) {
      actionType = 'Расходы маркетплейса';
      operation  = 'На расходы';
    } else if (has(['reklama', 'smm', 'target', 'pr', 'video', 'rolik', 'instagram', 'facebook', 'telegram', 'tiktok'])) {
      actionType = 'SMM таргет видео';
      operation  = 'На расходы';
    } else if (has(['ehson', 'yordam', 'operatsiya', 'kasal', 'kontrakt', 'kur', 'jamiyat', 'daraxt', 'sadaqa', 'masjid', 'beva', 'yetim'])) {
      actionType = 'Благотворительность';
      operation  = 'На расходы';
    } else if (has(['sst', 'sertifikat', 'standart', 'ruxsatnoma', 'litsenziya'])) {
      actionType = 'Сертификация';
      operation  = 'На расходы';
    } else if (has(['kabel', 'lampa', 'rozetka', 'texnik', 'avtomat', 'zapchast', 'usta', 'tuzatish', 'obslujivaniye', 'zapravka', 'moy', 'benzin'])) {
      actionType = 'Техническое обслуживание';
      operation  = 'На расходы';
    } else if (has(['bayram', '8 mart', 'gul', 'futbol', 'kubok', 'tadbirlar', 'choyxona', 'restoran', 'osh', 'korporativ', 'sovg'])) {
      actionType = 'Мероприятие и представительский расходи';
      operation  = 'На расходы';
    } else if (has(['bloger', 'blogger', 'vayn', 'inflyuenser'])) {
      actionType = 'Блоггер';
      operation  = 'На расходы';
    } else if (has(["kantselyariya", "qog'oz", 'ruchka', 'qalam', 'daftar', 'pechat', 'kseroks', 'printer', 'kraska', 'skotch'])) {
      actionType = 'Канцелярские расходы';
      operation  = 'На расходы';
    } else if (has(['bank', 'obmen', 'komissiya', 'foiz', 'xizmat haqi', 'inkassatsiya'])) {
      actionType = 'Банковское обслуживание';
      operation  = 'На расходы';
    } else {
      // Slot filling — maqsad aniqlanmadi
      const ignoreWords = ['chiqim', 'rasxod', 'qil', 'qiling', 'ber', 'berdi', 'tushdi', 'uchun', "so'm", 'ming', 'million', 'pul', 'dan', 'ga', 'dollar', 'usd', 'baku', '$'];
      const meaningfulWords = userInput.toLowerCase().split(/\s+/)
        .filter(w => !/\d/.test(w) && !ignoreWords.includes(w));

      if (meaningfulWords.length === 0) {
        const currLabel = currency === 'USD' ? `$${extractedSum.toLocaleString()}` : `${extractedSum.toLocaleString()} so'm`;
        return res.status(422).json({
          detail: `📝 Siz ${currLabel} dedingiz, lekin u NIMA UCHUN sarflanganini aytmadingiz! Iltimos, xarajat maqsadini bildiring (masalan: obedga, arendaga).`,
        });
      }

      actionType = 'Прочие операционные расходы';
      operation  = 'На расходы';
    }
  }

  return res.status(200).json({
    document_type: docType,
    sum_amount:    extractedSum,
    currency,
    operation,
    action_type:   actionType,
    comment:       userInput,
  });
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
