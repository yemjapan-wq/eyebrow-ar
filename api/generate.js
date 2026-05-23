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

【眉毛タイプ別の印象】
・一文字眉（まっすぐ水平）：誠実で真面目。信頼感があるが少し近づきにくく見られることも
・平行眉（上下が平行）：穏やかで協調性があり優しい。親しみやすく人間関係に恵まれる
・上がり眉（眉尻が上がる）：積極的で行動力がある。リーダーシップがありチャレンジ精神が強い
・八字眉（眉頭が上がり眉尻が下がる）：優しく思いやりがある。困っている人を放っておけない面倒見の良さがある
・濃い太眉：意志が強く頼りがいがある。決断力と行動力に優れ周囲から頼られる
・アーチ眉（弓形）：上品で魅力的。社交的で人から好かれやすい
・柳葉眉（細く長くやや下がり）：繊細で優雅。芸術的センスと感受性に優れる
・細眉：繊細で気配り上手。神経が細かく感受性が高い

【推奨シーンの割り当て】
・誠実・信頼感を強めたい → mens-1（一文字眉）
・穏やか・協調性を出したい → mens-2またはwomens-2（平行眉）
・積極性・行動力を出したい → mens-3またはwomens-3（上がり眉）
・優しさ・思いやりを出したい → mens-4（八字眉）
・強さ・存在感を出したい → mens-5（濃い太眉）
・上品・魅力を出したい → womens-1（アーチ眉）
・繊細・優雅を出したい → womens-4（柳葉眉）
・気配り・繊細さを出したい → womens-5（細眉）

必ず以下のJSON形式のみで返答してください。マークダウン不要：
{"physiognomy":"眉毛と顔全体から読み取れる性格と印象を200文字で","weakness":"印象の改善点を1文でやさしく","recommendation":"最適な眉毛スタイルとその理由・効果を1〜2文で","scene":"mens-1/mens-2/mens-3/mens-4/mens-5/womens-1/womens-2/womens-3/womens-4/womens-5のどれか1つだけ","trim":"削る・整える場所","keep":"残す・描き足す場所"}`;

    const response = await fetch(
      models/gemini-1.5-flash:generateContent,
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

    // sceneのIDが有効か確認
    const validScenes = ['mens-1','mens-2','mens-3','mens-4','mens-5','womens-1','womens-2','womens-3','womens-4','womens-5'];
    if (!validScenes.includes(result.scene)) {
      result.scene = gender === '男性' ? 'mens-2' : 'womens-2';
    }

    return res.status(200).json(result);

  } catch (error) {
    console.error('Error:', error.message);
    return res.status(500).json({ error: error.message });
  }
}
