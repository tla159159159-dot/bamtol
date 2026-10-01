// 밤톨 자연 음성 패치: 키 없이 서버(/api/tts)에서 구글 음성을 받아 재생. index.html 맨 끝에서 불러옴.
function gKey(){ return 'server'; }
// 긴 글을 500자 이하 문장 묶음으로 자름 (구글 1회 입력 한도 + URL 길이 + 캐시 재사용)
function splitTts(text,max){
max=max||500; var out=[]; var cur='';
var sents=String(text).match(/[^.!?…\n]+[.!?…\n]*|[.!?…\n]+/g)||[];
for(var k=0;k<sents.length;k++){
var s=sents[k];
if(cur.length+s.length>max && cur.trim()){ out.push(cur.trim()); cur=''; }
while(s.length>max){ out.push(s.slice(0,max)); s=s.slice(max); }
cur+=s;
}
if(cur.trim()) out.push(cur.trim());
return out;
}
function ttsUrl(t,v){ return '/api/tts?v='+encodeURIComponent(v)+'&r='+gRate().toFixed(2)+'&t='+encodeURIComponent(t); }
// 조각별로 이어서 재생. 실패하면 로봇 음성 대신 안내만.
async function googleSpeak(text,btn,key,voiceOverride){
var v=voiceOverride||gVoice(), urls=splitTts(text).map(function(p){ return ttsUrl(p,v); });
if(!urls.length) return;
if(!voiceOverride){ bgmAuto(); if(window.meGreet) urls=meGreet(urls); } // 회원이면 엄마·아빠 인사말을 앞뒤에
var i=0; var a=new Audio(); curAudio=a; curBtn=btn;
if(btn.textContent!==undefined) btn.textContent='⏳ 음성 만드는 중…';
var next=function(){ if(curAudio!==a) return; i++; if(i<urls.length) play(); else { curAudio=null; resetBtn(); curBtn=null; } };
var fail=function(){ if(curAudio!==a) return; if(/\/api\/me/.test(urls[i])) return next(); curAudio=null; browserSpeak('',btn); }; // 인사말이 안 나오면 건너뜀
var play=function(){
a.src=urls[i];
if(urls[i+1]) fetch(urls[i+1]).catch(function(){});
a.play().then(function(){ if(curAudio===a && btn.textContent!==undefined) btn.textContent='⏸ 멈추기'; }).catch(fail);
};
a.onended=next;
a.onerror=fail;
play();
}
// 기계(로봇) 음성은 쓰지 않음
function browserSpeak(text,btn){ resetBtn(); curBtn=null; toast('음성을 잠깐 못 불러왔어요. 잠시 후 다시 눌러주세요'); }

// ── 잠자리 배경음: 외부 파일 없이 브라우저에서 직접 연주 (공공 저작물 선율·자연음) ──
var BGM_TRACKS=[['lullaby','오르골 자장가'],['star','반짝반짝 작은 별'],['piano','잔잔한 피아노'],['rain','토닥토닥 빗소리'],['wave','잔잔한 파도']];
var BGM_SONGS={
// 브람스 자장가 [음높이(MIDI), 박자]
lullaby:{bpm:84,n:[[64,.5],[64,.5],[67,2],[64,.5],[64,.5],[67,2],[64,.5],[67,.5],[72,1],[71,1.5],[69,.5],[69,1],[67,2],[62,.5],[64,.5],[65,1],[62,1],[62,.5],[64,.5],[65,2],[62,.5],[65,.5],[71,.5],[69,.5],[67,1],[71,1],[72,2],[60,.5],[60,.5],[72,2],[69,.5],[65,.5],[67,2],[64,.5],[60,.5],[65,1],[67,1],[69,1],[67,2],[60,.5],[60,.5],[72,2],[69,.5],[65,.5],[67,2],[64,.5],[60,.5],[65,1],[64,1],[62,1],[60,3],[0,2]]},
// 반짝반짝 작은 별
star:{bpm:70,n:[[60,1],[60,1],[67,1],[67,1],[69,1],[69,1],[67,2],[65,1],[65,1],[64,1],[64,1],[62,1],[62,1],[60,2],[67,1],[67,1],[65,1],[65,1],[64,1],[64,1],[62,2],[67,1],[67,1],[65,1],[65,1],[64,1],[64,1],[62,2],[60,1],[60,1],[67,1],[67,1],[69,1],[69,1],[67,2],[65,1],[65,1],[64,1],[64,1],[62,1],[62,1],[60,2],[0,2]]}
};
var PIANO_CH=[[48,55,60,64,67,64,60,55],[45,52,57,60,64,60,57,52],[41,48,53,57,60,57,53,48],[43,50,55,59,62,59,55,50]];
function mhz(m){ return 440*Math.pow(2,(m-69)/12); }
// c: AudioContext, out: 출력. sched(until)로 until초까지 음을 예약, stop()으로 정리
function bgmBuild(c,out,id){
var srcs=[], nextT=c.currentTime+0.3, idx=0, rnd=0.5;
var bus=c.createGain(); bus.connect(out);
var dl=c.createDelay(); dl.delayTime.value=0.36; var fb=c.createGain(); fb.gain.value=0.38; var wet=c.createGain(); wet.gain.value=0.35;
dl.connect(fb); fb.connect(dl); dl.connect(wet); wet.connect(out); bus.connect(dl);
function tone(type,f,t,peak,dec){
var o=c.createOscillator(), g=c.createGain(); o.type=type; o.frequency.value=f;
g.gain.setValueAtTime(0.0001,t); g.gain.exponentialRampToValueAtTime(peak,t+0.012); g.gain.exponentialRampToValueAtTime(0.0001,t+dec);
o.connect(g); g.connect(bus); o.start(t); o.stop(t+dec+0.05);
}
function musicBox(m,t){ var f=mhz(m+12); tone('sine',f,t,0.16,2.4); tone('sine',f*2,t,0.035,1.0); tone('sine',f*3,t,0.012,0.5); }
function noise(){ var n=c.sampleRate*3, b=c.createBuffer(1,n,c.sampleRate), d=b.getChannelData(0); for(var k=0;k<n;k++) d[k]=Math.random()*2-1; var s=c.createBufferSource(); s.buffer=b; s.loop=true; s.start(); srcs.push(s); return s; }
function filt(type,f){ var x=c.createBiquadFilter(); x.type=type; x.frequency.value=f; return x; }
if(id==='rain'){
var hp=filt('highpass',500), lp=filt('lowpass',3800), g=c.createGain(); g.gain.value=0.17; noise().connect(hp); hp.connect(lp); lp.connect(g); g.connect(out);
var lp2=filt('lowpass',280), g2=c.createGain(); g2.gain.value=0.35; noise().connect(lp2); lp2.connect(g2); g2.connect(out);
}
if(id==='wave'){
var lpw=filt('lowpass',650), gw=c.createGain(); gw.gain.value=0.22; noise().connect(lpw); lpw.connect(gw); gw.connect(out);
var lfo=c.createOscillator(); lfo.frequency.value=0.085; var la=c.createGain(); la.gain.value=0.18; var lf=c.createGain(); lf.gain.value=350;
lfo.connect(la); la.connect(gw.gain); lfo.connect(lf); lf.connect(lpw.frequency); lfo.start(); srcs.push(lfo);
}
function sched(until){
while(nextT<until){
if(id==='lullaby'||id==='star'){
var s=BGM_SONGS[id], spb=60/s.bpm, nt=s.n[idx];
if(nt[0]) musicBox(nt[0],nextT);
nextT+=nt[1]*spb; idx=(idx+1)%s.n.length;
} else if(id==='piano'){
var ch=PIANO_CH[Math.floor(idx/8)%4], m=ch[idx%8];
tone('triangle',mhz(m),nextT,0.09,2.6);
if(idx%4===0){ rnd=(rnd*9301+49297)%233280; if(rnd/233280<0.5) tone('sine',mhz(ch[2+(idx/4)%3]+12),nextT,0.06,3); }
nextT+=0.43; idx=(idx+1)%32;
} else if(id==='rain'){
tone('sine',1400+Math.random()*2400,nextT,0.02,0.05);
nextT+=0.06+Math.random()*0.3;
} else { nextT=until; }
}
}
return {sched:sched, stop:function(){ srcs.forEach(function(s){ try{s.stop();}catch(e){} }); }};
}
function bgmTrack(){ try{ return localStorage.getItem('bamtol_bgm')||'lullaby'; }catch(e){ return 'lullaby'; } }
function bgmPref(on){ try{ if(on===undefined) return localStorage.getItem('bamtol_bgm_on')!=='0'; localStorage.setItem('bamtol_bgm_on',on?'1':'0'); }catch(e){ return true; } }
function startBgm(){
try{
actx=actx||new (window.AudioContext||window.webkitAudioContext)();
if(actx.state==='suspended') actx.resume();
var master=actx.createGain(); master.gain.setValueAtTime(0,actx.currentTime); master.gain.linearRampToValueAtTime(0.55,actx.currentTime+2.5); master.connect(actx.destination);
var e=bgmBuild(actx,master,bgmTrack()); e.sched(actx.currentTime+1.5);
bgm={master:master,eng:e,timer:setInterval(function(){ e.sched(actx.currentTime+1.5); },300)};
}catch(err){ bgm=null; toast('이 브라우저에선 배경음이 안 돼요'); }
syncBgmUi();
}
function stopBgm(){
if(!bgm) return; var b=bgm; bgm=null;
try{ b.master.gain.cancelScheduledValues(actx.currentTime); b.master.gain.setValueAtTime(b.master.gain.value,actx.currentTime); b.master.gain.linearRampToValueAtTime(0,actx.currentTime+1.2); }catch(e){}
setTimeout(function(){ clearInterval(b.timer); b.eng.stop(); try{ b.master.disconnect(); }catch(e){} },1300);
syncBgmUi();
}
function toggleBgm(){ if(bgm){ stopBgm(); bgmPref(false); } else { bgmPref(true); startBgm(); } }
function bgmAuto(){ if(!bgm && bgmPref()) startBgm(); }
function pickBgm(id){ try{ localStorage.setItem('bamtol_bgm',id); }catch(e){} if(bgm) stopBgm(); bgmPref(true); startBgm(); }
function syncBgmUi(){
document.querySelectorAll('[data-bgmbtn]').forEach(function(b){ b.textContent=bgm?'🎵 배경음 끄기':'🎵 배경음 켜기'; b.setAttribute('aria-pressed',bgm?'true':'false'); });
document.querySelectorAll('[data-bgmsel]').forEach(function(s){ s.value=bgmTrack(); });
}
function bgmSelHtml(){
return '<select data-bgmsel class="bgmsel" aria-label="배경음 고르기" onchange="pickBgm(this.value)">'+BGM_TRACKS.map(function(t){ return '<option value="'+t[0]+'">'+t[1]+'</option>'; }).join('')+'</select>';
}
// 목소리 바꾸기 버튼: 읽어주기 바로 아래에 현재 목소리를 보여주고 누르면 설정창
function voiceName(){ var v=gVoice(); for(var k=0;k<VOICES.length;k++) if(VOICES[k].id===v) return VOICES[k].g+' · '+VOICES[k].t; return '여성 · 따뜻·나긋'; }
function syncVoiceUi(){ document.querySelectorAll('[data-voicebtn]').forEach(function(b){ b.textContent=voiceName()+'  ▸ 바꾸기'; }); }
function selectVoice(id){ try{ localStorage.setItem('bamtol_voice',id); }catch(e){} renderVoiceList(); syncVoiceUi(); toast('이 목소리로 정했어요 🎙'); }
function voiceRowHtml(){ return '<div class="voicerow"><span>🎙 읽어주는 목소리</span><button type="button" class="thm vbtn" data-voicebtn onclick="openSettings()"></button></div>'; }
(function(){
var st=document.createElement('style');
st.textContent='.vbtn{border-color:var(--brand,#AE94FF)!important;color:var(--brand,#AE94FF)!important;font-weight:700}#ftModal .keyrow{display:none!important}.keytoggle{display:none!important}.bgmsel{padding:7px 10px;border-radius:10px;border:1.5px solid var(--line-strong,#483C7C);background:var(--sunk,#241D45);color:var(--ink,#F8F5FF);font:inherit;font-size:13px;max-width:100%}.voicerow{flex-wrap:wrap;gap:8px}';
document.head.appendChild(st);
var hb=document.getElementById('bgmBtn');
if(hb){ hb.setAttribute('data-bgmbtn',''); hb.insertAdjacentHTML('afterend',bgmSelHtml()); var hr=hb.closest('.voicerow'); if(hr) hr.insertAdjacentHTML('beforebegin',voiceRowHtml()); }
var kr=document.querySelector('#ftModal .keyrow');
if(kr) kr.insertAdjacentHTML('beforebegin',voiceRowHtml()+'<div class="voicerow"><span>🎵 잠자리 배경음</span><button type="button" class="thm" data-bgmbtn onclick="toggleBgm()">🎵 배경음 켜기</button>'+bgmSelHtml()+'</div>');
// 설정창: 키 입력칸 없애고, 속도는 바꾸면 바로 저장
var key=document.getElementById('gttsKey');
if(key){ var row=key.closest('.keyinput'); if(row){ var lab=row.previousElementSibling; if(lab&&lab.classList.contains('setlabel')) lab.style.display='none'; row.style.display='none'; } }
document.querySelectorAll('#setModal .setbtns button').forEach(function(b){ if(/키/.test(b.textContent)) b.style.display='none'; });
var desc=document.querySelector('#setModal .setdesc'); if(desc) desc.innerHTML='맞춤동화·전래동화 모두 <b>사람 같은 자연 음성</b>으로 읽어줘요. 마음에 드는 목소리와 속도를 골라보세요.';
var rs=document.getElementById('rateSel'); if(rs) rs.addEventListener('change',function(){ try{ localStorage.setItem('bamtol_rate',rs.value); }catch(e){} });
syncBgmUi(); syncVoiceUi();
try{ refreshVoiceState(); }catch(e){}
})();
// 회원 기능(카카오 로그인·인사말 녹음)
(function(){ var s=document.createElement('script'); s.src='/member.js'; document.body.appendChild(s); })();
