// 밤톨 회원 기능: 카카오 로그인, 아이 정보 저장, 엄마·아빠 인사말 녹음 (서버: /api/me)
var ME={login:false};
var KAKAO_SVG='<svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><path fill="#191919" d="M12 3C6.5 3 2 6.6 2 11c0 2.8 1.9 5.3 4.7 6.7l-1 3.6c-.1.3.3.6.6.4l4.2-2.8c.5.1 1 .1 1.5.1 5.5 0 10-3.6 10-8S17.5 3 12 3z"/></svg>';
var SLOT_INFO={hello:['시작 인사','예) "지우야, 오늘도 엄마가 동화 들려줄게"'],bye:['끝 인사','예) "잘 자, 사랑해. 좋은 꿈 꿔"']};

function esc(s){ return String(s).replace(/[&<>"]/g,function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }); }
function kakaoLogin(){ location.href='/api/me?login'; }
async function meLoad(){
try{ ME=await (await fetch('/api/me',{cache:'no-store'})).json(); }catch(e){ ME={login:false}; }
renderMe();
if(!ME.login) return;
if(ME.kid){ try{ localStorage.setItem('bamtol_kid',JSON.stringify(ME.kid)); }catch(e){} try{ applyKid(ME.kid); }catch(e){} }
else { try{ var k=JSON.parse(localStorage.getItem('bamtol_kid')||'null'); if(k&&k.name) meSave({kid:k}); }catch(e){} } // 로그인 전에 등록한 아이 정보 옮기기
}
async function meSave(body){
var r=await fetch('/api/me',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
if(!r.ok) throw new Error(r.status);
var j=await r.json(); delete j.ok; Object.assign(ME,j); renderMe(); return j;
}
function renderMe(){
var box=document.getElementById('meBox');
if(!box){ var nr=document.querySelector('.nav-right'); if(!nr) return; nr.insertAdjacentHTML('afterbegin','<span id="meBox"></span>'); box=document.getElementById('meBox'); }
box.innerHTML='';
var b=document.createElement('button'); b.type='button';
if(ME.login){ b.className='mebtn'; b.textContent='🌙 '+(ME.nick||'회원')+'님'; b.onclick=openMe; }
else { b.className='kakaobtn'; b.innerHTML=KAKAO_SVG+'<span><span class="kl">카카오 </span>로그인</span>'; b.onclick=kakaoLogin; }
box.appendChild(b);
var m=document.getElementById('meModal'); if(m&&!m.hidden) fillMe();
document.querySelectorAll('[data-greetbtn]').forEach(function(g){ var n=ME.rec?Object.keys(ME.rec).length:0; g.textContent=n?'녹음됨 '+n+'/2  ▸ 바꾸기':'녹음하기'; });
}
// 동화 재생 목록 앞뒤에 인사말 끼우기 (tts-patch.js 의 googleSpeak 가 부름)
function meGreet(urls){
if(!ME.login||!ME.rec) return urls;
var o=urls.slice();
if(ME.rec.hello) o.unshift('/api/me?rec=hello&v='+ME.rec.hello);
if(ME.rec.bye) o.push('/api/me?rec=bye&v='+ME.rec.bye);
return o;
}
function openMe(){
if(!ME.login){ toast('카카오로 로그인하면 내 목소리 인사말을 저장할 수 있어요'); setTimeout(kakaoLogin,900); return; }
var m=document.getElementById('meModal');
if(!m){
document.body.insertAdjacentHTML('beforeend','<div class="modal setmodal" id="meModal" hidden role="dialog" aria-modal="true" aria-label="내 밤톨" onclick="if(event.target===this)closeMe()"><div class="setpanel">'
+'<h3 id="meTitle"></h3><p class="setdesc">아이 정보와 인사말은 카카오 계정에 저장돼서 휴대폰을 바꿔도 그대로예요.</p>'
+'<label class="setlabel">우리 아이</label><div id="meKids"></div>'
+'<div id="meDl"></div><div id="meFav"></div>'
+'<label class="setlabel">👩 엄마·아빠 목소리 인사말</label><p class="setdesc" style="margin-top:2px">동화 시작과 끝에 내 목소리가 나와요. 각 20초까지.</p>'
+'<div id="meRecs"></div>'
+'<div class="setbtns"><button type="button" class="btn btn-ghost" onclick="location.href=\'/api/me?logout\'">로그아웃</button><button type="button" class="btn btn-brand" onclick="closeMe()">닫기</button></div>'
+'<p style="text-align:center;margin:14px 0 0"><button type="button" id="meQuit" onclick="meQuit(this)" style="background:none;border:0;color:var(--ink-faint,#ABA2CE);font:inherit;font-size:12.5px;text-decoration:underline;cursor:pointer">회원 탈퇴</button></p>'
+'</div></div>');
m=document.getElementById('meModal');
}
fillMe(); m.hidden=false;
}
function closeMe(){ if(recState) recState.mr.stop(); var m=document.getElementById('meModal'); if(m) m.hidden=true; }
function fillMe(){
document.getElementById('meTitle').innerHTML='<span style="white-space:nowrap">🌙 '+esc(ME.nick||'회원')+'님의 밤톨</span> <span class="meplan">'+(ME.beta?'PLUS 무료 체험 중':ME.plus?'PLUS'+(ME.plusUntil?' · '+ME.plusUntil.slice(5).replace('-','/')+'까지':''):'FREE')+'</span>';
var k=ME.kid;
// 우리 아이 목록: 이야기 보기·수정·삭제, PLUS 는 최대 4명까지 추가
var ks=meKids(), kb=document.getElementById('meKids');
kb.innerHTML=ks.map(function(x,i){ return '<div class="mekid"><span><b>'+esc(x.name)+'</b> · '+esc(x.age||'')+' · '+esc(x.time||'')+(x.bd?' · 🎂 '+(+x.bd.slice(0,2))+'월 '+(+x.bd.slice(3))+'일':'')+'</span><span class="mekb">'+(ks.length>1?'<button type="button" class="btn btn-ghost" onclick="closeMe();kidStory('+i+')">이야기</button>':'')+'<button type="button" class="btn btn-ghost" onclick="closeMe();openKidReg('+i+')">수정</button>'+(ks.length>1?'<button type="button" class="btn btn-ghost" onclick="kidDel('+i+',this)">삭제</button>':'')+'</span></div>'; }).join('')
+(ks.length?'':'<div class="mekid"><span>아직 등록 전이에요</span><button type="button" class="btn btn-ghost" onclick="closeMe();openKidReg(0)">등록</button></div>')
+(ks.length&&ks.length<4?'<button type="button" class="btn btn-ghost" style="margin-top:8px;width:100%" onclick="kidAdd()">＋ 아이 추가'+(ME.plus?'':' (PLUS)')+'</button>':'')
+'<p class="setdesc" style="margin-top:6px">생일을 넣어두면 그날 밤엔 생일 특별 동화가, 설·추석·어린이날·크리스마스엔 명절 동화가 도착해요.</p>';
// 매일 밤 카톡으로 받기
var dl=document.getElementById('meDl');
dl.innerHTML='<div class="recrow"><div class="rectxt"><b>🌙 매일 밤 카톡으로 받기'+(ME.dl?' ✅':'')+'</b><small>'+(k?(meKids().length>1&&ME.plus?'아이마다 정한 시간에 각자의 동화를':k.time+'에 오늘의 동화를')+' 카톡으로 보내드려요'+(ME.plus?'':' (FREE는 토요일에만 · 매일은 PLUS)'):'아이를 먼저 등록해 주세요')+'</small></div><div class="recbtns"><button type="button" class="btn '+(ME.dl?'btn-ghost':'btn-brand')+'" data-act="dl">'+(ME.dl?'끄기':'켜기')+'</button>'+(ME.dl?'<button type="button" class="btn btn-ghost" data-act="test">지금 받아보기</button>':'')+'</div></div>';
dl.querySelector('[data-act=dl]').onclick=function(){ dlSet(!ME.dl); };
var tb=dl.querySelector('[data-act=test]'); if(tb) tb.onclick=dlTest;
dl.insertAdjacentHTML('beforeend','<div class="recrow"><div class="rectxt"><b>📖 이번 달 동화책</b><small>이번 달 동화를 책으로 묶어 PDF로 저장해요</small></div><div class="recbtns"><button type="button" class="btn btn-ghost" onclick="makeBook()">PDF 저장</button></div></div>');
// 찜·최근 읽은 동화 목록 (누르면 바로 열림)
var fv=document.getElementById('meFav');
if(fv&&typeof LIB!=='undefined'){ var chip=function(key){ var i=libIndex(key); return i<0?'':'<button type="button" class="thm" style="margin:6px 6px 0 0" onclick="closeMe();openFolk('+i+')">'+LIB[i].e+' '+LIB[i].t+'</button>'; };
var fs=(ME.fav||[]).map(chip).join(''), rs=(ME.recent||[]).slice(0,8).map(chip).join('');
fv.innerHTML=(fs?'<label class="setlabel">❤ 찜한 동화</label><div>'+fs+'</div>':'')+(rs?'<label class="setlabel">🕘 최근 읽은 동화</label><div>'+rs+'</div>':'')+(!fs&&!rs?'<p class="setdesc" style="margin-top:10px">동화를 읽다가 ♡ 찜을 누르면 여기에 모여요.</p>':''); }
var box=document.getElementById('meRecs'); box.innerHTML='';
['hello','bye'].forEach(function(s){
var has=ME.rec&&ME.rec[s];
var row=document.createElement('div'); row.className='recrow';
row.innerHTML='<div class="rectxt"><b>'+SLOT_INFO[s][0]+(has?' ✅':'')+'</b><small>'+SLOT_INFO[s][1]+'</small></div>'
+'<div class="recbtns"><button type="button" class="btn btn-brand" data-act="rec">● 녹음</button>'
+(has?'<button type="button" class="btn btn-ghost" data-act="play">▶ 듣기</button><button type="button" class="btn btn-ghost" data-act="del">삭제</button>':'')
+'<label class="btn btn-ghost recfile">📁 파일<input type="file" accept="audio/*" hidden></label></div>';
row.querySelector('[data-act=rec]').onclick=function(){ recToggle(s,this); };
var pb=row.querySelector('[data-act=play]'); if(pb) pb.onclick=function(){ new Audio('/api/me?rec='+s+'&v='+ME.rec[s]).play().catch(function(){ toast('재생하지 못했어요'); }); };
var db=row.querySelector('[data-act=del]'); if(db) db.onclick=function(){ recDel(s); };
row.querySelector('input[type=file]').onchange=function(){ if(this.files[0]) recSave(s,this.files[0]); this.value=''; };
box.appendChild(row);
});
}
var dlAfterReg=false; // 카톡 받기 누르다가 아이 등록으로 넘어간 경우, 등록 끝나면 이어서 켜기
async function dlPost(body){
var r=await fetch('/api/me',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
var j={}; try{ j=await r.json(); }catch(e){}
if(r.status===409&&j.need==='kid'){ toast('아이를 먼저 등록해 주세요'); dlAfterReg=true; closeMe(); openReg(); return null; }
if(r.status===409&&j.need==='consent'){ toast('카카오톡 메시지 받기 동의 화면으로 이동해요'); setTimeout(function(){ location.href='/api/me?login=msg'; },900); return null; }
if(r.status===429){ toast('1분 뒤에 다시 해주세요'); return null; }
if(!r.ok){ toast('잠시 후 다시 해주세요'); return null; }
return j;
}
async function dlSet(on){ var j=await dlPost({dl:on}); if(!j) return; ME.dl=j.dl; renderMe(); toast(on?'매일 밤 카톡으로 보내드릴게요 🌙':'카톡 받기를 껐어요'); }
async function dlTest(){ var j=await dlPost({test:1}); if(!j) return; toast(j.r==='sent'?'카톡을 확인해 보세요 💌':'보내지 못했어요. 잠시 후 다시 해주세요'); }
// 이번 달 동화책: /book.html 이 이 창의 동화·아이 정보를 받아 책 모양으로 쪽을 나누고 인쇄창 → 'PDF로 저장'
function makeBook(){
var k=meKids()[curKid]||ME.kid; if(!k||!k.name){ toast('아이를 먼저 등록해 주세요'); return; }
if(!ME.plus){ toast('월별 동화책 PDF는 PLUS에서 만들 수 있어요'); return; }
if(typeof STORIES==='undefined'){ toast('잠시 후 다시 해주세요'); return; }
var S={}; Object.keys(STORIES).forEach(function(x){ if(!SPECIAL[x]) S[x]=STORIES[x]; }); // 특별한 날 동화는 책에서 빼기
window.BOOK={S:S, kid:k, icon:(typeof themeIcon!=='undefined'?themeIcon:{}), jong:bamJong(k.name)};
if(!window.open('/book.html','_blank')) toast('팝업이 막혔어요. 팝업을 허용해 주세요');
}
// 받침 있는 이름(하준·지민) 조사 맞추기: 동화는 '지우는/지우야'처럼 받침 없는 이름 기준으로 쓰여 있음 → 하준이는 / 하준아
function bamJong(n){ var c=String(n).charCodeAt(String(n).length-1); return c>=0xAC00&&c<=0xD7A3&&(c-0xAC00)%28>0; }
function fixNames(root){ (root||document).querySelectorAll('.nm:not([data-fx])').forEach(function(s){
s.setAttribute('data-fx','1'); if(!bamJong(s.textContent)) return;
var t=s.nextSibling; if(t&&t.nodeType===3&&t.data.charAt(0)==='야') t.data='아'+t.data.slice(1); else s.insertAdjacentText('afterend','이');
}); }
// 동화 속 이름 반복 줄이기: 문단마다 첫 이름·대사 속 이름·부르는 말만 남기고 나머지는 '꼬마/아이'로 (한 편에 50~60번 → 25번 안팎)
function trimNames(body){
  var ep=body.indexOf('꼬마')<0?['꼬마','아이']:['아이'], e=0; // 동화에 '꼬마 로봇'처럼 이미 나오면 '아이'만
  return body.split(/(<br\s*\/?>\s*<br\s*\/?>)/).map(function(par){
    if(/^<br/.test(par)) return par;
    var seen=false, q=0;
    return par.replace(/「|」|@(야|에게|는|가|를|의|도|와)?/g, function(m, pt){
      if(m==='「'){ q++; return m; } if(m==='」'){ q--; return m; }
      if(q>0||!pt||pt==='야'||!seen){ seen=true; return m; } // 대사 속·부르는 말(안녕 ○○,)·문단 첫 이름은 그대로
      return ep[e++%ep.length]+(pt||'');                          // 나머지는 '꼬마/아이'
    });
  }).join('');
}
if(typeof STORIES!=='undefined') Object.keys(STORIES).forEach(function(k){ STORIES[k].body=trimNames(STORIES[k].body); });
if(typeof makeStory==='function'){ var _mk=makeStory; makeStory=function(){ _mk(); fixNames(); }; makeStory(); }
if(typeof packEpisode==='function'){ var _pe=packEpisode; packEpisode=function(i){ _pe(i); fixNames(); }; }
// 회원 탈퇴: 한 번 누르면 확인 문구, 한 번 더 누르면 아이 정보·녹음·카톡 받기 모두 삭제
function meQuit(b){
if(!b.dataset.ok){ b.dataset.ok='1'; b.textContent='정말 탈퇴할까요? 아이 정보·인사말 녹음이 모두 지워져요. 한 번 더 누르면 탈퇴돼요'; b.style.color='#ff8a8a'; return; }
b.disabled=true; b.textContent='탈퇴하는 중…';
fetch('/api/me?all',{method:'DELETE'}).then(function(r){ if(!r.ok) throw 0;
try{ localStorage.removeItem('bamtol_kid'); }catch(e){}
toast('탈퇴가 완료됐어요. 그동안 고마웠어요 🌙'); setTimeout(function(){ location.href='/'; },1500);
}).catch(function(){ b.disabled=false; b.textContent='회원 탈퇴'; delete b.dataset.ok; toast('탈퇴하지 못했어요. 잠시 후 다시 해주세요'); });
}
// 아이 여러 명: 등록창을 '몇 번째 아이' 로 열기 + 생일 칸 (월·일만 저장)
var regIdx=null, curKid=0;
function meKids(){ return ME.kids&&ME.kids.length?ME.kids:ME.kid?[ME.kid]:[]; }
(function(){ var a=document.getElementById('regAge'); if(!a||document.getElementById('regBd')) return;
a.insertAdjacentHTML('afterend','<label for="regBd">생일 <span style="font-weight:400">(선택 · 그날 밤 생일 동화가 와요)</span></label><input id="regBd" type="date" max="'+new Date().toISOString().slice(0,10)+'" style="width:100%;box-sizing:border-box">'); })();
if(typeof openReg==='function'){ var _or=openReg; openReg=function(){ _or(); regIdx=null; var h=document.querySelector('#reg h3'); if(h) h.textContent='아이를 등록해요';
try{ var s=JSON.parse(localStorage.getItem('bamtol_kid')||'null'), bi=document.getElementById('regBd'); if(bi) bi.value=s&&s.bd?(new Date().getFullYear()-(parseInt(s.age)||5))+'-'+s.bd:''; }catch(e){} }; }
function openKidReg(i){
var k=meKids()[i]; openReg(); regIdx=i;
var set=function(id,v){ var e=document.getElementById(id); if(e&&v!=null) e.value=v; };
set('regName',k?k.name:''); if(k){ set('regAge',k.age); set('regTime',k.time); }
var y=new Date().getFullYear()-(parseInt(k&&k.age)||5); set('regBd',k&&k.bd?y+'-'+k.bd:'');
document.querySelectorAll('#regInts .int').forEach(function(b){ b.setAttribute('aria-pressed', k?((k.ints||[]).indexOf(b.dataset.t)>=0?'true':'false'):(b.dataset.t==='숲'?'true':'false')); });
var h=document.querySelector('#reg h3'); if(h) h.textContent=k?k.name+' 정보 수정':(i?'아이를 한 명 더 등록해요':'아이를 등록해요');
}
function kidAdd(){ if(!ME.plus){ toast('아이 여러 명 등록은 PLUS에서 할 수 있어요'); return; } closeMe(); openKidReg(meKids().length); }
function kidStory(i){ var k=meKids()[i]; if(!k) return; curKid=i; try{ applyKid(k); }catch(e){} go('#try'); toast(k.name+'의 오늘 밤 동화예요 🌙'); }
function kidDel(i,b){ if(!b.dataset.ok){ b.dataset.ok='1'; b.textContent='정말 삭제'; return; }
mePost({delKid:i}).then(function(r){ if(!r.ok) throw 0; return r.json(); }).then(function(j){ delete j.ok; Object.assign(ME,j); if(curKid>=meKids().length) curKid=0; renderMe(); fillMe(); toast('삭제했어요'); }).catch(function(){ toast('잠시 후 다시 해주세요'); }); }
var SPECIAL={}; // 생일·명절 특별 동화 (아래에서 불러옴)
// 찜·최근 읽은 동화: 동화 키 = 제목|단편/장편 (동화 페이지 api/page.js 와 같은 키). 로그인한 회원만 저장
function storyKey(f){ return f.t+'|'+(f.L||'단편'); }
function libIndex(key){ if(typeof LIB==='undefined') return -1; for(var i=0;i<LIB.length;i++) if(storyKey(LIB[i])===key) return i; return -1; }
function mePost(b){ return fetch('/api/me',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(b)}); }
var curFolkIdx=-1;
function favBtn(){
var b=document.getElementById('ftFav');
if(!b){ var row=document.querySelector('#ftModal .fbtns'); if(!row) return; row.insertAdjacentHTML('beforeend','<button class="btn btn-ghost" id="ftFav" type="button" onclick="favToggle()"></button>'); b=document.getElementById('ftFav'); }
var f=LIB[curFolkIdx]; b.textContent=(f&&ME.login&&(ME.fav||[]).indexOf(storyKey(f))>=0)?'♥ 찜함':'♡ 찜';
}
function favToggle(){
var f=LIB[curFolkIdx]; if(!f) return;
if(!ME.login){ toast('카카오로 로그인하면 찜할 수 있어요'); setTimeout(kakaoLogin,900); return; }
var k=storyKey(f), on=(ME.fav||[]).indexOf(k)<0;
mePost({fav:k,on:on}).then(function(r){ return r.ok?r.json():null; }).then(function(j){ if(!j){ toast('잠시 후 다시 해주세요'); return; } ME.fav=j.fav; favBtn(); toast(on?'찜했어요 ♥':'찜을 뺐어요'); }).catch(function(){});
}
if(typeof openFolk==='function'){ var _of=openFolk; openFolk=function(i){ _of(i); curFolkIdx=i; favBtn(); if(LIB[i]) fetch('/api/me?view='+encodeURIComponent(storyKey(LIB[i]))).catch(function(){});
if(ME.login&&LIB[i]){ var k=storyKey(LIB[i]); ME.recent=[k].concat((ME.recent||[]).filter(function(x){ return x!==k; })).slice(0,20); mePost({recent:k}).catch(function(){}); } }; }
// 동화 도서관 검색: 제목·한 줄 소개로 찾기 (띄어쓰기 무시)
var ftQ='';
if(typeof renderFolk==='function'){ var _rf=renderFolk; renderFolk=function(){
var q=ftQ.replace(/\s/g,''), ex=ftExpanded; if(q) ftExpanded=true; _rf(); ftExpanded=ex;
var g=document.getElementById('ftGrid'); if(!g) return; var n=0;
if(q) g.querySelectorAll('.ftcard').forEach(function(c){ var hit=c.textContent.replace(/\s/g,'').indexOf(q)>=0; c.style.display=hit?'':'none'; if(hit){ n++; c.classList.add('in'); } });
var m=document.getElementById('ftMore'); if(q&&m) m.innerHTML=n?'':'<p style="text-align:center;color:var(--ink-faint,#ABA2CE)">\''+ftQ.replace(/[<>&]/g,'')+'\' 동화를 찾지 못했어요</p>';
}; }
(function(){ var f=document.getElementById('ftFilter'); if(!f) return;
f.insertAdjacentHTML('beforebegin','<div style="max-width:420px;margin:0 auto 14px"><input id="ftSearch" type="search" placeholder="🔍 동화 제목으로 찾기 (예: 토끼)" aria-label="동화 검색" style="width:100%;box-sizing:border-box;border:1.5px solid var(--line-strong,#483C7C);background:var(--sunk,#241D45);color:var(--ink,#F8F5FF);border-radius:14px;padding:12px 14px;font:inherit;font-size:16px"></div>');
document.getElementById('ftSearch').oninput=function(){ ftQ=this.value.trim(); if(ftQ){ ftCat='all'; ftLen='all'; try{ renderFilter(); renderLenFilter(); }catch(e){} } renderFolk(); };
})();
var recState=null;
async function recToggle(slot,btn){
if(recState){ recState.mr.stop(); return; }
if(!window.MediaRecorder||!navigator.mediaDevices){ toast('이 브라우저는 녹음이 안 돼요. 📁 파일로 올려주세요'); return; }
var stream; try{ stream=await navigator.mediaDevices.getUserMedia({audio:true}); }catch(e){ toast('마이크 사용을 허용해 주세요'); return; }
var mr; try{ mr=new MediaRecorder(stream,{audioBitsPerSecond:48000}); }catch(e){ mr=new MediaRecorder(stream); }
var chunks=[];
mr.ondataavailable=function(e){ if(e.data.size) chunks.push(e.data); };
mr.onstop=function(){ stream.getTracks().forEach(function(t){ t.stop(); }); clearTimeout(recState.timer); recState=null; btn.textContent='● 녹음'; recSave(slot,new Blob(chunks,{type:(mr.mimeType||'audio/webm').split(';')[0]})); };
mr.start(); recState={mr:mr,timer:setTimeout(function(){ mr.stop(); },20000)};
btn.textContent='■ 멈추기 (최대 20초)';
}
function recSave(slot,blob){
if(!/^audio\//.test(blob.type)){ toast('음성 파일만 올릴 수 있어요'); return; }
if(blob.size>600000){ toast('파일이 너무 커요. 20초 이내로 녹음해 주세요'); return; }
if(blob.size<2000){ toast('녹음이 너무 짧아요. 다시 해주세요'); return; }
var fr=new FileReader();
fr.onload=function(){ meSave({rec:slot,type:blob.type,data:String(fr.result).split(',')[1]}).then(function(){ toast('인사말을 저장했어요 💛'); }).catch(function(){ toast('저장하지 못했어요. 잠시 후 다시 해주세요'); }); };
fr.readAsDataURL(blob);
}
async function recDel(slot){
var r=await fetch('/api/me?rec='+slot,{method:'DELETE'}); if(!r.ok){ toast('삭제하지 못했어요'); return; }
ME.rec=(await r.json()).rec; renderMe(); toast('삭제했어요');
}
(function(){
var ln=document.createElement('link'); ln.rel='stylesheet'; ln.href='/mobile.css'; document.head.appendChild(ln); // 모바일 다듬기
var st=document.createElement('style');
st.textContent='.kakaobtn{display:inline-flex;align-items:center;gap:6px;background:#FEE500;color:#191919;border:0;border-radius:12px;padding:9px 14px;font:inherit;font-size:14px;font-weight:700;cursor:pointer;white-space:nowrap}'
+'.mebtn{background:transparent;color:var(--ink,#F8F5FF);border:1.5px solid var(--line-strong,#483C7C);border-radius:12px;padding:8px 12px;font:inherit;font-size:14px;font-weight:700;cursor:pointer;white-space:nowrap;max-width:150px;overflow:hidden;text-overflow:ellipsis}'
+'.nav-right{display:flex;align-items:center;gap:8px}#meBox{display:inline-flex}'
+'.meplan{display:inline-block;vertical-align:middle;margin-left:6px;font:700 11.5px "Noto Sans KR",sans-serif;background:var(--gold-soft,#3A2E12);color:var(--gold,#FFC862);border-radius:999px;padding:3px 9px}.mekb{display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end}#meKids .mekid+.mekid{margin-top:8px}#meKids .mekid{flex-direction:column;align-items:stretch;gap:8px}#meKids .mekb{justify-content:flex-start}#meKids .mekb .btn{padding:6px 12px;font-size:13px}'
+'.mekid{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 12px;border:1.5px solid var(--line-strong,#483C7C);border-radius:12px;background:var(--sunk,#241D45)}.mekid .btn{padding:7px 12px;font-size:13px;white-space:nowrap;flex:none}'
+'.recrow{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:8px;padding:10px 12px;margin-top:8px;border:1.5px solid var(--line-strong,#483C7C);border-radius:12px;background:var(--sunk,#241D45)}'
+'.rectxt{display:flex;flex-direction:column;gap:2px;min-width:0}.rectxt small{color:var(--ink-faint,#ABA2CE);font-size:12px}.recbtns{display:flex;flex-wrap:wrap;gap:6px}.recbtns .btn{padding:7px 11px;font-size:13px}.recfile{cursor:pointer}'
+'@media (max-width:560px){.kakaobtn .kl{display:none}.kakaobtn{padding:9px 10px}.nav-right .btn{padding-left:12px;padding-right:12px}}';
document.head.appendChild(st);
// 목소리 고르기 줄 아래에 인사말 녹음 줄 추가
document.querySelectorAll('[data-voicebtn]').forEach(function(v){ var row=v.closest('.voicerow'); if(row) row.insertAdjacentHTML('afterend','<div class="voicerow"><span>👩 엄마·아빠 목소리 인사말</span><button type="button" class="thm vbtn" data-greetbtn onclick="openMe()">녹음하기</button></div>'); });
// 아이 등록하면 로그인 상태일 때 서버에도 저장
if(typeof submitReg==='function'){ var _sr=submitReg; submitReg=function(){
var bi=document.getElementById('regBd'), bd=bi&&/^\d{4}-\d\d-\d\d$/.test(bi.value)?bi.value.slice(5):'', idx=regIdx; regIdx=null;
_sr();
try{ var k=JSON.parse(localStorage.getItem('bamtol_kid')||'null'); if(k){ k.bd=bd; localStorage.setItem('bamtol_kid',JSON.stringify(k)); } }catch(e){ k=null; }
if(ME.login&&k){ var body={kid:k}; if(idx!=null) body.idx=idx; if(idx!=null) curKid=idx;
fetch('/api/me',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}).then(function(r){ if(r.status===402){ toast('아이 여러 명은 PLUS에서 등록할 수 있어요'); return null; } if(!r.ok) throw 0; return r.json(); })
.then(function(j){ if(!j) return; delete j.ok; Object.assign(ME,j); renderMe(); if(dlAfterReg){ dlAfterReg=false; dlSet(true); } }).catch(function(){ toast('저장하지 못했어요. 잠시 후 다시 해주세요'); }); }
}; }
// 생일·명절 특별 동화 (special-stories.json): STORIES 에 넣어서 ?tonight=생일 같은 카톡 링크로 열림
var SPW=fetch('/special-stories.json').then(function(r){ return r.ok?r.json():{}; }).then(function(o){ SPECIAL=o||{}; if(typeof STORIES==='undefined') return; Object.keys(SPECIAL).forEach(function(k){ STORIES[k]={title:SPECIAL[k].title, body:trimNames(SPECIAL[k].body)}; if(typeof themeIcon!=='undefined') themeIcon[k]=SPECIAL[k].icon; }); }).catch(function(){});
var p=new URLSearchParams(location.search).get('login');
var sp=new URLSearchParams(location.search), dlOn=sp.get('dl'), tonight=sp.get('tonight'), qn=(sp.get('name')||'').trim().slice(0,8);
if(p||tonight||qn){ history.replaceState(null,'',location.pathname+location.hash); }
if(p){ setTimeout(function(){ toast(p!=='ok'?'로그인하지 못했어요. 다시 시도해 주세요':dlOn?'매일 밤 카톡으로 보내드릴게요 🌙':'카카오 로그인 완료! 🌙'); },600); }
renderMe();
Promise.all([meLoad(), SPW]).then(function(){ // 카톡 링크로 들어오면 오늘 밤 동화 바로 열기 (생일·명절 동화 불러온 뒤)
if(qn){ var ki=document.getElementById('kidName'); if(ki){ ki.value=qn; makeStory(); go('#try'); setTimeout(function(){ toast(qn+' 이야기를 만들었어요 🌙 마음에 들면 아이를 등록해 매일 밤 받아보세요'); },700); } return; } // 동화 페이지에서 이름 넣고 들어온 경우
if(!tonight||typeof STORIES==='undefined'||!STORIES[tonight]) return;
theme=tonight; document.querySelectorAll('.thm[data-thm]').forEach(function(x){ x.setAttribute('aria-pressed', x.dataset.thm===tonight?'true':'false'); });
var kk=meKids()[+sp.get('k')||0]; if(kk){ curKid=+sp.get('k')||0; var kn=document.getElementById('kidName'); if(kn) kn.value=kk.name; } // 둘째·셋째 아이 카톡이면 그 아이 이름으로
makeStory(); go('#try');
});
// PLUS 결제(나이스페이) 열기 전: 'PLUS 시작하기'가 결제 없이 가짜 '구독중' 화면을 띄우지 않게, 지금 무료로 되는 매일 밤 카톡·동화책으로 안내
// 결제 붙일 때 이 줄을 결제창 열기로 바꾸기
if(typeof openMember==='function') openMember=function(){ if(ME.login){ toast('결제가 열리기 전까지 PLUS 전 기능이 무료예요 · 아이 여러 명·생일 동화·동화책 PDF까지 써보세요 🌙'); openMe(); return; } toast('결제가 열리기 전까지 PLUS 무료 체험 중 · 카카오 로그인만 하면 매일 밤 카톡 동화가 와요 🌙'); setTimeout(function(){ location.href='/api/me?login=msg'; },1600); };
// 동화 도서관 본문은 첫 화면을 가볍게 하려고 따로 받음 (middleware.js slim). 도서관 근처로 내려오거나 동화를 처음 열 때 한 번만
var BODIES=null;
function loadBodies(){ if(!BODIES) BODIES=fetch('/api/page?bodies').then(function(r){ if(!r.ok) throw 0; return r.json(); }).then(function(o){ if(typeof LIB!=='undefined') LIB.forEach(function(f){ if(!f.b&&o[f.t+'|'+(f.L||'단편')]) f.b=o[f.t+'|'+(f.L||'단편')]; }); return o; }).catch(function(e){ BODIES=null; throw e; }); return BODIES; }
if(typeof openFolk==='function'){ var _ofb=openFolk; openFolk=function(i){ if(typeof LIB==='undefined'||!LIB[i]||LIB[i].b) return _ofb(i);
var bd=document.getElementById('ftBody'); _ofb(i); if(bd) bd.innerHTML='<p style="text-align:center;opacity:.7">동화를 불러오는 중이에요… 🌙</p>';
loadBodies().then(function(){ var m=document.getElementById('ftModal'); if(m&&!m.hidden&&curFolkIdx===i) _ofb(i); }).catch(function(){ if(bd) bd.innerHTML='<p style="text-align:center">불러오지 못했어요. 잠시 후 다시 열어 주세요.</p>'; }); }; }
(function(){ var f=document.getElementById('folk'); if(!f||!('IntersectionObserver' in window)) return; var io=new IntersectionObserver(function(es){ if(es.some(function(e){ return e.isIntersecting; })){ io.disconnect(); loadBodies().catch(function(){}); } },{rootMargin:'600px'}); io.observe(f); })();
// 테마 동화팩: 1화는 누구나 무료 샘플, 나머지는 PLUS(지금은 카카오 로그인하면 무료 체험)에서 열림
var packOpen=function(){ return !!(ME.login&&ME.plus); };
if(typeof renderPackList==='function'){
var _rpl=renderPackList; renderPackList=function(){ _rpl(); var v=document.getElementById('packView'); if(!v) return;
var nm=packName(); v.querySelectorAll('.pkep span').forEach(function(x){ if(x.innerHTML.indexOf('@')>=0) x.innerHTML=x.innerHTML.split('@').join(nm); }); // 제목 속 @ 를 아이 이름으로
var n=PACKS[curPack].stories.length, s=v.querySelector('.pkbuy span'), bb=v.querySelector('.pkbuy .btn');
if(packOpen()){ v.querySelectorAll('.pkep-lock').forEach(function(b,i){ b.classList.remove('pkep-lock'); b.setAttribute('onclick','packEpisode('+(i+1)+')'); b.innerHTML=b.innerHTML.replace('🔒 ','').replace('잠김','읽기 →'); });
if(s) s.textContent='PLUS 회원은 전체 '+n+'편을 모두 읽을 수 있어요'; if(bb) bb.remove(); }
else { if(s) s.textContent='1화 무료 샘플 · 전체 '+n+'편은 PLUS'; if(bb){ bb.textContent=ME.login?'PLUS 보기':'로그인하고 전 편 보기'; bb.setAttribute('onclick','event.stopPropagation();closePack();'+(ME.login?"go('#price')":'kakaoLogin()')); } } };
packLocked=function(){ var p=PACKS[curPack]; document.getElementById('packView').innerHTML='<button class="pkback" onclick="renderPackList()">← 목록으로</button><div class="pklock"><div class="pklockem">🔒</div><h3>2화부터는 PLUS에서 읽을 수 있어요</h3><p>1화는 무료 샘플이에요. 지금은 카카오 로그인만 하면 PLUS를 무료로 체험하며 '+p.t+' 전체 '+p.stories.length+'편을 읽을 수 있어요.</p><button class="btn btn-brand" onclick="closePack();'+(ME.login?"go('#price')":'kakaoLogin()')+'">'+(ME.login?'PLUS 알아보기':'카카오 로그인하고 전 편 읽기')+'</button></div>'; };
var _pe2=packEpisode; packEpisode=function(i){ _pe2(i); var m=document.querySelector('#packView .pkmore'); if(!m) return; var n=PACKS[curPack].stories.length;
m.innerHTML=i+1>=n?'<span>마지막 이야기예요 🌙</span><button class="btn btn-ghost" onclick="renderPackList()">목록으로</button>':(packOpen()?'<span>다음 이야기도 읽어볼까요?</span><button class="btn btn-brand" onclick="packEpisode('+(i+1)+')">'+(i+2)+'화 읽기 →</button>':'<span>다음 이야기가 궁금하다면?</span><button class="btn btn-brand" onclick="packLocked()">2화부터 이어 읽기</button>'); };
var fixGrid=function(){ document.querySelectorAll('.pprice').forEach(function(e){ if(e.dataset.fx) return; e.dataset.fx=1; e.textContent='1화 무료'; });
document.querySelectorAll('.pmeta+.btn,.pmeta~.btn').forEach(function(b){ b.removeAttribute('onclick'); b.textContent='1화 무료로 읽기'; }); };
fixGrid(); if(typeof renderPackGrid==='function'){ var _rpg=renderPackGrid; renderPackGrid=function(){ _rpg(); fixGrid(); }; }
document.querySelectorAll('.year-note').forEach(function(e){ if(/2,900/.test(e.textContent)) e.innerHTML='테마 동화팩은 <b>1화 무료 샘플</b>로 먼저 읽어보고, 전 편은 PLUS에서 볼 수 있어요.'; });
}
// PLUS 첫 달 2,900원 (이후 월 6,900원) 표시. 결제(나이스페이) 붙일 때 pay.js 금액도 같은 기준
(function(){ var pp=document.getElementById('plusPrice'); if(!pp) return;
var m=function(){ pp.innerHTML='<span style="display:block;font-size:13px;font-weight:700;color:var(--gold,#FFC862);letter-spacing:0">첫 달 특가</span>₩2,900<small> / 첫 달</small><span style="display:block;font-size:13px;font-weight:500;color:var(--ink-soft,#DAD3F2);margin-top:4px">둘째 달부터 월 ₩6,900 · 언제든 해지</span>'; };
m(); if(typeof setBill==='function'){ var _sb=setBill; setBill=function(x){ _sb(x); if(x!=='y') m(); }; } })();
// 결제 전에 무료로 먼저 해보기: 첫 화면 바로 아래에 무료 샘플 모음 (이름 동화·샘플 동화 3편·동화팩 1화·자연 음성)
(function(){ var how=document.getElementById('how'); if(!how||document.getElementById('samples')) return;
var lib=function(t){ if(typeof LIB==='undefined') return -1; for(var i=0;i<LIB.length;i++) if(LIB[i].t===t) return i; return -1; };
window.smpFolk=function(t){ var i=lib(t); if(i>=0) openFolk(i); }; // 새 동화가 앞에 끼어들어도 제목으로 찾기
var folk=['흥부와 놀부','토끼와 거북이','해님 달님'].map(function(t){ var i=lib(t); return i<0?'':'<button type="button" class="smp-chip" onclick="smpFolk(\''+t+'\')">'+LIB[i].e+' '+t+'</button>'; }).join('');
var pk=['양치','이빨요정'].filter(function(k){ return typeof PACKS!=='undefined'&&PACKS[k]; }).map(function(k){ return '<button type="button" class="smp-chip" onclick="openPack(\''+k+'\');packEpisode(0)">'+PACKS[k].e+' '+PACKS[k].t+' 1화</button>'; }).join('');
how.insertAdjacentHTML('beforebegin','<section class="sec" id="samples"><div class="wrap"><div class="sec-head"><h2>결제 전에, 무료로 먼저 해보세요</h2><p>가입·카드 없이 바로 써볼 수 있어요. 마음에 들면 PLUS <b>첫 달 2,900원</b>.</p></div><div class="smp-grid">'
+'<div class="smp-card"><div class="smp-ic">✨</div><b>우리 아이 이름 동화 만들기</b><p>이름만 넣으면 아이가 주인공인 동화가 바로 나와요.</p><div class="smp-form"><input id="smpName" maxlength="8" placeholder="아이 이름 (예: 지우)" aria-label="아이 이름"><button type="button" class="btn btn-brand" onclick="smpMake()">만들기</button></div></div>'
+'<div class="smp-card"><div class="smp-ic">📚</div><b>무료 샘플 동화 읽기</b><p>자연 음성으로 읽어주기까지 그대로 들어보세요.</p><div class="smp-chips">'+folk+'</div></div>'
+'<div class="smp-card"><div class="smp-ic">🎁</div><b>테마 동화팩 1화 무료</b><p>양치·첫 이 빠진 날 같은 순간에 꼭 맞는 이야기예요.</p><div class="smp-chips">'+pk+'</div></div>'
+'</div></div></section>');
var st=document.createElement('style'); st.textContent='#samples{padding-top:36px}.smp-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}.smp-card{min-width:0;background:var(--surface,#241D45);border:1px solid var(--line,#352C5E);border-radius:18px;padding:18px;display:flex;flex-direction:column;gap:6px}.smp-card b{font-size:17px}.smp-card p{color:var(--ink-soft,#DAD3F2);font-size:14.5px;line-height:1.6;margin:0 0 6px}.smp-ic{font-size:28px}.smp-form{display:flex;gap:8px;margin-top:auto}.smp-form input{flex:1;min-width:0;border:1.5px solid var(--line-strong,#483C7C);background:var(--sunk,#1E1740);color:var(--ink,#F8F5FF);border-radius:12px;padding:11px 12px;font:inherit;font-size:16px}.smp-form .btn{white-space:nowrap}.smp-chips{display:flex;flex-wrap:wrap;gap:8px;margin-top:auto}.smp-chip{border:1.5px solid var(--line-strong,#483C7C);background:var(--surface-2,#2F2659);color:var(--ink,#F8F5FF);border-radius:999px;padding:9px 14px;font:inherit;font-size:14.5px;font-weight:600;cursor:pointer;min-height:40px}.smp-chip:hover{border-color:var(--brand,#AE94FF)}@media(max-width:900px){.smp-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.smp-card:first-child{grid-column:1/-1}}@media(max-width:600px){.smp-grid{grid-template-columns:minmax(0,1fr)}#samples{padding-top:24px}}';
document.head.appendChild(st);
})();
window.smpMake=function(){ var n=(document.getElementById('smpName').value||'').trim().slice(0,8); if(!n){ toast('아이 이름을 넣어 주세요'); return; } var k=document.getElementById('kidName'); if(k) k.value=n; try{ makeStory(); }catch(e){} go('#try'); toast(n+' 이야기를 만들었어요 🌙'); };
// 홈 화면에 추가 안내: 아이폰·아이패드는 자동 안내가 없어서 한 번만 알려줌, 안드로이드는 설치 창 띄우기. ✕ 누르면 다시 안 뜸
(function(){
var get=function(){ try{ return localStorage.getItem('bamtol_a2hs'); }catch(e){ return '1'; } }, set=function(){ try{ localStorage.setItem('bamtol_a2hs','1'); }catch(e){} };
if(get()||(window.matchMedia&&matchMedia('(display-mode: standalone)').matches)||navigator.standalone) return;
var ios=/iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1), dp=null;
var show=function(msg,btn){ if(document.getElementById('a2hs')) return; document.body.insertAdjacentHTML('beforeend','<div id="a2hs" role="dialog" aria-label="홈 화면에 추가" style="position:fixed;left:12px;right:12px;bottom:calc(96px + env(safe-area-inset-bottom,0px));z-index:9998;max-width:440px;margin:0 auto;background:var(--surface,#241D45);color:var(--ink,#F8F5FF);border:1px solid var(--line-strong,#483C7C);border-radius:16px;padding:14px 44px 14px 16px;box-shadow:0 12px 30px rgba(0,0,0,.35);font-size:14.5px;line-height:1.6"><b>🌙 매일 밤 한 번에 열려요</b><br>'+msg+(btn?'<br><button type="button" id="a2hsGo" class="btn btn-brand" style="margin-top:8px;padding:8px 14px">홈 화면에 추가</button>':'')+'<button type="button" id="a2hsX" aria-label="닫기" style="position:absolute;right:8px;top:8px;width:34px;height:34px;border:0;background:none;color:inherit;font-size:18px;cursor:pointer">✕</button></div>');
document.getElementById('a2hsX').onclick=function(){ set(); document.getElementById('a2hs').remove(); };
var g=document.getElementById('a2hsGo'); if(g) g.onclick=function(){ set(); document.getElementById('a2hs').remove(); if(dp){ dp.prompt(); dp=null; } }; };
window.addEventListener('beforeinstallprompt',function(e){ e.preventDefault(); dp=e; setTimeout(function(){ show('밤톨을 홈 화면에 앱처럼 추가해 두세요.',true); },25000); });
if(ios&&/Safari/.test(navigator.userAgent)&&!/CriOS|FxiOS|KAKAOTALK|NAVER|Instagram/.test(navigator.userAgent)) setTimeout(function(){ show('아래 <b>공유 버튼(□↑)</b> → <b>\'홈 화면에 추가\'</b>를 누르면 앱처럼 바로 열 수 있어요.'); },25000);
})();
// 새 동화(new-stories.json, 주 3편 추가)를 동화 목록 맨 앞에 넣기
fetch('/new-stories.json').then(function(r){ return r.ok?r.json():[]; }).then(function(a){ if(!a.length||typeof LIB==='undefined') return; a.forEach(function(x){ LIB.unshift(x); }); try{ renderFilter(); renderLenFilter(); renderFolk(); }catch(e){} }).catch(function(){});
})();
