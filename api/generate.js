export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { imageBase64, scene } = req.body;
    if (!imageBase64 || !scene) return res.status(400).json({ error: 'missing params' });

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'API key not configured' });

    const prompt = `あなたは眉毛の専門家です。この顔写真を見て「${scene}」を目指す眉毛アドバイスを返してください。
必ず以下のJSON形式のみで返してください。説明文・マークダウン・コードブロック不要。
{"trim":"削る場所の説明","keep":"残す場所の説明","advice":"アドバイス2〜3文"}`;

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [
            { text: prompt },
            { inline_data: { mime_type: 'image/jpeg', data: imageBase64 } }
          ]}]
        })
      }
    );

    const data = await geminiRes.json();
    const raw = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // JSONを確実に抽出（余計な文字があっても対応）
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('JSON not found in response: ' + raw);

    const result = JSON.parse(match[0]);
    return res.status(200).json(result);

  } catch (error) {
    console.error('Error:', error.message);
    return res.status(500).json({
      trim: '診断を取得できませんでした',
      keep: '再度お試しください',
      advice: error.message
    });
  }
}
