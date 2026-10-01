// 밤톨 음성 프록시: 구글 TTS 키는 Vercel 환경변수 GTTS_KEY 에만 둔다 (화면 코드엔 키 없음).
// 같은 문장+음성+속도는 Vercel CDN에 1년 캐시 → 구글 과금은 처음 1번만.
// ponytail: 월 사용량 하드 상한은 없음 — 출처·길이·음성 제한 + CDN 캐시로 막음. 트래픽 커지면 Upstash 카운터로 월 상한 추가.
const VOICES = ['ko-KR-Chirp3-HD-Leda', 'ko-KR-Chirp3-HD-Aoede'];
const HOSTS = ['bamtol.co.kr', 'www.bamtol.co.kr', 'bamtol.vercel.app'];
const MAX = 500;

module.exports = async (req, res) => {
  const q = req.query || {};
  const t = String(q.t || '').trim();
  const v = VOICES.includes(q.v) ? q.v : VOICES[0];
  const r = Math.min(1.2, Math.max(0.6, Number(q.r) || 0.85));
  let host = '';
  try { host = new URL(req.headers.referer || '').hostname; } catch (e) {}
  if (!HOSTS.includes(host)) return res.status(403).end();
  if (!t || t.length > MAX) return res.status(400).end();
  if (!process.env.GTTS_KEY) return res.status(500).end();

  const g = await fetch('https://texttospeech.googleapis.com/v1/text:synthesize?key=' + encodeURIComponent(process.env.GTTS_KEY), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Referer: 'https://bamtol.co.kr/' },
    body: JSON.stringify({ input: { text: t }, voice: { languageCode: 'ko-KR', name: v }, audioConfig: { audioEncoding: 'MP3', speakingRate: r } }),
  });
  if (!g.ok) return res.status(502).end();
  const { audioContent } = await g.json();
  res.setHeader('Content-Type', 'audio/mpeg');
  res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=31536000, immutable');
  res.status(200).send(Buffer.from(audioContent, 'base64'));
};
