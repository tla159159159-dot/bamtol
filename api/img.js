// 밤톨 공유 이미지(카톡·검색 미리보기)와 아이콘. GET /api/img?i=og|icon|apple
// 이미지는 Upstash에 '처음 한 번만' 저장 가능(write-once) → 이후엔 아무도 덮어쓸 수 없음.
// ponytail: 이미지를 바꾸려면 아래 VER 값을 올리고 새로 한 번 저장.
const RURL = process.env.KV_REST_API_URL, RTOK = process.env.KV_REST_API_TOKEN;
const VER = '1';
const TYPES = { og: ['image/jpeg', '/9j/'], icon: ['image/png', 'iVBOR'], apple: ['image/png', 'iVBOR'] };

async function redis(cmd) {
  const r = await fetch(RURL, { method: 'POST', headers: { Authorization: 'Bearer ' + RTOK, 'Content-Type': 'application/json' }, body: JSON.stringify(cmd) });
  if (!r.ok) throw new Error('redis ' + r.status);
  return (await r.json()).result;
}

module.exports = async (req, res) => {
  const q = req.query || {};
  const k = TYPES[q.i] ? q.i : 'og';
  const key = 'bt:img' + VER + ':' + k;
  try {
    if (req.method === 'POST') {
      if (!/^https:\/\/(www\.)?bamtol\.co\.kr$/.test(req.headers.origin || '')) return res.status(403).end();
      const b = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
      if (typeof b.data !== 'string' || b.data.length > 400000 || !b.data.startsWith(TYPES[k][1])) return res.status(400).end();
      const ok = await redis(['SET', key, b.data, 'NX']);
      return res.status(ok ? 201 : 409).end();
    }
    const d = await redis(['GET', key]);
    if (!d) return res.status(404).end();
    res.setHeader('Content-Type', TYPES[k][0]);
    res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=604800');
    res.setHeader('Access-Control-Allow-Origin', '*'); // 공개 이미지라 다른 사이트에서 불러와도 됨
    return res.status(200).send(Buffer.from(d, 'base64'));
  } catch (e) { return res.status(500).end(); }
};
