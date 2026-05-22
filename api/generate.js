export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  try {
    const { imageBase64, gender } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    const prompt = `あなたは東洋人相学をベースにした印象アドバイザーです。現代的でポジティブな表現で診断してください。性別は${gender}です。

眉毛タイプ別の印象：
・濃い眉：エネルギッシュで存在感があり頼られやすい
・薄い眉：繊細で感受性豊か。自己主張が伝わりにくいことも
・三日月眉・アーチ眉：親しみやすく愛される雰囲気
・一文字眉：誠実で信頼感があるが近づきにくく見られることも
・への字眉：意志が強く情熱的でリーダーシップがある
・下がり眉：優しく共感力が高い
・眉間が広い：開放的でフレンドリー
・眉間が狭い：集中力が高く思慮深い

必ず以下のJSON形式のみで返答してください。マークダウン不要：
{"physiognomy":"眉毛と顔全体から読み取れる性格と印象を200文字で","weakness":"印象の改善点を1文でやさしく","recommendation":"最適な眉毛スタイルと効果を1〜2文で","scene":"mens-business/mens-sexy/mens-clean/mens-strong/womens-business/womens-sexy/womens-natural/womens-cuteのどれか1つ","trim":"削る場所","keep":"残す場所"}`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: prompt },
              { inline_data: { mime_type: 'image/jpeg', data: imageBase64 } }
            ]
          }],
          generationConfig: {
            maxOutputTokens: 2000,
            temperature: 0.8
          }
        })
      }
    );

    if (!response.ok) throw new Error('API error: ' + response.status);

    const data = await response.json();
    const raw = (data.candidates?.[0]?.content?.parts?.[0]?.text || '').trim();

    let result;
    try {
      result = JSON.parse(raw);
    } catch {
      const match = raw.match(/\{[\s\S]*\}/);
      if (match) {
        result = JSON.parse(match[0]);
      } else {
        throw new Error('No JSON: ' + raw.slice(0, 150));
      }
    }

    return res.status(200).json(result);

  } catch (error) {
    console.error('Error:', error.message);
    return res.status(500).json({ error: error.message });
  }
}
