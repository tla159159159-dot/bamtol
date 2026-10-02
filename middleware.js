// 메인 화면(/)을 내보낼 때: ① 검색·공유용 제목/설명/주소 정리(SEO) ② 음성 패치(tts-patch.js) 한 줄 추가.
// index.html이 커서(2.3MB) 웹 편집기로 직접 못 고치기 때문에 이 방식 사용. 문제 생기면 원본 그대로 보여줌.
export const config = { matcher: '/' };

const SITE = 'https://bamtol.co.kr';
const TITLE = '밤톨 | 우리 아이 맞춤 잠자리 동화 – 매일 밤 이름 동화·전래동화 읽어주기';
const DESC = '아이 이름만 등록하면 매일 밤 우리 아이가 주인공인 맞춤 동화가 도착해요. 전래동화·세계명작·이솝우화 130여 편 무료, 사람 같은 자연 음성으로 읽어주고 엄마·아빠 목소리 인사말까지. 카드 없이 무료로 시작하세요.';
const OG = SITE + '/api/img?i=og';
const HEAD_ADD =
  '<meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">' +
  '<meta property="og:image:alt" content="밤톨 – 우리 아이 맞춤 잠자리 동화">' +
  '<meta name="twitter:image" content="' + OG + '">' +
  '<link rel="icon" type="image/png" sizes="48x48" href="/api/img?i=icon">' +
  '<link rel="apple-touch-icon" href="/api/img?i=apple">\n';
const HUB_LINKS = '<nav aria-label="동화 모음" style="margin-top:18px;font-size:13.5px;line-height:2">📚 동화 모음 · ' +
  [['잠자리동화', '잠자리 동화'], ['전래동화', '전래동화'], ['세계명작동화', '세계명작동화'], ['이솝우화', '이솝우화'], ['짧은동화', '짧은 동화'], ['긴동화', '긴 동화']]
    .map(([s, n]) => '<a href="/' + s + '/" style="margin-right:12px">' + n + '</a>').join('') + '</nav>';
const meta = (h, attr, val) => h.replace(new RegExp('(<meta ' + attr + ' content=")[^"]*'), (_, a) => a + val);

function seo(h) {
  h = h.replaceAll('{도메인}', 'bamtol.co.kr').replaceAll('100여 편', '130여 편');
  h = h.replace(/<link rel="icon" href="data:[^"]*">/, '');
  h = h.replace(/<title>[^<]*<\/title>/, () => '<title>' + TITLE + '</title>');
  h = meta(h, 'name="description"', DESC);
  h = meta(h, 'property="og:title"', TITLE);
  h = meta(h, 'property="og:description"', DESC);
  h = meta(h, 'name="twitter:title"', TITLE);
  h = meta(h, 'name="twitter:description"', DESC);
  h = meta(h, 'property="og:image"', OG);
  h = h.replace('<meta property="og:locale"', () => HEAD_ADD + '<meta property="og:locale"');
  return h.replace('</footer>', () => HUB_LINKS + '</footer>'); // 동화 모음 페이지로 가는 길 (검색로봇이 따라감)
}

export default async function middleware(req) {
  try {
    const r = await fetch(new URL('/index.html', req.url));
    if (!r.ok) return;
    const html = seo(await r.text()) + '\n<script src="/tts-patch.js"></script>\n';
    return new Response(html, { status: 200, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'public, max-age=0, must-revalidate' } });
  } catch (e) {
    return;
  }
}
