// 메인 화면(/)을 내보낼 때: ① 검색·공유용 제목/설명/주소 정리(SEO) ② 음성 패치(tts-patch.js) 한 줄 추가.
// index.html이 커서(2.3MB) 웹 편집기로 직접 못 고치기 때문에 이 방식 사용. 문제 생기면 원본 그대로 보여줌.
export const config = { matcher: '/' };

const SITE = 'https://bamtol.co.kr';
const TITLE = '밤톨 | 우리 아이 맞춤 잠자리 동화 – 매일 밤 이름 동화·전래동화 읽어주기';
const DESC = '아이 이름만 등록하면 매일 밤 우리 아이가 주인공인 맞춤 동화가 도착해요. 전래동화·세계명작·이솝우화 130여 편 무료, 사람 같은 자연 음성으로 읽어주고 엄마·아빠 목소리 인사말까지. 카드 없이 무료로 시작하세요.';
const OG = SITE + '/api/img?i=og';
const HEAD_ADD =
  '<meta name="naver-site-verification" content="8e72dd3eecc2e93d11a8101310db57606e48c073" />' +
  '<meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">' +
  '<meta property="og:image:alt" content="밤톨 – 우리 아이 맞춤 잠자리 동화">' +
  '<meta name="twitter:image" content="' + OG + '">' +
  '<link rel="icon" type="image/png" sizes="48x48" href="/api/img?i=icon">' +
  '<link rel="apple-touch-icon" href="/api/img?i=apple">\n';
const HUB_LINKS = '<nav aria-label="동화 모음" style="margin-top:18px;font-size:13.5px;line-height:2">📚 동화 모음 · ' +
  [['잠자리동화', '잠자리 동화'], ['전래동화', '전래동화'], ['세계명작동화', '세계명작동화'], ['이솝우화', '이솝우화'], ['짧은동화', '짧은 동화'], ['긴동화', '긴 동화']]
    .map(([s, n]) => '<a href="/' + s + '/" style="margin-right:12px">' + n + '</a>').join('') + '</nav>';
// 사업자 정보·정책 (주소·연락처는 받으면 ADDR/CONTACT 채우기)
const ADDR = '서울특별시 강서구 공항대로 209', CONTACT = 'tla2642@naver.com';
const ASK = CONTACT || '고객문의 안내 준비 중';
const LEGAL = '<div class="foot-legal">상호 CKT컴퍼니 · 대표 최인호·안태흥 · 개인정보보호책임자 최인호<br>사업자등록번호 442-01-01103 · 통신판매업신고 제2019-서울양천-0764호 · <a href="https://www.ftc.go.kr/bizCommPop.do?wrkr_no=4420101103" target="_blank" rel="noopener">사업자정보확인</a>' +
  (ADDR || CONTACT ? '<br>' + [ADDR && '주소 ' + ADDR, CONTACT && '고객문의 ' + CONTACT + ' (평일 10:00~18:00)'].filter(Boolean).join(' · ') : '') + '</div>';
const PRIVACY = '<p>CKT컴퍼니(이하 \'회사\')는 밤톨 서비스를 운영하며 개인정보 보호법 등 관련 법령을 지킵니다.</p>' +
  '<h4>1. 수집하는 항목</h4><p>카카오 로그인: 카카오 회원번호, 닉네임<br>아이 정보(보호자가 입력): 이름 또는 애칭, 나이대, 좋아하는 것, 잠드는 시간<br>인사말 녹음(선택): 보호자가 직접 녹음하거나 올린 음성(각 20초 이내)<br>자동 생성: 접속 기록, 로그인 유지용 쿠키<br>유료 결제 시: 결제 정보는 결제대행사가 처리하며 회사는 카드번호를 저장하지 않습니다.</p>' +
  '<h4>2. 이용 목적</h4><p>로그인과 회원 식별, 아이 맞춤 동화 제공, 동화 재생 시 인사말 들려주기, 구독·결제 관리, 문의 응대, 서비스 개선. 아이 정보와 음성은 광고·마케팅에 쓰거나 제3자에게 판매하지 않습니다.</p>' +
  '<h4>3. 보유 및 파기</h4><p>회원 탈퇴 또는 삭제 요청 시 지체 없이 파기합니다. 인사말 녹음은 \'내 밤톨\'에서 언제든 직접 삭제할 수 있습니다. 단, 전자상거래법 등 법령이 정한 거래 기록은 정해진 기간(계약·결제 기록 5년 등) 보관합니다.</p>' +
  '<h4>4. 처리 위탁 및 국외 이전</h4><p>서비스 제공을 위해 아래 업체에 처리를 맡깁니다.<br>· 카카오: 로그인 인증<br>· Vercel Inc.(미국): 웹사이트 호스팅<br>· Upstash Inc.(미국): 회원·아이 정보, 인사말 음성 저장<br>· Google LLC(미국): 동화 음성 합성(동화 문장만 전송, 개인정보 미포함)<br>정보는 서비스 이용 시 네트워크를 통해 암호화 전송되며, 보유 기간은 위 3번과 같습니다. 국외 이전을 원하지 않으면 로그인·녹음 기능을 쓰지 않거나 탈퇴할 수 있습니다.</p>' +
  '<h4>5. 아이 개인정보</h4><p>회원 가입과 정보 입력은 보호자(만 14세 이상)가 합니다. 보호자는 아이 정보의 열람·정정·삭제·처리정지를 언제든 요청할 수 있습니다.</p>' +
  '<h4>6. 안전조치</h4><p>전송 구간 암호화(HTTPS), 위조 방지 서명 쿠키, 저장소 접근 권한 제한을 적용합니다.</p>' +
  '<h4>7. 쿠키</h4><p>로그인 유지에 필요한 쿠키만 사용합니다. 브라우저 설정에서 거부할 수 있으나 이 경우 로그인이 유지되지 않습니다.</p>' +
  '<h4>8. 개인정보보호책임자</h4><p>최인호 (CKT컴퍼니 대표) / ' + ASK + '</p><p>본 방침은 2026년 10월 2일부터 적용됩니다.</p>';
function legal(h) {
  h = h.replace(/<div class="foot-legal">[\s\S]*?<\/div>/, () => LEGAL);
  h = h.replace(/<p[^>]*>본 페이지는 서비스 준비 중 데모입니다[\s\S]*?<\/p>/, '');
  h = h.replace(/<div class="policy-note">[\s\S]*?<\/div>/, '');
  h = h.replace(/privacy:\{t:'개인정보처리방침',h:'(?:\\.|[^'\\])*'\}/, () => "privacy:{t:'개인정보처리방침',h:" + JSON.stringify(PRIVACY) + '}');
  h = h.replace('(PDF·실물책)', '(PDF 저장)').replace(' 연말엔 실물 책으로도.', ' PDF로 저장해 오래 간직할 수 있어요.'); // 실물책은 아직 없음
  return h.replaceAll('[회사명]', 'CKT컴퍼니').replaceAll('[시행일]', '2026년 10월 2일').replaceAll('[이메일] / [전화번호]', ASK).replaceAll('[이메일]', ASK);
}
const meta = (h, attr, val) => h.replace(new RegExp('(<meta ' + attr + ' content=")[^"]*'), (_, a) => a + val);

// 박혀 있던 그림 → /img/<id>.webp 정적 파일로 (저장소 img 폴더, 이름 규칙은 api/page.js imgId 와 같음). 첫 화면 밖 그림은 늦게 불러오기
// index.html 그림을 바꾸면 img 폴더에도 새 파일을 올려야 함 (없으면 /api/page?img=<id> 로 바꿔도 동작)
const imgId = b => b.length + '-' + b.slice(200, 216).replace(/\+/g, '-').replace(/\//g, '_');
const ABOVE = /brand-logo|hero-clouds|hero-mascot/;
function lighten(h) {
  h = h.replace(/data:image\/([a-z]+)[a-z+]*;base64,([A-Za-z0-9+/=]+)/g, (_, t, b) => '/img/' + imgId(b) + '.' + t);
  return h.replace(/<img (?![^>]*loading=)([^>]*)>/g, (m, a) => (ABOVE.test(a) ? m : '<img loading="lazy" decoding="async" ' + a + '>'));
}

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
  h = legal(h);
  h = lighten(h);
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
