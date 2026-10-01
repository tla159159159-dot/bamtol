// 밤톨 회원: 카카오 로그인 + 아이 정보·인사말 녹음 저장 (Upstash Redis 무료 플랜 사용)
// GET ?login 로그인 시작 / ?code= 카카오 콜백 / ?logout / (없음) 내 정보 / ?rec=hello|bye 녹음 듣기
// POST {kid} 또는 {rec,type,data(base64)} 저장 / DELETE ?rec= 녹음 삭제
const crypto = require('crypto');
const KEY = process.env.KAKAO_REST_KEY;
const SECRET = process.env.KAKAO_SECRET; // 카카오에서 클라이언트 시크릿을 켰을 때만 필요
const SIGN = process.env.KV_REST_API_TOKEN; // ponytail: 쿠키 서명에 Redis 토큰 재사용, 토큰 바꾸면 전원 재로그인
const RURL = process.env.KV_REST_API_URL;
const REDIRECT = 'https://bamtol.co.kr/api/me';
const SLOTS = ['hello', 'bye'];
const MAX_AUDIO = 600000; // 원본 600KB (약 20초)

async function redis(cmd) {
  const r = await fetch(RURL, { method: 'POST', headers: { Authorization: 'Bearer ' + SIGN, 'Content-Type': 'application/json' }, body: JSON.stringify(cmd) });
  if (!r.ok) throw new Error('redis ' + r.status);
  return (await r.json()).result;
}
const sign = v => crypto.createHmac('sha256', SIGN).update(v).digest('base64url');
function cookies(req) {
  const o = {};
  (req.headers.cookie || '').split(/;\s*/).forEach(c => { const i = c.indexOf('='); if (i > 0) o[c.slice(0, i)] = decodeURIComponent(c.slice(i + 1)); });
  return o;
}
function session(req) {
  const [v, s] = (cookies(req).bt || '').split('.');
  if (!v || !s) return null;
  const a = Buffer.from(sign(v)), b = Buffer.from(s);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try { return JSON.parse(Buffer.from(v, 'base64url').toString()); } catch (e) { return null; }
}
const str = (x, n) => String(x == null ? '' : x).slice(0, n);
function cleanKid(k) {
  if (!k || typeof k !== 'object') return null;
  const name = str(k.name, 8).trim();
  if (!name) return null;
  return { name, age: str(k.age, 6), time: str(k.time, 12), ints: (Array.isArray(k.ints) ? k.ints : []).slice(0, 6).map(x => str(x, 10)) };
}
async function getProfile(id) { const p = await redis(['GET', 'bt:u:' + id]); return p ? JSON.parse(p) : { r: {} }; }
const putProfile = (id, p) => redis(['SET', 'bt:u:' + id, JSON.stringify(p)]);

module.exports = async (req, res) => {
  const q = req.query || {};
  res.setHeader('Cache-Control', 'no-store');
  if (!SIGN || !RURL) return res.status(500).end();

  if (q.logout !== undefined) {
    res.setHeader('Set-Cookie', 'bt=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax');
    return res.redirect(302, '/');
  }
  if (q.login !== undefined) {
    if (!KEY) return res.redirect(302, '/?login=fail');
    const st = crypto.randomBytes(12).toString('hex');
    res.setHeader('Set-Cookie', 'bt_st=' + st + '; Path=/api/me; Max-Age=600; HttpOnly; Secure; SameSite=Lax');
    return res.redirect(302, 'https://kauth.kakao.com/oauth/authorize?response_type=code&client_id=' + encodeURIComponent(KEY) + '&redirect_uri=' + encodeURIComponent(REDIRECT) + '&state=' + st);
  }
  if (q.code !== undefined || q.error !== undefined) {
    if (!q.code || !q.state || q.state !== cookies(req).bt_st) return res.redirect(302, '/?login=fail');
    try {
      const form = { grant_type: 'authorization_code', client_id: KEY, redirect_uri: REDIRECT, code: String(q.code) };
      if (SECRET) form.client_secret = SECRET;
      const t = await fetch('https://kauth.kakao.com/oauth/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8' }, body: new URLSearchParams(form) }).then(r => r.json());
      if (!t.access_token) return res.redirect(302, '/?login=fail');
      const u = await fetch('https://kapi.kakao.com/v2/user/me', { headers: { Authorization: 'Bearer ' + t.access_token } }).then(r => r.json());
      if (!u.id) return res.redirect(302, '/?login=fail');
      const nick = (u.properties && u.properties.nickname) || (u.kakao_account && u.kakao_account.profile && u.kakao_account.profile.nickname) || '';
      const v = Buffer.from(JSON.stringify({ id: String(u.id), n: str(nick, 20) })).toString('base64url');
      res.setHeader('Set-Cookie', ['bt=' + v + '.' + sign(v) + '; Path=/; Max-Age=15552000; HttpOnly; Secure; SameSite=Lax', 'bt_st=; Path=/api/me; Max-Age=0']);
      return res.redirect(302, '/?login=ok');
    } catch (e) { return res.redirect(302, '/?login=fail'); }
  }

  const me = session(req);
  if (!me) return req.method === 'GET' && !q.rec ? res.status(200).json({ login: false }) : res.status(401).end();

  try {
    if (req.method === 'GET' && q.rec) {
      if (!SLOTS.includes(q.rec)) return res.status(400).end();
      const raw = await redis(['GET', 'bt:r:' + me.id + ':' + q.rec]);
      if (!raw) return res.status(404).end();
      const a = JSON.parse(raw);
      res.setHeader('Content-Type', a.t);
      res.setHeader('Cache-Control', 'private, max-age=31536000, immutable'); // 주소에 버전(v=)이 붙어서 바뀌면 새로 받음
      return res.status(200).send(Buffer.from(a.d, 'base64'));
    }
    if (req.method === 'GET') {
      const p = await getProfile(me.id);
      return res.status(200).json({ login: true, nick: me.n, kid: p.kid || null, rec: p.r || {} });
    }
    // 쓰기는 우리 사이트에서 온 요청만
    const origin = req.headers.origin || '';
    if (origin && !/^https:\/\/(www\.)?bamtol\.co\.kr$/.test(origin)) return res.status(403).end();
    const p = await getProfile(me.id);
    p.r = p.r || {};
    if (req.method === 'DELETE') {
      if (!SLOTS.includes(q.rec)) return res.status(400).end();
      await redis(['DEL', 'bt:r:' + me.id + ':' + q.rec]);
      delete p.r[q.rec];
      await putProfile(me.id, p);
      return res.status(200).json({ ok: true, rec: p.r });
    }
    if (req.method === 'POST') {
      const b = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
      if (b.kid !== undefined) {
        const kid = cleanKid(b.kid);
        if (!kid) return res.status(400).end();
        p.kid = kid;
      }
      if (b.rec !== undefined) {
        if (!SLOTS.includes(b.rec) || !/^audio\/[\w.+-]+(;.*)?$/.test(String(b.type)) || typeof b.data !== 'string') return res.status(400).end();
        if (b.data.length > Math.ceil(MAX_AUDIO / 3) * 4) return res.status(413).end();
        await redis(['SET', 'bt:r:' + me.id + ':' + b.rec, JSON.stringify({ t: str(b.type, 60).split(';')[0], d: b.data })]);
        p.r[b.rec] = Date.now();
      }
      await putProfile(me.id, p);
      return res.status(200).json({ ok: true, kid: p.kid || null, rec: p.r });
    }
    return res.status(405).end();
  } catch (e) { return res.status(500).end(); }
};
