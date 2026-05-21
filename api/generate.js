export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  try {
    const { imageBase64, gender } = req.body;
    
    // バリデーション
    if (!imageBase64 || !gender) {
      return res.status(400).json({ error: 'Missing required fields: imageBase64 or gender' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error('Server Configuration Error: GEMINI_API_KEY is missing.');
      return res.status(500).json({ error: 'Internal Server Configuration Error' });
    }

    // Base64の接頭辞（data:image/jpeg;base64, 等）があれば削除
    const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');

    const prompt = あなたは人相学と眉毛の専門家です。この顔写真を分析してください。
性別は「${gender}」です。

以下のJSON形式で返してください。

{
  "physiognomy": "人相学の見解を200文字程度で。この人の性格・印象・運勢を具体的に述べる",
  "weakness": "顔相から読み取れる弱点や改善できる印象を1文で",
  "recommendation": "その弱点を眉毛で補うための提案を1〜2文で具体的に",
  "scene": "以下から最適なシーンを1つだけ返す。mens-business / mens-sexy / mens-clean / mens-strong / womens-business / womens-sexy / womens-natural / womens-cute",
  "trim": "削る・整える場所を具体的に",
  "keep": "残す・描き足す場所を具体的に"
};

    const response = await fetch(
      https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey},
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: prompt },
              { inline_data: { mime_type: 'image/jpeg', data: cleanBase64 } }
            ]
          }],
          generationConfig: { 
            maxOutputTokens: 2000, 
            temperature: 0.7, // 構造化出力のため、少しだけランダム性を下げて安定化
            responseMimeType: "application/json" // 確実なJSON化の強制
          }
        })
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Gemini API Error Details:', JSON.stringify(errorData));
      throw new Error(Gemini API responded with status ${response.status});
    }

    const data = await response.json();
    const raw = (data.candidates?.[0]?.content?.parts?.[0]?.text || '').trim();

    // 確実にパースするための処理
    let result;
    try {
      result = JSON.parse(raw);
    } catch {
      const match = raw.match(/\{[\s\S]*\}/);
      if (match) {
        result = JSON.parse(match[0]);
      } else {
        throw new Error('Failed to parse Gemini response as JSON: ' + raw.slice(0, 100));
      }
    }

    return res.status(200).json(result);

  } catch (error) {
    console.error('API Route Error:', error.message);
    // ユーザーには詳細なエラー（APIキーやエンドポイントの生エラー）を見せず、ジェネリックなエラーを返す
    return res.status(500).json({ error: '分析に失敗しました。画像形式などを確認してください。' });
  }
}
