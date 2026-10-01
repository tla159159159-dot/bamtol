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
// 조각별로 이어서 재생. 실패하면 남은 부분은 브라우저 음성으로.
async function googleSpeak(text,btn,key,voiceOverride){
  var parts=splitTts(text), v=voiceOverride||gVoice();
  if(!parts.length) return;
  var i=0; var a=new Audio(); curAudio=a; curBtn=btn;
  if(btn.textContent!==undefined) btn.textContent='⏳ 음성 만드는 중…';
  var fail=function(){ if(curAudio!==a) return; curAudio=null; browserSpeak(parts.slice(i).join(' '),btn); };
  var play=function(){
    a.src=ttsUrl(parts[i],v);
    if(parts[i+1]) fetch(ttsUrl(parts[i+1],v)).catch(function(){});
    a.play().then(function(){ if(curAudio===a && btn.textContent!==undefined) btn.textContent='⏸ 멈추기'; }).catch(fail);
  };
  a.onended=function(){ if(curAudio!==a) return; i++; if(i<parts.length) play(); else { curAudio=null; resetBtn(); curBtn=null; } };
  a.onerror=fail;
  play();
}
(function(){ var st=document.createElement('style'); st.textContent='.keytoggle{display:none!important}'; document.head.appendChild(st); try{ refreshVoiceState(); }catch(e){} })();
