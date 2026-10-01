// 메인 화면(/)에 음성 패치(tts-patch.js) 한 줄을 붙여서 내보냄.
// index.html이 커서(2.3MB) 웹 편집기로 직접 못 고치기 때문에 이 방식 사용. 문제 생기면 원본 그대로 보여줌.
export const config = { matcher: '/' };

export default async function middleware(req) {
  try {
    const r = await fetch(new URL('/index.html', req.url));
    if (!r.ok || !r.body) return;
    const tag = new TextEncoder().encode('\n<script src="/tts-patch.js"></script>\n');
    const body = r.body.pipeThrough(new TransformStream({ flush(c) { c.enqueue(tag); } }));
    return new Response(body, { status: 200, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'public, max-age=0, must-revalidate' } });
  } catch (e) {
    return;
  }
}
