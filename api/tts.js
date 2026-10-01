// 밤톨 음성 프록시: 구글 TTS 키는 Vercel 환경변수 GTTS_KEY 에만 둔다 (화면 코드엔 키 없음).
// 무료만 사용: 이번 달 사용 글자 수를 Upstash 카운터로 세서 LIMIT 넘으면 구글 호출 안 함(→ 화면은 기본 음성으로 전환).
// 카운터 설정이 없으면 아예 구글을 안 부름 = 과금 0원 보장.
// 같은 문장+음성+속도는 Vercel CDN에 1년 캐시 → 다시 들을 땐 구글 호출·카운트 없음.
const VOICES = ['ko-KR-Chirp3-HD-Leda', 'ko-KR-Chirp3-HD-Aoede'];
const HOSTS = ['bamtol.co.kr', 'www.bamtol.co.kr', 'bamtol.vercel.app'];
const MAX = 500;
const LIMIT = 900000; // Chirp3-HD 월 무료 100만 자 중 10% 여유
const RURL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const RTOK = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

async function redis(cmd) {
  const r = await fetch(RURL, { method: 'POST', headers: { Authorization: 'Bearer ' + RTOK, 'Content-Type': 'application/json' }, body: JSON.stringify(cmd) });
  if (!r.ok) throw new Error('redis ' + r.status);
  return (await r.json()).result;
}
// 이번 달 사용량에 n자를 먼저 더해두고, 한도 안이면 true
async function reserve(n) {
  if (!RURL || !RTOK) return false;
  try {
    const key = 'tts:' + new Date().toISOString().slice(0, 7);
    const used = await redis(['INCRBY', key, n]);
    if (used === n) await redis(['EXPIRE', key, 3456000]);
    return used <= LIMIT;
  } catch (e) { return false; }
}

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
  if (!(await reserve(t.length))) return res.status(429).end();

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
