export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  try {
    const { imageBase64, gender } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    const prompt = `あなたは東洋人相学をベースにした印象アドバイザーです。現代的でポジティブな表現で、この顔写真を診断してください。性別は${gender}です。

【眉毛タイプ別の印象と特性（現代語版）】
・濃い眉：エネルギッシュで存在感があり、周囲から頼られやすい。行動力と決断力が顔に出ている
・薄い眉：繊細で感受性豊か。穏やかな印象だが、自己主張が伝わりにくいことも
・三日月眉・緩やかなアーチ眉：親しみやすく愛される雰囲気。人間関係に恵まれ、自然と運を引き寄せる
・一文字眉（まっすぐ水平）：誠実で真面目な印象。信頼感があるが、少し近づきにくく見られることも
・への字眉（眉尻が上がる）：意志が強く情熱的。積極的でリーダーシップを感じさせる
・下がり眉（眉尻が下がる）：優しく思いやりがある印象。共感力が高く、人の心に寄り添える
・八の字眉（眉頭が上がる）：明るく社交的。親しみやすいが、少し頼りなく見られることも
・眉が長い：大らかで包容力がある。人との縁を大切にし、周囲を引き立てる
・眉が短い：自立心が強くクールな印象。自分のペースを大切にするタイプ
・眉間が広い：開放的でフレンドリー。人を受け入れる懐の深さがある
・眉間が狭い：集中力が高く思慮深い。慎重だが、少し近寄りがたく見える場合も

【眉毛で印象を整えるアドバイス（推奨スタイル対応）】
・薄眉・短眉の人 → 少し濃いめに整えることで、自信と決断力の印象がアップ（mens-strong / womens-business推奨）
・一文字眉の人 → 眉尻に少し変化をつけると、親しみやすさと色気がプラス（mens-sexy / womens-sexy推奨）
・への字眉・上がり眉の人 → そのままの力強さを活かしつつ整える（mens-business / womens-business推奨）
・下がり眉の人 → 優しさを保ちながら少し整えることで清潔感がアップ（mens-clean / womens-natural推奨）
・八の字眉の人 → 眉頭を整えると、落ち着きと誠実さが伝わりやすくなる（mens-clean / womens-natural推奨）

この知識を活用して、ポジティブで前向きな表現で以下のJSONのみを返してください（他のテキスト不要）:
{"physiognomy":"眉毛と顔全体から読み取れる性格・印象・魅力を200文字程度で。ポジティブな表現を中心に、改善できる点も優しく伝える","weakness":"印象の面で少し損をしている点を、改善のヒントとして1文でやさしく表現","recommendation":"人相学的に最も似合う眉毛スタイルと、それによって生まれる印象の変化を1〜2文で","scene":"mens-business or mens-sexy or mens-clean or mens-strong or womens-business or womens-sexy or womens-natural or womens-cute のどれか1つだけ","trim":"削る・整えるべき場所を具体的に（やさしい表現で）","keep":"残す・描き足すべき場所を具体的に"}`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [
            { text: prompt },
            { inline_data: { mime_type: 'image/jpeg', data: imageBase64 } }
          ]}],
          generationConfig: {
            maxOutputTokens: 1000,
            temperature: 0.8,
            responseMimeType: 'application/json'
          }
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
      else throw new Error('JSON parse failed: ' + raw.slice(0, 100));
    }

    return res.status(200).json(result);

  } catch (error) {
    console.error('Error:', error.message);
    return res.status(500).json({ error: error.message });
  }
}
