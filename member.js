// 밤톨 회원 기능: 카카오 로그인, 아이 정보 저장, 엄마·아빠 인사말 녹음 (서버: /api/me)
var ME={login:false};
var KAKAO_SVG='<svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><path fill="#191919" d="M12 3C6.5 3 2 6.6 2 11c0 2.8 1.9 5.3 4.7 6.7l-1 3.6c-.1.3.3.6.6.4l4.2-2.8c.5.1 1 .1 1.5.1 5.5 0 10-3.6 10-8S17.5 3 12 3z"/></svg>';
var SLOT_INFO={hello:['시작 인사','예) "지우야, 오늘도 엄마가 동화 들려줄게"'],bye:['끝 인사','예) "잘 자, 사랑해. 좋은 꿈 꿔"']};

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
var j=await r.json(); ME.kid=j.kid; ME.rec=j.rec; renderMe(); return j;
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
+'<label class="setlabel">우리 아이</label><div class="mekid"><span id="meKid"></span><button type="button" class="btn btn-ghost" onclick="closeMe();openReg()">수정</button></div>'
+'<div id="meDl"></div>'
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
document.getElementById('meTitle').textContent='🌙 '+(ME.nick||'회원')+'님의 밤톨';
var k=ME.kid; document.getElementById('meKid').textContent=k?(k.name+' · '+k.age+' · '+k.time):'아직 등록 전이에요';
// 매일 밤 카톡으로 받기
var dl=document.getElementById('meDl');
dl.innerHTML='<div class="recrow"><div class="rectxt"><b>🌙 매일 밤 카톡으로 받기'+(ME.dl?' ✅':'')+'</b><small>'+(k?k.time+'에 오늘의 동화를 카톡으로 보내드려요':'아이를 먼저 등록해 주세요')+'</small></div><div class="recbtns"><button type="button" class="btn '+(ME.dl?'btn-ghost':'btn-brand')+'" data-act="dl">'+(ME.dl?'끄기':'켜기')+'</button>'+(ME.dl?'<button type="button" class="btn btn-ghost" data-act="test">지금 받아보기</button>':'')+'</div></div>';
dl.querySelector('[data-act=dl]').onclick=function(){ dlSet(!ME.dl); };
var tb=dl.querySelector('[data-act=test]'); if(tb) tb.onclick=dlTest;
dl.insertAdjacentHTML('beforeend','<div class="recrow"><div class="rectxt"><b>📖 이번 달 동화책</b><small>이번 달 동화를 책으로 묶어 PDF로 저장해요</small></div><div class="recbtns"><button type="button" class="btn btn-ghost" onclick="makeBook()">PDF 저장</button></div></div>');
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
var k=ME.kid; if(!k||!k.name){ toast('아이를 먼저 등록해 주세요'); return; }
if(typeof STORIES==='undefined'){ toast('잠시 후 다시 해주세요'); return; }
window.BOOK={S:STORIES, kid:k, icon:(typeof themeIcon!=='undefined'?themeIcon:{}), jong:bamJong(k.name)};
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
+'.mekid{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 12px;border:1.5px solid var(--line-strong,#483C7C);border-radius:12px;background:var(--sunk,#241D45)}.mekid .btn{padding:7px 12px;font-size:13px;white-space:nowrap;flex:none}'
+'.recrow{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:8px;padding:10px 12px;margin-top:8px;border:1.5px solid var(--line-strong,#483C7C);border-radius:12px;background:var(--sunk,#241D45)}'
+'.rectxt{display:flex;flex-direction:column;gap:2px;min-width:0}.rectxt small{color:var(--ink-faint,#ABA2CE);font-size:12px}.recbtns{display:flex;flex-wrap:wrap;gap:6px}.recbtns .btn{padding:7px 11px;font-size:13px}.recfile{cursor:pointer}'
+'@media (max-width:560px){.kakaobtn .kl{display:none}.kakaobtn{padding:9px 10px}.nav-right .btn{padding-left:12px;padding-right:12px}}';
document.head.appendChild(st);
// 목소리 고르기 줄 아래에 인사말 녹음 줄 추가
document.querySelectorAll('[data-voicebtn]').forEach(function(v){ var row=v.closest('.voicerow'); if(row) row.insertAdjacentHTML('afterend','<div class="voicerow"><span>👩 엄마·아빠 목소리 인사말</span><button type="button" class="thm vbtn" data-greetbtn onclick="openMe()">녹음하기</button></div>'); });
// 아이 등록하면 로그인 상태일 때 서버에도 저장
if(typeof submitReg==='function'){ var _sr=submitReg; submitReg=function(){ _sr(); if(ME.login){ try{ var k=JSON.parse(localStorage.getItem('bamtol_kid')||'null'); if(k) meSave({kid:k}).then(function(){ if(dlAfterReg){ dlAfterReg=false; dlSet(true); } }).catch(function(){}); }catch(e){} } }; }
var p=new URLSearchParams(location.search).get('login');
var sp=new URLSearchParams(location.search), dlOn=sp.get('dl'), tonight=sp.get('tonight');
if(p||tonight){ history.replaceState(null,'',location.pathname+location.hash); }
if(p){ setTimeout(function(){ toast(p!=='ok'?'로그인하지 못했어요. 다시 시도해 주세요':dlOn?'매일 밤 카톡으로 보내드릴게요 🌙':'카카오 로그인 완료! 🌙'); },600); }
renderMe();
meLoad().then(function(){ // 카톡 링크로 들어오면 오늘 밤 동화 바로 열기
if(!tonight||typeof STORIES==='undefined'||!STORIES[tonight]) return;
theme=tonight; document.querySelectorAll('.thm[data-thm]').forEach(function(x){ x.setAttribute('aria-pressed', x.dataset.thm===tonight?'true':'false'); });
makeStory(); go('#try');
});
// 새 동화(new-stories.json, 주 3편 추가)를 동화 목록 맨 앞에 넣기
fetch('/new-stories.json').then(function(r){ return r.ok?r.json():[]; }).then(function(a){ if(!a.length||typeof LIB==='undefined') return; a.forEach(function(x){ LIB.unshift(x); }); try{ renderFilter(); renderLenFilter(); renderFolk(); }catch(e){} }).catch(function(){});
})();
