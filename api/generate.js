export default async function handler(req, res) {
  // CORS設定
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { imageBase64, scene } = req.body;

    if (!imageBase64 || !scene) {
      return res.status(400).json({ error: 'imageBase64 and scene are required' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'API key not configured' });
    }

    const prompt = `あなたは眉毛の専門家です。この顔写真を見て、「${scene}」を目指す場合の眉毛アドバイスを日本語で答えてください。

以下の3つを必ずJSONで返してください（他の文字は一切不要）：
{
  "trim": "削る・整えるべき場所の具体的な説明（例：眉頭の上側の産毛、眉山の下部など）",
  "keep": "残すべき・描き足すべき場所の説明",
  "advice": "この人の顔の特徴を踏まえた具体的なアドバイス（2〜3文）"
}`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: prompt },
              { inline_data: { mime_type: 'image/jpeg', data: imageBase64 } }
            ]
          }]
        })
      }
    );

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const clean = text.replace(/```json|```/g, '').trim();
    const result = JSON.parse(clean);

    return res.status(200).json(result);

  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ error: '診断に失敗しました' });
  }
}
