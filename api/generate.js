export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  try {
    const { imageBase64, gender } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    const prompt = `あなたは人相学と眉毛の専門家です。この顔写真を分析してください。
性別は「${gender}」です。

以下のJSON形式のみで返してください。説明文・マークダウン不要。

{
  "physiognomy": "人相学の見解を200文字程度で。この人の性格・印象・運勢を具体的に述べる",
  "weakness": "顔相から読み取れる弱点や改善できる印象を1文で",
  "recommendation": "その弱点を眉毛で補うための提案を1〜2文で具体的に",
  "scene": "以下から最適なシーンを1つだけ返す。mens-business / mens-sexy / mens-clean / mens-strong / womens-business / womens-sexy / womens-natural / womens-cute",
  "trim": "削る・整える場所を具体的に",
  "keep": "残す・描き足す場所を具体的に"
}`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [
            { text: prompt },
            { inline_data: { mime_type: 'image/jpeg', data: imageBase64 } }
          ]}],
          generationConfig: { maxOutputTokens: 2000, temperature: 0.8 }
        })
      }
    );

    if (!response.ok) throw new Error(`API error: ${response.status}`);

    const data = await response.json();
    const raw = (data.candidates?.[0]?.content?.parts?.[0]?.text || '').trim();

    let result;
    try {
      result = JSON.parse(raw);
    } catch {
      const match = raw.match(/\{[\s\S]*\}/);
      if (match) result = JSON.parse(match[0]);
      else throw new Error('parse failed: ' + raw.slice(0, 100));
    }

    return res.status(200).json(result);

  } catch (error) {
    console.error('Error:', error.message);
    return res.status(500).json({ error: error.message });
  }
}
