// 밤톨 회원: 카카오 로그인 + 아이 정보·인사말 녹음 저장 (Upstash Redis 무료 플랜 사용)
// GET ?login 로그인 시작 / ?code= 카카오 콜백 / ?logout / (없음) 내 정보 / ?rec=hello|bye 녹음 듣기
// POST {kid} 또는 {rec,type,data(base64)} 저장 / {dl:true|false} 매일 밤 카톡 받기 / {test:1} 지금 한 번 받기 / DELETE ?rec= 녹음 삭제
// POST {fav:'제목|단편', on:true|false} 찜 / {recent:'제목|단편'} 최근 읽은 동화
// DELETE ?all : 회원 탈퇴 (내 정보·녹음·카톡 토큰 전부 삭제 + 카카오 연결 끊기)
// GET ?view=제목|단편 : 동화 조회수 +1 (누구나) / GET ?stats : 운영 현황 (관리자만, 처음 연 사람이 관리자)
// GET ?deliver : 매일 밤 카톡 배달 (GitHub Actions가 19~24시 10분마다 부름, 여러 번 불려도 아이마다 하루 1번만 보냄)
// PLUS: 아이 여러 명(kids, 최대 4명) · 매일 배달 · 생일·명절 특별 동화 / FREE: 아이 1명 · 토요일에만 배달
// POST {kid, idx} 아이 수정(idx 없으면 첫째) · idx=kids.length 면 추가 / {delKid: idx} 아이 삭제
const crypto = require('crypto');
const KEY = process.env.KAKAO_REST_KEY;
const SECRET = process.env.KAKAO_SECRET; // 카카오에서 클라이언트 시크릿을 켰을 때만 필요
const SIGN = process.env.KV_REST_API_TOKEN; // ponytail: 쿠키 서명에 Redis 토큰 재사용, 토큰 바꾸면 전원 재로그인
const RURL = process.env.KV_REST_API_URL;
const REDIRECT = 'https://bamtol.co.kr/api/me';
const SLOTS = ['hello', 'bye'];
const MAX_AUDIO = 600000; // 원본 600KB (약 20초)
const OPEN_BETA = process.env.BAMTOL_BETA !== '0'; // 결제(나이스페이) 열기 전까지 모든 회원 PLUS 무료 체험. 결제 열면 Vercel 환경변수 BAMTOL_BETA=0
const MAX_KIDS = 4;
const kst = () => new Date(Date.now() + 9 * 3600e3);
const today = () => kst().toISOString().slice(0, 10);
const isPlus = p => OPEN_BETA || !!(p.plus && p.plus >= today()); // p.plus = 'YYYY-MM-DD' 이용 마지막 날 (결제 승인 때 기록)
const kidsOf = p => (p.kids && p.kids.length ? p.kids : p.kid ? [p.kid] : []);
function setKids(p, a) { p.kids = a.slice(0, MAX_KIDS); p.kid = p.kids[0] || null; if (!p.kid) { p.dl = false; } }

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
  const bd = /^(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(String(k.bd)) ? String(k.bd) : ''; // 생일 월-일만 (연도는 안 받음)
  return { name, age: str(k.age, 6), time: str(k.time, 12), ints: (Array.isArray(k.ints) ? k.ints : []).slice(0, 6).map(x => str(x, 10)), bd };
}
async function getProfile(id) { const p = await redis(['GET', 'bt:u:' + id]); return p ? JSON.parse(p) : { r: {} }; }
const putProfile = (id, p) => redis(['SET', 'bt:u:' + id, JSON.stringify(p)]);

// ── 매일 밤 카톡 배달 (카카오 '나에게 보내기') ──
let ST = null; // 메인 동화(STORIES) 제목 목록, 처음 한 번만 읽음
async function stories() {
  if (ST) return ST;
  const t = await (await fetch('https://bamtol.co.kr/index.html')).text();
  const a = t.indexOf('const STORIES='), e = t.indexOf('};', a) + 2;
  ST = new Function(t.slice(a, e) + ';return STORIES;')();
  try { SP = await (await fetch('https://bamtol.co.kr/special-stories.json')).json(); } catch (e) { SP = {}; }
  return ST;
}
let SP = {}; // 특별한 날 동화 (special-stories.json): 생일·설날·추석·어린이날·크리스마스
// 명절 날짜 (KST). ponytail: 설·추석은 음력이라 해마다 직접 추가 (2029년 이후 추가 필요)
const HOLI = { '01-01': '설날', '05-05': '어린이날', '12-24': '크리스마스', '2027-02-07': '설날', '2027-09-15': '추석', '2028-01-27': '설날', '2028-10-03': '추석', '2029-02-13': '설날', '2029-09-22': '추석' };
function special(kid, date) { // 오늘 이 아이에게 보낼 특별 동화 키 (없으면 '')
  const md = date.slice(5);
  if (kid.bd && kid.bd === md && SP['생일']) return '생일';
  const h = HOLI[date] || (HOLI[md] !== '설날' ? HOLI[md] : ''); // 양력 1월 1일은 설날 동화 안 씀
  return h && SP[h] ? h : '';
}
function bedtime(s) { // '저녁 8시 30분' → 1230(분)
  const h = +((/(\d+)\s*시/.exec(s) || [])[1] || 8), m = +((/(\d+)\s*분/.exec(s) || [])[1] || 0);
  return (h < 12 ? h + 12 : h) * 60 + m;
}
async function sendOne(id, p, ki = 0) { // ki = 몇 번째 아이
  const tk = JSON.parse((await redis(['GET', 'bt:tk:' + id])) || 'null');
  if (!tk) return 'notoken';
  const form = { grant_type: 'refresh_token', client_id: KEY, refresh_token: tk.rt };
  if (SECRET) form.client_secret = SECRET;
  const t = await fetch('https://kauth.kakao.com/oauth/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8' }, body: new URLSearchParams(form) }).then(r => r.json());
  if (!t.access_token) { p.dl = false; await putProfile(id, p); await redis(['SREM', 'bt:dl', id]); return 'expired'; } // 두 달 넘게 안 들어와 토큰 만료 → 끔
  if (t.refresh_token) await redis(['SET', 'bt:tk:' + id, JSON.stringify({ rt: t.refresh_token })]);
  const kid = kidsOf(p)[ki] || kidsOf(p)[0];
  const S = await stories(), keys = Object.keys(S), liked = (kid.ints || []).filter(x => S[x]);
  const day = Math.floor(kst().getTime() / 864e5) + ki, pool = day % 2 && liked.length ? liked : keys; // 하루는 좋아하는 테마, 하루는 전체에서 (아이마다 다르게)
  const sp = isPlus(p) ? special(kid, today()) : '';
  const th = sp || pool[day % pool.length], title = (sp ? SP[sp] : S[th]).title;
  const url = 'https://bamtol.co.kr/?tonight=' + encodeURIComponent(th) + (ki ? '&k=' + ki : '');
  const head = sp === '생일' ? '🎂 ' + kid.name + '의 생일 밤 특별 동화가 도착했어요' : sp ? '🎁 오늘은 ' + sp + '! ' + kid.name + '의 특별한 밤 동화가 도착했어요' : '🌙 ' + kid.name + '의 오늘 밤 동화가 도착했어요';
  const tpl = { object_type: 'text', text: head + '\n\n「' + title.replaceAll('@', kid.name) + '」\n\n불 끄고 같이 들어볼까요?', link: { web_url: url, mobile_web_url: url }, button_title: '동화 듣기' };
  const r = await fetch('https://kapi.kakao.com/v2/api/talk/memo/default/send', { method: 'POST', headers: { Authorization: 'Bearer ' + t.access_token, 'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8' }, body: new URLSearchParams({ template_object: JSON.stringify(tpl) }) }).then(r => r.json());
  return r.result_code === 0 ? 'sent' : 'fail:' + (r.code || '');
}
// 운영 현황 (관리자 전용): 회원 수·아이 등록·녹음·카톡 받기·가입 추이·많이 읽힌 동화. ponytail: 회원 키를 매번 SCAN, 1만 명 넘으면 카운터로 바꾸기
async function stats(id) {
  let admin = await redis(['GET', 'bt:admin']);
  if (!admin) { await redis(['SET', 'bt:admin', id, 'NX']); admin = await redis(['GET', 'bt:admin']); } // 처음 연 사람이 관리자
  if (admin !== id) return null;
  const ids = []; let cur = '0';
  do { const r = await redis(['SCAN', cur, 'MATCH', 'bt:u:*', 'COUNT', 500]); cur = String(r[0]); ids.push(...r[1]); } while (cur !== '0');
  const ps = [];
  for (let i = 0; i < ids.length; i += 100) ps.push(...((await redis(['MGET', ...ids.slice(i, i + 100)])) || []).map(x => JSON.parse(x || '{}')));
  const pairs = a => { const o = {}; for (let i = 0; i < (a || []).length; i += 2) o[a[i]] = +a[i + 1]; return o; };
  const joins = pairs(await redis(['HGETALL', 'bt:joins'])), views = pairs(await redis(['HGETALL', 'bt:views']));
  return {
    members: ids.length, kids: ps.reduce((n, p) => n + kidsOf(p).length, 0), plus: ps.filter(p => p.plus && p.plus >= today()).length, recs: ps.filter(p => p.r && Object.keys(p.r).length).length,
    dl: +(await redis(['SCARD', 'bt:dl'])) || 0, favs: ps.reduce((n, p) => n + (p.fav || []).length, 0),
    joins: Object.keys(joins).sort().slice(-30).map(d => [d, joins[d]]),
    top: Object.keys(views).sort((a, b) => views[b] - views[a]).slice(0, 15).map(k => [k, views[k]]),
    totalViews: Object.values(views).reduce((a, b) => a + b, 0),
  };
}
async function deliver() { // ponytail: 회원을 한 명씩 차례로 처리, 수백 명 넘으면 나눠 보내기
  const now = kst(), date = now.toISOString().slice(0, 10), m = now.getUTCHours() * 60 + now.getUTCMinutes();
  const ids = (await redis(['SMEMBERS', 'bt:dl'])) || [], out = {};
  for (const id of ids) {
    try {
      const p = JSON.parse((await redis(['GET', 'bt:u:' + id])) || '{}');
      if (!p.dl || !p.kid) continue;
      const plus = isPlus(p);
      if (!plus && now.getUTCDay() !== 6) continue; // FREE 는 토요일에만 (주 1편)
      const ks = plus ? kidsOf(p) : kidsOf(p).slice(0, 1);
      for (let ki = 0; ki < ks.length; ki++) {
        const t = bedtime(ks[ki].time);
        if (m < t - 10 || m > t + 120) continue; // 받을 시간 10분 전 ~ 2시간 뒤
        if ((await redis(['SET', 'bt:sent:' + id + ':' + date + (ki ? ':' + ki : ''), '1', 'NX', 'EX', 172800])) !== 'OK') continue; // 오늘 이미 보냄
        const r = await sendOne(id, p, ki);
        out[r] = (out[r] || 0) + 1;
        if (r === 'expired' || r === 'notoken') break;
      }
    } catch (e) { out.error = (out.error || 0) + 1; }
  }
  return { checked: ids.length, ...out };
}

const view = (me, p) => ({ login: true, nick: me.n, kid: p.kid || null, kids: kidsOf(p), rec: p.r || {}, dl: !!p.dl, fav: p.fav || [], recent: p.recent || [], plus: isPlus(p), beta: OPEN_BETA, plusUntil: p.plus || null });

module.exports = async (req, res) => {
  const q = req.query || {};
  res.setHeader('Cache-Control', 'no-store');
  if (!SIGN || !RURL) return res.status(500).end();
  if (q.view !== undefined) { // ponytail: 형식만 검사, 이상한 키가 쌓이면 그때 목록으로 거르기
    const key = str(q.view, 60);
    if (/^[^|]{1,40}\|(단편|장편)$/.test(key)) await redis(['HINCRBY', 'bt:views', key, 1]).catch(() => {});
    return res.status(204).end();
  }
  if (q.deliver !== undefined) { try { return res.status(200).json(await deliver()); } catch (e) { return res.status(500).end(); } }

  if (q.logout !== undefined) {
    res.setHeader('Set-Cookie', 'bt=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax');
    return res.redirect(302, '/');
  }
  if (q.login !== undefined) {
    if (!KEY) return res.redirect(302, '/?login=fail');
    const st = crypto.randomBytes(12).toString('hex') + (q.login === 'msg' ? '.m' : ''); // .m = 카톡 받기 동의까지 요청
    res.setHeader('Set-Cookie', 'bt_st=' + st + '; Path=/api/me; Max-Age=600; HttpOnly; Secure; SameSite=Lax');
    return res.redirect(302, 'https://kauth.kakao.com/oauth/authorize?response_type=code&client_id=' + encodeURIComponent(KEY) + '&redirect_uri=' + encodeURIComponent(REDIRECT) + '&state=' + st + (q.login === 'msg' ? '&scope=talk_message' : ''));
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
      let dl = false;
      try { if (!(await redis(['EXISTS', 'bt:u:' + u.id]))) { await putProfile(String(u.id), { r: {}, j: kst().toISOString().slice(0, 10) }); await redis(['HINCRBY', 'bt:joins', kst().toISOString().slice(0, 10), 1]); } } catch (e) {} // 처음 가입 집계 (실패해도 로그인은 됨)
      if (String(t.scope || '').split(' ').includes('talk_message') && t.refresh_token) { // 카톡 받기 동의한 회원만 토큰 보관
        await redis(['SET', 'bt:tk:' + u.id, JSON.stringify({ rt: t.refresh_token })]);
        if (String(q.state).endsWith('.m')) { const p = await getProfile(u.id); if (p.kid) { p.dl = dl = true; await putProfile(u.id, p); await redis(['SADD', 'bt:dl', String(u.id)]); } }
      }
      const v = Buffer.from(JSON.stringify({ id: String(u.id), n: str(nick, 20) })).toString('base64url');
      res.setHeader('Set-Cookie', ['bt=' + v + '.' + sign(v) + '; Path=/; Max-Age=15552000; HttpOnly; Secure; SameSite=Lax', 'bt_st=; Path=/api/me; Max-Age=0']);
      return res.redirect(302, '/?login=ok' + (dl ? '&dl=1' : ''));
    } catch (e) { return res.redirect(302, '/?login=fail'); }
  }

  const me = session(req);
  if (!me) return req.method === 'GET' && !q.rec ? res.status(200).json({ login: false }) : res.status(401).end();

  try {
    if (req.method === 'GET' && q.stats !== undefined) return res.status(200).json(await stats(me.id) || {});
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
      return res.status(200).json(view(me, p));
    }
    // 쓰기는 우리 사이트에서 온 요청만
    const origin = req.headers.origin || '';
    if (origin && !/^https:\/\/(www\.)?bamtol\.co\.kr$/.test(origin)) return res.status(403).end();
    const p = await getProfile(me.id);
    p.r = p.r || {};
    if (req.method === 'DELETE' && q.all !== undefined) {
      const tk = JSON.parse((await redis(['GET', 'bt:tk:' + me.id])) || 'null');
      if (tk) { // 카톡 받기 동의한 회원은 토큰이 있어서 카카오 앱 연결까지 끊음 (실패해도 우리 쪽 정보는 지움)
        try {
          const form = { grant_type: 'refresh_token', client_id: KEY, refresh_token: tk.rt };
          if (SECRET) form.client_secret = SECRET;
          const t = await fetch('https://kauth.kakao.com/oauth/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8' }, body: new URLSearchParams(form) }).then(r => r.json());
          if (t.access_token) await fetch('https://kapi.kakao.com/v1/user/unlink', { method: 'POST', headers: { Authorization: 'Bearer ' + t.access_token } });
        } catch (e) {}
      }
      for (const k of ['bt:u:' + me.id, 'bt:tk:' + me.id].concat(SLOTS.map(s => 'bt:r:' + me.id + ':' + s))) await redis(['DEL', k]);
      await redis(['SREM', 'bt:dl', me.id]);
      res.setHeader('Set-Cookie', 'bt=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax');
      return res.status(200).json({ ok: true });
    }
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
        const kid = cleanKid(b.kid), ks = kidsOf(p), i = b.idx === undefined ? 0 : Math.floor(+b.idx);
        if (!kid || !(i >= 0 && i <= ks.length && i < MAX_KIDS)) return res.status(400).end();
        if (i >= 1 && i === ks.length && !isPlus(p)) return res.status(402).json({ need: 'plus' }); // 둘째부터는 PLUS
        ks[i] = kid; setKids(p, ks);
      }
      if (b.delKid !== undefined) {
        const ks = kidsOf(p), i = Math.floor(+b.delKid);
        if (!(i >= 0 && i < ks.length)) return res.status(400).end();
        ks.splice(i, 1); setKids(p, ks);
        if (!p.dl) await redis(['SREM', 'bt:dl', me.id]);
      }
      if (b.fav !== undefined || b.recent !== undefined) { // 동화 키 = 제목|단편/장편
        const key = str(b.fav !== undefined ? b.fav : b.recent, 60);
        if (!/^[^|]{1,40}\|(단편|장편)$/.test(key)) return res.status(400).end();
        if (b.fav !== undefined) { p.fav = (p.fav || []).filter(x => x !== key); if (b.on) p.fav.unshift(key); p.fav = p.fav.slice(0, 100); }
        else p.recent = [key].concat((p.recent || []).filter(x => x !== key)).slice(0, 20);
      }
      if (b.dl !== undefined || b.test !== undefined) {
        if (!p.kid) return res.status(409).json({ need: 'kid' });
        if (!(await redis(['EXISTS', 'bt:tk:' + me.id]))) return res.status(409).json({ need: 'consent' });
        if (b.test !== undefined) {
          if ((await redis(['SET', 'bt:test:' + me.id, '1', 'NX', 'EX', 60])) !== 'OK') return res.status(429).end(); // 1분에 1번
          return res.status(200).json({ r: await sendOne(me.id, p) });
        }
        p.dl = !!b.dl;
        await redis([p.dl ? 'SADD' : 'SREM', 'bt:dl', me.id]);
      }
      if (b.rec !== undefined) {
        if (!SLOTS.includes(b.rec) || !/^audio\/[\w.+-]+(;.*)?$/.test(String(b.type)) || typeof b.data !== 'string') return res.status(400).end();
        if (b.data.length > Math.ceil(MAX_AUDIO / 3) * 4) return res.status(413).end();
        await redis(['SET', 'bt:r:' + me.id + ':' + b.rec, JSON.stringify({ t: str(b.type, 60).split(';')[0], d: b.data })]);
        p.r[b.rec] = Date.now();
      }
      await putProfile(me.id, p);
      return res.status(200).json({ ok: true, ...view(me, p) });
    }
    return res.status(405).end();
  } catch (e) { return res.status(500).end(); }
};
