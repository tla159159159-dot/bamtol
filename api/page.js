// 밤톨 한글 주소 페이지: /흥부와놀부/ 같은 동화별 페이지 + /전래동화/ 같은 모음 페이지 (검색 노출용)
// 동화 내용은 index.html 안의 동화 목록(LIB)을 그대로 읽어 씀 → 메인에서 동화를 고치면 여기도 같이 바뀜.
const SITE = 'https://bamtol.co.kr';
const D0 = '2026-10-02'; // 날짜(d) 없는 기존 동화의 등록일. 새 동화는 LIB에 d:'YYYY-MM-DD' 넣으면 RSS 맨 위로 감
const CAT = { 전래: '전래동화', 세계: '세계명작동화', 이솝: '이솝우화' };
const HUBS = {
  잠자리동화: { h: '잠자리 동화 모음', d: '아이가 포근하게 잠드는 잠자리 동화 {n}편. 전래동화·세계명작·이솝우화를 무료로 읽고, 사람 같은 자연 음성으로 들려주세요.', f: () => true },
  전래동화: { h: '전래동화 모음', d: '흥부와 놀부, 해님 달님, 콩쥐팥쥐… 아이용으로 순하게 다듬은 우리 전래동화 {n}편을 무료로 읽고 들어보세요.', f: x => x.c === '전래' },
  세계명작동화: { h: '세계명작동화 모음', d: '백설공주, 신데렐라, 피노키오… 잠자리에 맞게 다듬은 세계명작동화 {n}편을 무료로 읽고 들어보세요.', f: x => x.c === '세계' },
  이솝우화: { h: '이솝우화 모음', d: '토끼와 거북이, 개미와 베짱이… 짧고 교훈 있는 이솝우화 {n}편을 무료로 읽고 들어보세요.', f: x => x.c === '이솝' },
  짧은동화: { h: '짧은 잠자리 동화', d: '5분 안팎으로 읽는 짧은 잠자리 동화 {n}편. 바쁜 날 밤에도 하나씩 읽어 주세요.', f: x => x.L === '단편' },
  긴동화: { h: '긴 잠자리 동화', d: '10분 넘게 천천히 읽어 주는 긴 동화 {n}편. 아이가 이야기에 푹 빠져 스르르 잠들어요.', f: x => x.L === '장편' },
};

let LIB = null; // ponytail: 처음 한 번만 index.html에서 읽고 계속 재사용(배포하면 새로 읽음)
async function lib(host) {
  if (LIB) return LIB;
  const t = await (await fetch('https://' + host + '/index.html')).text();
  const a = t.indexOf('const FOLK=['), e = t.indexOf('})();', t.indexOf('const LIB=')) + 5;
  const list = new Function(t.slice(a, e) + ';return LIB;')();
  try { const n = await (await fetch('https://' + host + '/new-stories.json')).json(); if (Array.isArray(n)) list.push(...n); } catch (e) {} // 주 3편씩 추가되는 새 동화
  const seen = {};
  LIB = list.map(f => {
    let s = f.t.replace(/\s+/g, '');
    if (seen[s]) s += f.L === '장편' ? '장편' : '단편';
    seen[s] = 1;
    return { s, t: f.t, e: f.e, c: f.c, L: f.L, o: f.o, b: f.b || '', d: f.d || D0 };
  });
  return LIB;
}
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const mins = b => Math.max(2, Math.round(b.replace(/<br\s*\/?>/g, '').replace(/\s/g, '').length / 150));

function page({ path, title, desc, h1, body, ld }) {
  const url = SITE + path;
  return '<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<title>' + esc(title) + '</title><meta name="description" content="' + esc(desc) + '"><link rel="canonical" href="' + url + '">' +
    '<meta property="og:type" content="article"><meta property="og:site_name" content="밤톨"><meta property="og:title" content="' + esc(title) + '">' +
    '<meta property="og:description" content="' + esc(desc) + '"><meta property="og:url" content="' + url + '"><meta property="og:image" content="' + SITE + '/api/img?i=og">' +
    '<meta property="og:locale" content="ko_KR"><meta name="twitter:card" content="summary_large_image">' +
    '<link rel="icon" type="image/png" href="/api/img?i=icon"><link rel="apple-touch-icon" href="/api/img?i=apple"><meta name="theme-color" content="#181328">' +
    '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Gowun+Batang:wght@400;700&family=Noto+Sans+KR:wght@400;700&display=swap">' +
    '<script type="application/ld+json">' + JSON.stringify(ld).replace(/</g, '\\u003c') + '</script>' +
    '<style>body{margin:0;background:#181328;color:#F2EEFF;font:16px/1.75 "Noto Sans KR",sans-serif}a{color:#C9B8FF}.w{max-width:760px;margin:0 auto;padding:20px 16px 60px}' +
    'header{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:22px}header a.logo{font:700 22px "Gowun Batang",serif;color:#FFD678;text-decoration:none}' +
    '.go{background:#AE94FF;color:#140E2C;border-radius:12px;padding:9px 14px;font-weight:700;text-decoration:none;font-size:14px}nav.bc{font-size:13px;color:#ABA2CE;margin-bottom:10px}nav.bc a{color:#ABA2CE}' +
    'h1{font:700 30px/1.35 "Gowun Batang",serif;margin:6px 0 8px}.one{color:#DAD3F2;margin:0 0 6px}.meta{color:#ABA2CE;font-size:14px}' +
    '.story{font:18px/2 "Gowun Batang",serif;background:#221A40;border:1px solid #3A2F6B;border-radius:18px;padding:24px 20px;margin:18px 0}' +
    '.play{background:#AE94FF;color:#140E2C;border:0;border-radius:12px;padding:12px 18px;font:700 15px "Noto Sans KR";cursor:pointer;margin-top:12px}' +
    '.cta{background:linear-gradient(135deg,#3B2A7A,#241D45);border-radius:18px;padding:22px 20px;margin:26px 0;text-align:center}.cta b{font:700 20px "Gowun Batang",serif;display:block;margin-bottom:6px}' +
    '.list{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:10px;padding:0;list-style:none}.list a{display:block;background:#221A40;border:1px solid #3A2F6B;border-radius:14px;padding:12px 14px;text-decoration:none;color:#F2EEFF;height:100%;box-sizing:border-box}' +
    '.list small{display:block;color:#ABA2CE;font-size:13px;line-height:1.5;margin-top:3px}h2{font:700 20px "Gowun Batang",serif;margin:30px 0 12px}.hubs{display:flex;flex-wrap:wrap;gap:8px}.hubs a{background:#2B2252;border-radius:999px;padding:7px 13px;text-decoration:none;font-size:14px}' +
    'footer{color:#8D84B5;font-size:13px;margin-top:40px}</style></head><body><div class="w">' +
    '<header><a class="logo" href="/">🌙 밤톨</a><a class="go" href="/">우리 아이 이름 동화 만들기</a></header>' +
    body +
    '<h2>동화 모음 더 보기</h2><div class="hubs">' + Object.keys(HUBS).map(k => '<a href="/' + k + '/">' + HUBS[k].h + '</a>').join('') + '</div>' +
    '<footer>© 밤톨 · 매일 밤 우리 아이 맞춤 동화 · <a href="/">bamtol.co.kr</a></footer></div></body></html>';
}

const card = x => '<li><a href="/' + x.s + '/">' + x.e + ' ' + esc(x.t) + '<small>' + esc(x.o) + '</small></a></li>';

function storyPage(x, all) {
  const cat = CAT[x.c] || '동화';
  const title = x.t + ' 동화 | 잠자리 ' + cat + ' 읽어주기 – 밤톨';
  const desc = x.t + ' – ' + x.o + '. 밤톨에서 무료로 읽고, 사람 같은 자연 음성으로 들려주세요.';
  const rel = all.filter(y => y.c === x.c && y.s !== x.s).slice(0, 6);
  const text = x.b.replace(/<br\s*\/?>/g, ' ').replace(/\s+/g, ' ').trim();
  const body =
    '<nav class="bc"><a href="/">홈</a> › <a href="/' + cat + '/">' + cat + '</a> › ' + esc(x.t) + '</nav>' +
    '<h1>' + x.e + ' ' + esc(x.t) + '</h1><p class="one">' + esc(x.o) + '</p><div class="meta">' + cat + ' · ' + x.L + ' · 읽는 시간 약 ' + mins(x.b) + '분</div>' +
    '<button class="play" id="play">🔊 자연 음성으로 읽어주기</button>' +
    '<article class="story">' + x.b + '</article>' +
    '<div class="cta"><b>우리 아이 이름이 주인공인 동화</b>이름과 좋아하는 것만 등록하면 매일 밤 새 동화가 도착해요.<br><a class="go" style="display:inline-block;margin-top:12px" href="/">무료로 시작하기 →</a></div>' +
    '<h2>' + cat + ' 더 읽기</h2><ul class="list">' + rel.map(card).join('') + '</ul>' +
    '<script>var T=' + JSON.stringify(text).replace(/</g, '\\u003c') + ';' +
    'function sp(t){var o=[],c="";(t.match(/[^.!?…]+[.!?…]*/g)||[]).forEach(function(s){if(c.length+s.length>480&&c){o.push(c);c="";}c+=s;});if(c)o.push(c);return o;}' +
    'var A=null;document.getElementById("play").onclick=function(){var b=this;if(A){A.pause();A=null;b.textContent="🔊 자연 음성으로 읽어주기";return;}' +
    'var p=sp(T),i=0,a=new Audio();A=a;b.textContent="⏸ 멈추기";function go(){a.src="/api/tts?v=ko-KR-Chirp3-HD-Leda&r=0.85&t="+encodeURIComponent(p[i]);a.play().catch(function(){});}' +
    'a.onended=function(){i++;if(A===a&&i<p.length)go();else{A=null;b.textContent="🔊 자연 음성으로 읽어주기";}};go();};</script>';
  const ld = { '@context': 'https://schema.org', '@graph': [
    { '@type': 'Article', headline: x.t, description: desc, inLanguage: 'ko', genre: cat, author: { '@type': 'Organization', name: '밤톨' }, publisher: { '@type': 'Organization', name: '밤톨', url: SITE + '/' }, mainEntityOfPage: SITE + '/' + x.s + '/', image: SITE + '/api/img?i=og' },
    { '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: '홈', item: SITE + '/' }, { '@type': 'ListItem', position: 2, name: cat, item: SITE + '/' + cat + '/' }, { '@type': 'ListItem', position: 3, name: x.t, item: SITE + '/' + x.s + '/' }] },
  ] };
  return page({ path: '/' + x.s + '/', title, desc, body, ld });
}

function hubPage(k, all) {
  const H = HUBS[k], items = all.filter(H.f), desc = H.d.replace('{n}', items.length);
  const title = H.h + ' ' + items.length + '편 – 무료로 읽고 듣는 아이 동화 | 밤톨';
  const body = '<nav class="bc"><a href="/">홈</a> › ' + H.h + '</nav><h1>' + H.h + '</h1><p class="one">' + esc(desc) + '</p>' +
    '<ul class="list" style="margin-top:18px">' + items.map(card).join('') + '</ul>' +
    '<div class="cta"><b>매일 밤, 우리 아이가 주인공인 새 동화</b>아이 이름만 등록하면 잠들 시간에 맞춰 동화가 도착해요.<br><a class="go" style="display:inline-block;margin-top:12px" href="/">무료로 시작하기 →</a></div>';
  const ld = { '@context': 'https://schema.org', '@type': 'CollectionPage', name: H.h, description: desc, url: SITE + '/' + k + '/', inLanguage: 'ko',
    mainEntity: { '@type': 'ItemList', itemListElement: items.map((x, i) => ({ '@type': 'ListItem', position: i + 1, url: SITE + '/' + x.s + '/', name: x.t })) } };
  return page({ path: '/' + k + '/', title, desc, body, ld });
}

// 사이트맵·RSS 자동 생성: 동화가 늘면 둘 다 저절로 늘어남
function feed(kind, all) {
  const u = p => SITE + '/' + encodeURIComponent(p) + '/';
  const last = all.reduce((m, x) => (x.d > m ? x.d : m), D0);
  if (kind === 'map') {
    const row = (loc, f, p, d) => '<url><loc>' + loc + '</loc><lastmod>' + d + '</lastmod><changefreq>' + f + '</changefreq><priority>' + p + '</priority></url>\n';
    return '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + row(SITE + '/', 'weekly', '1.0', last) +
      Object.keys(HUBS).map(k => row(u(k), 'weekly', '0.8', last)).join('') + all.map(x => row(u(x.s), 'monthly', '0.6', x.d)).join('') + '</urlset>\n';
  }
  const items = all.map((x, i) => [x, i]).sort((a, b) => b[0].d.localeCompare(a[0].d) || b[1] - a[1]).slice(0, 50).map(a => a[0]);
  const day = d => new Date(d + 'T21:00:00+09:00').toUTCString();
  return '<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0"><channel><title>밤톨 – 우리 아이 잠자리 동화</title><link>' + SITE + '/</link>' +
    '<description>전래동화·세계명작·이솝우화 잠자리 동화를 무료로 읽고 자연 음성으로 들어보세요.</description><language>ko</language><lastBuildDate>' + day(last) + '</lastBuildDate>\n' +
    items.map(x => '<item><title>' + esc(x.t + ' 동화') + '</title><link>' + u(x.s) + '</link><guid isPermaLink="true">' + u(x.s) + '</guid><category>' + (CAT[x.c] || '동화') + '</category>' +
      '<description>' + esc(x.o + ' – ' + x.b.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 160) + '…') + '</description><pubDate>' + day(x.d) + '</pubDate></item>\n').join('') +
    '</channel></rss>\n';
}

// 메인 화면 안에 박혀 있던 그림(1.2MB)을 따로 내려줌 → 첫 화면이 가벼워짐 (middleware.js 가 주소를 바꿔 끼움)
const imgId = b => b.length + '-' + b.slice(200, 216).replace(/\+/g, '-').replace(/\//g, '_');
let IMGS = null;
async function img(host, id) {
  if (!IMGS) {
    const t = await (await fetch('https://' + host + '/index.html')).text();
    IMGS = {};
    for (const m of t.matchAll(/data:(image\/[a-z+]+);base64,([A-Za-z0-9+/=]+)/g)) IMGS[imgId(m[2])] = [m[1], m[2]];
  }
  return IMGS[id];
}

module.exports = async (req, res) => {
  const q = req.query || {};
  const s = String(q.s || '').normalize('NFC');
  if (q.img) {
    try {
      const x = await img(req.headers.host || 'bamtol.co.kr', String(q.img));
      if (!x) return res.status(404).end();
      res.setHeader('Content-Type', x[0]);
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable'); // 그림이 바뀌면 주소(id)도 바뀜
      return res.status(200).send(Buffer.from(x[1], 'base64'));
    } catch (e) { return res.status(500).end(); }
  }
  if (q.feed) {
    try {
      const x = feed(q.feed, await lib(req.headers.host || 'bamtol.co.kr'));
      res.setHeader('Content-Type', q.feed === 'map' ? 'application/xml; charset=utf-8' : 'application/rss+xml; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=600, s-maxage=3600');
      return res.status(200).send(x);
    } catch (e) { return res.status(500).end(); }
  }
  if (q.ns) return res.redirect(308, '/' + encodeURIComponent(s) + '/'); // 끝에 / 붙인 주소 하나로 통일
  try {
    const all = await lib(req.headers.host || 'bamtol.co.kr');
    const x = all.find(y => y.s === s);
    const html = HUBS[s] ? hubPage(s, all) : x ? storyPage(x, all) : null;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    if (!html) return res.status(404).send(page({ path: '/', title: '페이지를 찾을 수 없어요 | 밤톨', desc: '밤톨', body: '<h1>페이지를 찾을 수 없어요</h1><p><a href="/">밤톨 처음으로 →</a></p>', ld: {} }));
    res.setHeader('Cache-Control', 'public, max-age=600, s-maxage=86400, stale-while-revalidate=604800');
    return res.status(200).send(html);
  } catch (e) { return res.status(500).end(); }
};
module.exports.HUBS = HUBS;
module.exports.lib = lib;
