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

【人相学の総合知識】
・額が広い：開放的で運が開けやすい。知性的な印象
・眉間が広い：フレンドリーで人間関係に恵まれる
・眉間が狭い：集中力が高く思慮深い
・目が大きい：感受性豊かで勘が良い
・目が細い：意志が強く粘り強い
・鼻筋が通っている：清廉で洗練された印象。仕事運が安定
・鼻翼が発達：人情豊かで金運・人間関係に恵まれる
・口角が上がっている：幸運に恵まれ周囲から愛される
・顎が丸い：愛情豊かで家庭運が良い
・顎が細い：芸術的センスと感受性が高い
・二重顎：度量が広く晩年運が良い

【眉毛タイプ別の印象】
・一文字眉：誠実で信頼感があるが少し近づきにくく見られることも
・平行眉：穏やかで協調性があり親しみやすい
・上がり眉：積極的でリーダーシップがある
・八字眉：優しく思いやりがあり面倒見が良い
・濃い太眉：意志が強く頼りがいがある
・アーチ眉：上品で社交的、人から好かれやすい
・柳葉眉：繊細で優雅、芸術的センスに優れる
・細眉：気配り上手で感受性が高い

推奨シーン：誠実・信頼→mens-1、穏やか→mens-2またはwomens-2、積極性→mens-3またはwomens-3、優しさ→mens-4、強さ→mens-5、上品→womens-1、優雅→womens-4、繊細→womens-5

必ず以下のJSON形式のみで返してください：
{"overall":"顔全体（額・目・鼻・口・顎・顔型）を人相学で総合診断。その人の本質的な性格・運勢・魅力を150文字で","physiognomy":"眉毛に注目した印象と性格を150文字で","weakness":"改善できる印象の弱点を1文でやさしく","recommendation":"最適な眉毛と効果を1〜2文で","scene":"mens-1かmens-2かmens-3かmens-4かmens-5かwomens-1かwomens-2かwomens-3かwomens-4かwomens-5","trim":"削る場所","keep":"残す場所"}`;

    const response = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=' + apiKey,
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
            maxOutputTokens: 1500,
            temperature: 0.7
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
        throw new Error('No JSON: ' + raw.slice(0, 100));
      }
    }

    const valid = ['mens-1','mens-2','mens-3','mens-4','mens-5','womens-1','womens-2','womens-3','womens-4','womens-5'];
    if (!valid.includes(result.scene)) {
      result.scene = gender === '男性' ? 'mens-2' : 'womens-2';
    }

    return res.status(200).json(result);

  } catch (error) {
    console.error('Error:', error.message);
    return res.status(500).json({ error: error.message });
  }
}
