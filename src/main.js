import * as THREE from 'three';
import Peer from 'peerjs';
import QRCode from 'qrcode';
import './style.css';
import { wheelAngle, wheelInput } from './steering.js';
import { startParking } from './parking.js';
const app=document.querySelector('#app');
const params=new URLSearchParams(location.search);
const clamp=THREE.MathUtils.clamp;
let peer,connection;
const peerOptions={debug:0};
const el=id=>document.getElementById(id);
function escapeText(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
if(params.has('controller')) controller(); else game();
function controller(){
 document.title='RIDGE PARK / 핸들';
 app.innerHTML=`<main class="phone"><div class="phone-head"><div class="brand">RIDGE PARK <small>YOUR PHONE. YOUR WHEEL.</small></div><span class="phone-status" id="phoneStatus">PC에 연결하는 중…</span></div><div class="wheel-area"><div class="wheel" id="wheel"><span></span></div><div class="phone-info"><b>휴대폰이 핸들이 됩니다.</b><br>가로로 잡고 좌우로 돌리세요.<br><button class="primary" id="sensor">센서 허용 · 시작</button><span id="sensorInfo">버튼을 눌러 기울기 조향을 켜세요.</span><div id="steerReadout" aria-live="off">중앙 · 0%</div></div></div><div class="phone-tools"><button class="secondary" id="calibrate">중앙 보정</button><label>민감도 <input id="sensitivity" type="range" min="0.6" max="2.4" step="0.1" value="1.2"></label><span class="fallback"><button id="left" aria-label="왼쪽 조향">‹</button><button id="right" aria-label="오른쪽 조향">›</button></span><button class="secondary gear-button" id="gear">D · 전진</button><button class="secondary" id="reset">다시 시도</button><button class="secondary hidden" id="next">다음 라운드 →</button></div><div class="pedals"><button class="pedal brake" id="brake">BRAKE</button><button class="pedal gas" id="gas">GAS ↗</button></div><p class="rotate-note">가로로 잡으면 더 편해요 · 센서를 쓸 수 없다면 ‹ › 버튼으로 조향하세요</p></main>`;
 let state={steer:0,gas:false,brake:false,gear:'D'},raw=0,neutral=0,sensor=false,manual=0,received=false,needsCenter=true;
 const send=()=>{if(connection?.open)connection.send({...state,steer:manual||state.steer,t:Date.now()});};
 const release=()=>{state.gas=false;state.brake=false;manual=0;el('gas').classList.remove('active');el('brake').classList.remove('active');send();};
 function bind(id,down,up){const b=el(id);b.addEventListener('pointerdown',e=>{e.preventDefault();b.setPointerCapture(e.pointerId);down();b.classList.add('active');send();});for(const event of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(event,()=>{up();b.classList.remove('active');send();});b.addEventListener('contextmenu',e=>e.preventDefault());}
 bind('gas',()=>state.gas=true,()=>state.gas=false);bind('brake',()=>state.brake=true,()=>state.brake=false);bind('left',()=>manual=-1,()=>manual=0);bind('right',()=>manual=1,()=>manual=0);
 el('calibrate').onclick=()=>{neutral=raw;state.steer=0;needsCenter=!received;el('wheel').style.transform='rotate(0deg)';el('steerReadout').textContent='중앙 · 0%';send();el('sensorInfo').textContent=received?'현재 자세를 중앙으로 설정했습니다.':'휴대폰을 세워 잡으면 중앙을 보정합니다.';};
 el('reset').onclick=()=>connection?.open&&connection.send({reset:true});
 el('gear').onclick=()=>{release();state.gear=state.gear==='D'?'R':'D';el('gear').textContent=state.gear==='D'?'D · 전진':'R · 후진';send();};
 el('next').onclick=()=>connection?.open&&connection.send({next:true});
 window.addEventListener('deviceorientation',e=>{
  if(!sensor)return;
  const angle=wheelAngle(e.beta,e.gamma);
  if(angle===null){state.steer=0;send();el('wheel').style.transform='rotate(0deg)';el('steerReadout').textContent='중앙 · 0%';el('sensorInfo').textContent='화면을 얼굴 쪽으로 세워 잡으세요. 바닥과 평행하면 조향이 어렵습니다.';return;}
  raw=angle;
  if(needsCenter){neutral=raw;needsCenter=false;}
  received=true;
  const target=wheelInput(raw,neutral,Number(el('sensitivity').value));
  state.steer=target;
  if(Math.abs(state.steer)<.004)state.steer=0;
  el('wheel').style.transform=`rotate(${state.steer*65}deg)`;
  const percent=Math.round(Math.abs(state.steer)*100);
  el('steerReadout').textContent=(percent<1?'중앙':state.steer<0?'← 왼쪽':'오른쪽 →')+' · '+percent+'%';
  el('sensorInfo').textContent='기울기 조향 켜짐 · 약 30° 돌리면 최대 조향';
  send();
 });
 const recenter=()=>{needsCenter=true;state.steer=0;send();};
 screen.orientation?.addEventListener?.('change',recenter);
 window.addEventListener('orientationchange',recenter);
 el('sensor').onclick=async()=>{try{if(window.isSecureContext===false)throw new Error('기울기 조향에는 HTTPS가 필요합니다. README의 휴대폰 로컬 연결 절차를 확인하세요.');if(!window.DeviceOrientationEvent)throw new Error('이 기기는 기울기 센서를 지원하지 않습니다.');if(typeof DeviceOrientationEvent.requestPermission==='function'){const p=await DeviceOrientationEvent.requestPermission();if(p!=='granted')throw new Error('센서 권한이 필요합니다. 화살표로도 조작할 수 있어요.');}sensor=true;received=false;needsCenter=true;el('sensor').textContent='센서 활성화됨';el('sensorInfo').textContent='휴대폰을 가로로 잡고 중앙 보정을 누르세요.';setTimeout(()=>{if(!received)el('sensorInfo').textContent='센서 입력이 없습니다. 브라우저 권한을 확인하거나 ‹ › 버튼을 사용하세요.';},3000);try{await navigator.wakeLock?.request('screen');}catch{}}catch(e){el('sensorInfo').textContent=e.message;}};
 const host=params.get('controller');
 function connect(){peer=new Peer(undefined,peerOptions);peer.on('open',()=>{connection=peer.connect(host,{reliable:false,serialization:'json'});connection.on('open',()=>{el('phoneStatus').textContent='● PC 연결됨';send();});connection.on('data',data=>{if(data?.type!=='round-status')return;el('next').classList.toggle('hidden',!data.complete);el('next').textContent=data.final?'처음부터 →':'다음 라운드 →';el('phoneStatus').textContent=data.complete?'✓ 주차 성공!':`● ROUND ${data.round} · PC 연결됨`;if(data.gear&&data.gear!==state.gear){state.gear=data.gear;el('gear').textContent=state.gear==='D'?'D · 전진':'R · 후진';}});connection.on('close',()=>{release();el('phoneStatus').textContent='연결이 끊겼습니다. 새로고침하세요.';});connection.on('error',()=>el('phoneStatus').textContent='연결 실패 · PC에서 QR을 다시 여세요.');});peer.on('error',()=>el('phoneStatus').textContent='연결 실패 · 네트워크 확인 후 새로고침');}
 connect();setInterval(send,16);window.addEventListener('blur',release);document.addEventListener('visibilitychange',()=>{if(document.hidden)release();});window.addEventListener('pagehide',()=>{release();connection?.close();peer?.destroy();});
}
function game(){ startParking({app,Peer,QRCode,peerOptions}); }
