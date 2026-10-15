import * as THREE from 'three';
import { CAR, ROUNDS, LOT, PARKING, corners, overlaps, parkingState, nextCheckpoint } from './parking-rules.js';
import { advanceVehicle, advanceSteering, advanceSpeed, frontWheelAngle } from './vehicle.js';
const el=id=>document.getElementById(id);
const clamp=THREE.MathUtils.clamp;

export function startParking({app,Peer,QRCode,peerOptions}) {
 document.title='RIDGE PARK — One space at a time';
 app.innerHTML=`<canvas id="scene"></canvas>
 <header><div class="brand">RIDGE PARK<small>ONE SPACE AT A TIME</small></div><div class="top-actions"><span class="pill weather">P &nbsp; PINE VALLEY LOT</span><button class="pill" id="phoneBtn"><span class="dot"></span>휴대폰 연결 ↗</button></div></header>
 <section class="mission"><div class="eyebrow" id="roundTag">ROUND 01 / 05</div><h1 id="roundName"></h1><span class="mission-type" id="roundType"></span><p id="roundHint"></p><div class="journey-progress" id="journeyProgress"></div><div class="mission-stats"><span>TIME <b id="timer">00:00</b></span><span>CONTACT <b id="hits">0</b></span></div><div class="round-dots" id="roundDots"></div><div class="scale-info" id="scaleInfo"></div></section>
 <nav class="view-switch" aria-label="카메라 시점"><button data-view="top" class="selected" aria-pressed="true">탑뷰</button><button data-view="chase" aria-pressed="false">3인칭</button><button data-view="driver" aria-pressed="false">1인칭</button><span>C 키로 전환</span></nav>
 <div class="hint hidden" id="hint"></div><aside class="minimap"><div><b>CAR PARK</b><span id="mapDistance"></span></div><canvas id="minimap" width="240" height="252" aria-label="주차장 미니맵"></canvas><p>노랑: 내 차 · 주황: 경유지 · 초록: 주차 자리</p></aside>
 <aside class="parking-guide"><span class="guide-icon">P</span><div><b id="parkingStatus">초록색 주차 공간으로 이동하세요</b><span id="parkingDetail">화살표 방향으로 차를 맞춰 주세요</span></div><div class="hold-track"><i id="holdProgress"></i></div></aside>
 <div class="dashboard"><div class="speed-card"><div><span class="speed" id="speed">00</span><span class="unit">KM / H</span></div><div class="speed-side"><button class="gear-select" id="gearBtn" title="정차 후 기어 전환 (Q)">D <small>전진 ↕</small></button><div class="steer-track"><i id="steerDot"></i></div></div></div><div class="controls"><span><span class="key">W / S</span> 전진 / 후진</span><span><span class="key">A D</span> 조향</span><span><span class="key">SPACE</span> 브레이크</span><button class="pill" id="resetBtn">다시 시도 ↺</button></div></div>
 <div class="cockpit hidden" id="cockpit"><span>DRIVER VIEW</span><div class="cockpit-wheel" id="cockpitWheel">⊕</div><span id="driverGear">D</span></div>
 <div class="veil hidden" id="pairModal"><div class="modal"><button class="close" id="closeModal" aria-label="닫기">×</button><div class="eyebrow">PAIR YOUR WHEEL</div><h2>휴대폰을 핸들로.</h2><p>${location.hostname.endsWith('.chatgpt.site')?'QR코드를 스캔하고 같은 ChatGPT 계정으로 로그인하세요.':'PC와 같은 Wi-Fi에 연결한 휴대폰으로 QR코드를 스캔하세요.'}<br>센서를 허용한 뒤 가로로 잡고 중앙을 보정하세요.</p><div class="qr-wrap" id="qr">연결 준비 중…</div><div class="status" id="pairStatus">연결 서버에 접속 중입니다.</div><button class="primary" id="copyLink">연결 링크 복사</button><p style="font-size:11px;margin-bottom:0">D / R 버튼으로 기어 전환 · GAS / BRAKE로 속도 조절<br>외부 PeerJS 서버 사용 · 네트워크에 따라 연결이 제한될 수 있습니다.</p></div></div>
 <div class="veil hidden" id="resultModal" role="dialog" aria-modal="true" aria-labelledby="resultTitle"><div class="modal result-modal"><div class="eyebrow" id="resultTag">NICELY PARKED</div><div class="result-stars" id="stars">★★★</div><h2 id="resultTitle">주차 완료!</h2><p id="resultText"></p><div class="result-stats"><div><span>소요 시간</span><b id="resultTime"></b></div><div><span>접촉 횟수</span><b id="resultHits"></b></div></div><button class="primary" id="nextRound">다음 라운드 →</button><button class="secondary" id="retryRound">다시 도전</button></div></div>`;
 let renderer;
 try {renderer=new THREE.WebGLRenderer({canvas:el('scene'),antialias:true,powerPreference:'high-performance'});}catch{app.innerHTML='<div class="boot-error">3D 화면을 시작할 수 없습니다.<br>WebGL을 지원하는 최신 브라우저에서 다시 열어주세요.</div>';return;}
 renderer.setPixelRatio(Math.min(devicePixelRatio,1.8));renderer.setSize(innerWidth,innerHeight);
 renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
 renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;
 const scene=new THREE.Scene();scene.background=new THREE.Color('#b8cbc3');scene.fog=new THREE.Fog('#b8cbc3',80,200);
 const camera=new THREE.PerspectiveCamera(48,innerWidth/innerHeight,.08,300);
 const topCamera=new THREE.OrthographicCamera(-36,36,36,-36,.1,250);topCamera.position.set(0,90,-.001);topCamera.lookAt(0,0,0);
 scene.add(new THREE.HemisphereLight('#eef5e6','#566e59',2.4));
 const sun=new THREE.DirectionalLight('#ffe6bc',3);sun.position.set(-35,65,-20);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-42,right:42,top:42,bottom:-42});sun.shadow.normalBias=.04;scene.add(sun);
 const material=(color,extra={})=>new THREE.MeshStandardMaterial({color,roughness:.9,flatShading:true,...extra});
 const mats={asphalt:material('#758b81'),line:material('#e4e7d1'),curb:material('#c0c8af'),grass:material('#90a97a'),dark:material('#2b3e37'),glass:material('#63857e',{roughness:.35}),tire:material('#28392f'),hub:material('#c2c6ad'),pole:material('#566b58')};
 function box(w,h,d,mat,x,y,z,parent=scene){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);m.position.set(x,y,z);m.castShadow=h>.2;m.receiveShadow=true;parent.add(m);return m;}
 box(220,.2,220,mats.grass,0,-.25,0);box(LOT.width,.2,LOT.length,mats.asphalt,0,-.1,0);
 const borders=[{x:-LOT.width/2-.25,z:0,width:.5,length:LOT.length+1,yaw:0},{x:LOT.width/2+.25,z:0,width:.5,length:LOT.length+1,yaw:0},{x:0,z:LOT.length/2+.25,width:LOT.width+1,length:.5,yaw:0},{x:0,z:-LOT.length/2-.25,width:LOT.width+1,length:.5,yaw:0}];
 for(const b of borders)box(b.width,.42,b.length,mats.curb,b.x,.12,b.z);
 const lines=new THREE.Group();scene.add(lines);
 function bayLines(slot,color=mats.line,parent=lines){const g=new THREE.Group();g.position.set(slot.x,.025,slot.z);g.rotation.y=slot.yaw;for(const side of [-1,1])box(.1,.02,slot.length,color,side*slot.width/2,0,0,g);box(slot.width,.02,.1,color,0,0,slot.length/2,g);parent.add(g);return g;}

 // Dashes along the center aisle and a restrained green perimeter.
 const laneMarks=new THREE.Group();scene.add(laneMarks);
 const trunkMat=material('#786b50'),leafMat=material('#4d7056');
 for(let i=0;i<32;i++){const side=i%2?-1:1,x=side*(46+(i%3)*2),z=-48+Math.floor(i/2)*6;const t=new THREE.Group();t.position.set(x,0,z);box(.5,3,.5,trunkMat,0,1.5,0,t);for(let j=0;j<2;j++){const crown=new THREE.Mesh(new THREE.ConeGeometry(2.8-j*.7,5,7),leafMat);crown.position.y=4+j*2;crown.castShadow=true;t.add(crown);}scene.add(t);}
 for(const x of [-38,38])for(const z of [-40,40]){box(.16,6,.16,mats.pole,x,3,z);box(1.5,.12,.6,mats.curb,x,6,z);}
 function carModel(color,interactive=false){
   const g=new THREE.Group(),paint=material(color),body=new THREE.Group();g.add(body);
   const w=CAR.width,l=CAR.length,h=CAR.height;
   if(!interactive){
     box(w,.62,l,paint,0,.62,0,body);
     box(w*.89,.46,2.1,mats.glass,0,h-.30,-.2,body);
     box(w*.94,.12,1.9,paint,0,h-.06,-.25,body);
     for(const side of [-1,1])for(const axle of [-1,1])box(.12,.45,.68,mats.tire,side*w/2,.30,axle*CAR.wheelbase/2,body);
     return {group:g,body,wheels:[]};
   }

   box(w,.6,l-.16,paint,0,.62,0,body);
   box(w*.96,.2,1.3,paint,0,.98,1.52,body);
   box(w*.90,.48,2.08,mats.glass,0,h-.30,-.2,body);
   box(w*.94,.12,1.9,paint,0,h-.06,-.25,body);
   for(const z of [-1,1])box(w*.97,.16,.12,mats.dark,0,.50,z*(l/2-.06),body);
   const headlights=material('#f5e7bc',{emissive:'#eee0a2',emissiveIntensity:.35}),taillight=material('#ba6855');
   for(const x of [-w*.34,w*.34]){
     box(.33,.16,.06,headlights,x,.87,l/2-.035,body);
     box(.30,.17,.06,taillight,x,.85,-l/2+.035,body);
     box(.065,.50,.09,paint,x*1.25,h-.31,.75,body);
   }
   const wheels=[];
   for(const front of [false,true])for(const side of [-1,1]){
     const x=side*(front?CAR.frontTrack:CAR.rearTrack)/2,z=(front?1:-1)*CAR.wheelbase/2;
     const pivot=new THREE.Group();pivot.position.set(x,CAR.tireRadius,z);
     const spin=new THREE.Group();pivot.add(spin);
     const tire=new THREE.Mesh(new THREE.CylinderGeometry(CAR.tireRadius,CAR.tireRadius,CAR.tireWidth,16),mats.tire);tire.rotation.z=Math.PI/2;tire.castShadow=true;spin.add(tire);
     const hub=new THREE.Mesh(new THREE.CylinderGeometry(.19,.19,CAR.tireWidth+.006,12),mats.hub);hub.rotation.z=Math.PI/2;spin.add(hub);
     g.add(pivot);wheels.push({pivot,spin,front});
   }
   if(interactive){const marker=new THREE.Mesh(new THREE.ConeGeometry(.15,.45,3),material('#f3edb8'));marker.rotation.x=Math.PI/2;marker.position.set(0,h+.13,.45);marker.name='direction-marker';g.add(marker);}
   return {group:g,body,wheels};
 }
 const player=carModel('#dab16e',true);player.group.name='player-car';scene.add(player.group);
 const obstacleGroup=new THREE.Group();scene.add(obstacleGroup);
 const targetGroup=new THREE.Group();scene.add(targetGroup);
 const targetMat=material('#cde88f',{emissive:'#9ccf63',emissiveIntensity:.5});
 let targetFill;
 let roundIndex=0,round,pose={x:0,z:0,yaw:0},speed=0,steer=0,gear='D',elapsed=0,hits=0,hold=0,complete=false,view='top',lastHit=-10,checkpointIndex=0;
 const scores=[];const keys=new Set();let remote={steer:0,gas:false,brake:false,gear:'D'},lastRemote=0;
 let peer,conn,pairUrl='',paused=false,lastStatus=0;
 function status(){if(conn?.open)conn.send({type:'round-status',round:roundIndex+1,complete,final:roundIndex===ROUNDS.length-1,gear});}
 function setGear(value){if(value===gear)return;gear=value;speed=0;remote.gas=false;el('gearBtn').innerHTML=gear+` <small>${gear==='D'?'전진':'후진'} ↕</small>`;el('driverGear').textContent=gear;status();}
 function clearGroup(g){while(g.children.length){const m=g.children.pop();m.parent=null;m.traverse?.(o=>{if(o.isMesh)o.geometry.dispose();});}}
 function loadRound(index){
   roundIndex=index;round=ROUNDS[index];pose={...round.spawn};speed=0;steer=0;gear='D';elapsed=0;hits=0;hold=0;complete=false;keys.clear();remote={steer:0,gas:false,brake:false,gear:'D'};lastRemote=0;lastHit=-10;checkpointIndex=0;
   clearGroup(obstacleGroup);clearGroup(targetGroup);clearGroup(lines);clearGroup(laneMarks);
   for(const x of [-28,28])for(let z=-36;z<=36;z+=4)box(.1,.02,1.7,mats.line,x,.025,z,laneMarks);
   for(const z of [-24,-8,8,22])for(let x=-24;x<=24;x+=4)box(1.5,.02,.1,mats.line,x,.025,z,laneMarks);
   for(const bay of round.bays)bayLines(bay);
   for(const obstacle of round.obstacles){const parked=carModel(obstacle.color);parked.group.position.set(obstacle.x,0,obstacle.z);parked.group.rotation.y=obstacle.yaw;obstacleGroup.add(parked.group);}
   const slot=round.slot;const target=bayLines(slot,targetMat,targetGroup);
   targetFill=new THREE.Mesh(new THREE.PlaneGeometry(slot.width,slot.length),new THREE.MeshBasicMaterial({color:'#cfec8b',transparent:true,opacity:.18,side:THREE.DoubleSide,depthWrite:false}));targetFill.rotation.x=-Math.PI/2;targetFill.position.y=.004;target.add(targetFill);
   // Chevron marks the required direction of the car's nose.
   const arrow=new THREE.Group();for(const side of [-1,1]){const stroke=box(.1,.025,.8,targetMat,side*.25,.02,1.4,arrow);stroke.rotation.y=-side*Math.PI/4;}target.add(arrow);
   const canvas=document.createElement('canvas');canvas.width=256;canvas.height=256;const c=canvas.getContext('2d');c.fillStyle='#e6f1c5';c.font='bold 150px sans-serif';c.textAlign='center';c.textBaseline='middle';c.fillText('P',128,128);const texture=new THREE.CanvasTexture(canvas);const p=new THREE.Mesh(new THREE.PlaneGeometry(1.25,1.25),new THREE.MeshBasicMaterial({map:texture,transparent:true,depthWrite:false}));p.rotation.x=-Math.PI/2;p.rotation.z=Math.PI;p.position.set(0,.03,-.7);target.add(p);
   el('scaleInfo').textContent=`차량 ${CAR.length.toFixed(2)} × ${CAR.width.toFixed(2)}m · 구획 ${slot.width.toFixed(1)} × ${slot.length.toFixed(1)}m`;
   el('roundTag').textContent=`ROUND ${String(index+1).padStart(2,'0')} / 05`;el('roundName').textContent=round.name;el('roundType').textContent=round.type;el('roundHint').textContent='주황색 경유지를 순서대로 지나 목표 구역으로 이동하세요. '+round.hint;el('hits').textContent='0';el('timer').textContent='00:00';el('gearBtn').innerHTML='D <small>전진 ↕</small>';el('driverGear').textContent='D';el('roundDots').innerHTML=ROUNDS.map((r,i)=>`<i class="${i===index?'current':i<index?'done':''}"></i>`).join('');el('resultModal').classList.add('hidden');
   player.group.position.set(pose.x,0,pose.z);player.group.rotation.y=pose.yaw;updateCamera(1,true);status();
 }
 function reset(){loadRound(roundIndex);}
 function next(){if(!complete)return;if(roundIndex===ROUNDS.length-1){scores.length=0;loadRound(0);}else loadRound(roundIndex+1);}
 el('resetBtn').onclick=reset;el('retryRound').onclick=reset;el('nextRound').onclick=next;
 el('gearBtn').onclick=()=>setGear(gear==='D'?'R':'D');
 function changeView(nextView){view=nextView;document.querySelectorAll('[data-view]').forEach(b=>{const selected=b.dataset.view===view;b.classList.toggle('selected',selected);b.setAttribute('aria-pressed',String(selected));});el('cockpit').classList.toggle('hidden',view!=='driver');updateCamera(1,true);}
 document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>changeView(b.dataset.view));
 window.addEventListener('keydown',e=>{if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(e.key))e.preventDefault();if(e.target?.tagName==='INPUT')return;const k=e.key.toLowerCase();keys.add(k);if(e.repeat)return;if(k==='r')reset();if(k==='q')setGear(gear==='D'?'R':'D');if(k==='c')changeView(['top','chase','driver'][(['top','chase','driver'].indexOf(view)+1)%3]);if(k==='enter'&&complete)next();});
 window.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));
 const release=()=>{keys.clear();remote.gas=false;remote.brake=false;lastRemote=0;};
 window.addEventListener('blur',release);document.addEventListener('visibilitychange',release);
 let hintTimer;function hint(message){clearTimeout(hintTimer);el('hint').textContent=message;el('hint').classList.remove('hidden');hintTimer=setTimeout(()=>el('hint').classList.add('hidden'),2500);}
 const timeText=t=>`${Math.floor(t/60).toString().padStart(2,'0')}:${Math.floor(t%60).toString().padStart(2,'0')}`;
 function finish(){complete=true;speed=0;remote.gas=false;keys.clear();const stars=hits===0&&elapsed<round.timeTarget?3:hits<=2?2:1;scores[roundIndex]=stars;el('stars').textContent='★'.repeat(stars)+'☆'.repeat(3-stars);const final=roundIndex===ROUNDS.length-1;el('resultTag').textContent=final?'ALL SPACES TAKEN':'NICELY PARKED';el('resultTitle').textContent=final?'모든 라운드 완료!':'주차 완료!';el('resultText').textContent=final?`5개 라운드를 모두 마쳤습니다. 총 별 ${scores.reduce((a,b)=>a+(b||0),0)} / 15개`:`${round.type} 성공. 다음 자리가 기다리고 있어요.`;el('resultTime').textContent=timeText(elapsed);el('resultHits').textContent=hits+'회';el('nextRound').textContent=final?'처음부터 다시 →':'다음 라운드 →';el('resultModal').classList.remove('hidden');status();}
 function collision(candidate){const car={...CAR,...candidate};if(corners(car).some(p=>Math.abs(p.x)>LOT.width/2||Math.abs(p.z)>LOT.length/2))return true;return round.obstacles.some(obstacle=>overlaps(car,obstacle));}
 function updateCamera(dt,snap=false){
   if(view==='top'){
     const alpha=snap?1:1-Math.exp(-5*dt);
     topCamera.position.x+=(pose.x-topCamera.position.x)*alpha;
     topCamera.position.z+=(pose.z-.001-topCamera.position.z)*alpha;
     topCamera.lookAt(topCamera.position.x,0,topCamera.position.z+.001);
     const aspect=innerWidth/innerHeight,half=Math.max(checkpointIndex<round.checkpoints.length?18:13,18/aspect);
     topCamera.left=-half*aspect;topCamera.right=half*aspect;topCamera.top=half;topCamera.bottom=-half;topCamera.updateProjectionMatrix();return;
   }
   const sin=Math.sin(pose.yaw),cos=Math.cos(pose.yaw);
   const desired=view==='driver'?new THREE.Vector3(pose.x+.32*cos+.28*sin,1.15,pose.z-.32*sin+.28*cos):new THREE.Vector3(pose.x-sin*9,6.5,pose.z-cos*9);
   camera.position.lerp(desired,snap?1:1-Math.exp(-6*dt));camera.up.set(0,1,0);
   if(view==='driver'){const look=gear==='R'?-1:1;camera.lookAt(camera.position.x+sin*15*look,.95,camera.position.z+cos*15*look);}else camera.lookAt(pose.x+sin*2,0,pose.z+cos*2);
 }
 function resize(){renderer.setSize(innerWidth,innerHeight);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();const a=innerWidth/innerHeight;const half=Math.max(17,20/a);topCamera.left=-half*a;topCamera.right=half*a;topCamera.top=half;topCamera.bottom=-half;topCamera.updateProjectionMatrix();}
 resize();window.addEventListener('resize',resize);
 // Peer discovery is separate from gameplay. No driving data is persisted.
 el('phoneBtn').onclick=()=>{paused=true;speed=0;release();el('pairModal').classList.remove('hidden');if(!peer)startPeer();};
 function closePair(){paused=false;el('pairModal').classList.add('hidden');}
 el('closeModal').onclick=closePair;el('pairModal').addEventListener('click',e=>{if(e.target===el('pairModal'))closePair();});
 el('copyLink').onclick=async()=>{if(!pairUrl)return;try{await navigator.clipboard.writeText(pairUrl);el('copyLink').textContent='복사했습니다 ✓';}catch{el('pairStatus').textContent=pairUrl;}};
 function startPeer(){
   peer=new Peer(undefined,peerOptions);
   peer.on('open',async id=>{pairUrl=location.origin+location.pathname+'?controller='+encodeURIComponent(id);el('qr').innerHTML='';const canvas=document.createElement('canvas');el('qr').append(canvas);await QRCode.toCanvas(canvas,pairUrl,{width:180,margin:1,color:{dark:'#233e30',light:'#ffffff'}});el('pairStatus').textContent=['localhost','127.0.0.1','[::1]'].includes(location.hostname)?'휴대폰은 localhost로 접속할 수 없습니다. README에 따라 HTTPS를 켜고 PC에서도 https://PC의사설IP:5173 주소로 연 뒤 다시 연결하세요.':'QR을 스캔하세요. 휴대폰 연결을 기다리고 있습니다.';});
   peer.on('connection',incoming=>{
     if(conn){incoming.on('open',()=>incoming.close());return;}conn=incoming;
     incoming.on('open',()=>{el('pairStatus').textContent='휴대폰 연결 완료! 센서를 허용하고 중앙을 보정하세요.';el('phoneBtn').innerHTML='<span class="dot"></span>휴대폰 연결됨';closePair();status();});
     incoming.on('data',data=>{if(!data||typeof data!=='object')return;if(data.reset){reset();return;}if(data.next){next();return;}lastRemote=performance.now();remote={steer:clamp(Number(data.steer)||0,-1,1),gas:data.gas===true,brake:data.brake===true,gear:data.gear==='R'?'R':'D'};if(remote.gear!==gear)setGear(remote.gear);});
     incoming.on('close',()=>{release();conn=null;el('phoneBtn').textContent='휴대폰 다시 연결 ↗';hint('휴대폰 연결이 끊겼습니다. 가속을 해제했습니다.');});incoming.on('error',()=>{release();conn=null;});
   });
   peer.on('error',err=>{el('pairStatus').textContent='연결 실패 · 네트워크 확인 후 다시 시도하세요. ('+err.type+')';el('qr').textContent='연결할 수 없습니다';release();peer.destroy();peer=null;});
 }
 const beacon=new THREE.Group();
 const beaconRing=new THREE.Mesh(new THREE.RingGeometry(2.5,2.7,48),new THREE.MeshBasicMaterial({color:'#f2b46b',side:THREE.DoubleSide,transparent:true,opacity:.8}));beaconRing.rotation.x=-Math.PI/2;beaconRing.position.y=.05;beacon.add(beaconRing);
 const pin=new THREE.Mesh(new THREE.ConeGeometry(.45,1.3,4),new THREE.MeshBasicMaterial({color:'#f2b46b'}));pin.rotation.x=Math.PI;pin.position.y=3;beacon.add(pin);scene.add(beacon);
 const mapContext=el('minimap').getContext('2d');
 function drawMap(){
   const c=mapContext,w=240,h=252,sx=w/LOT.width,sz=h/LOT.length;
   c.fillStyle='#20392f';c.fillRect(0,0,w,h);
   const dot=(p,color,r)=>{c.fillStyle=color;c.beginPath();c.arc(w/2-p.x*sx,h/2-p.z*sz,r,0,Math.PI*2);c.fill();};
   const rect=(p,color)=>{c.save();c.translate(w/2-p.x*sx,h/2-p.z*sz);c.rotate(-p.yaw);c.fillStyle=color;c.fillRect(-p.width*sx/2,-p.length*sz/2,p.width*sx,p.length*sz);c.restore();};
   for(const b of round.bays)rect(b,'#4d6b59');for(const o of round.obstacles)rect(o,'#9cae96');rect(round.slot,'#d8eda2');
   c.strokeStyle='#d39b5b';c.lineWidth=1;c.setLineDash([3,4]);c.beginPath();c.moveTo(w/2-pose.x*sx,h/2-pose.z*sz);for(const p of round.checkpoints.slice(checkpointIndex))c.lineTo(w/2-p.x*sx,h/2-p.z*sz);c.stroke();c.setLineDash([]);
   round.checkpoints.forEach((p,i)=>dot(p,i<checkpointIndex?'#6e906d':i===checkpointIndex?'#f3bb76':'#7e805f',i===checkpointIndex?4.5:2.5));
   dot(pose,'#f4cf7c',4);const end={x:pose.x+Math.sin(pose.yaw)*2.5,z:pose.z+Math.cos(pose.yaw)*2.5};c.strokeStyle='#f4cf7c';c.lineWidth=2;c.beginPath();c.moveTo(w/2-pose.x*sx,h/2-pose.z*sz);c.lineTo(w/2-end.x*sx,h/2-end.z*sz);c.stroke();
   el('mapDistance').textContent=Math.round(Math.hypot(pose.x-round.slot.x,pose.z-round.slot.z))+'m TO PARK';
 }
 loadRound(0);
 let previous=performance.now(),hudTime=0;
 function frame(now){
   requestAnimationFrame(frame);const dt=Math.min((now-previous)/1000,.035);previous=now;if(document.hidden)return;
   if(!complete&&!paused){
     elapsed+=dt;const fresh=now-lastRemote<450;
     const target=(keys.has('a')||keys.has('arrowleft')?-1:0)+(keys.has('d')||keys.has('arrowright')?1:0)+(fresh?remote.steer:0);steer=advanceSteering(steer,target,dt);
     const forward=keys.has('w')||keys.has('arrowup'),reverse=keys.has('s')||keys.has('arrowdown');
     let throttle=(fresh&&remote.gas)?(gear==='R'?-1:1):0;
     if(forward){if(gear!=='D')setGear('D');throttle=1;}else if(reverse){if(gear!=='R')setGear('R');throttle=-1;}
     const braking=keys.has(' ')||(fresh&&remote.brake);
     speed=advanceSpeed(speed,throttle,braking,dt);
     const candidate=advanceVehicle(pose,speed,steer,dt);
     if(collision(candidate)){
       if(elapsed-lastHit>1.1&&Math.abs(speed)>.15){hits++;lastHit=elapsed;hint('접촉했습니다. 반대 방향으로 조금 이동해 보세요.');}
       speed=0;hold=0;
     }else pose=candidate;
     const previousCheckpoint=checkpointIndex;checkpointIndex=nextCheckpoint(pose,round.checkpoints,checkpointIndex);
     if(checkpointIndex>previousCheckpoint)hint(checkpointIndex===round.checkpoints.length?'목표 구역 도착! 지정된 자리에 주차하세요.':'경유지 통과 · 다음 주황색 지점으로 이동하세요.');
     const arrived=checkpointIndex===round.checkpoints.length;
     const state=parkingState(pose,round.slot,speed);hold=arrived&&state.ready?hold+dt:0;
     let title='초록색 주차 공간으로 이동하세요',detail='화살표 방향으로 차를 맞춰 주세요';
     if(arrived&&state.inside&&!state.aligned){title='차의 방향을 맞춰 주세요';detail='초록색 화살표가 차 앞쪽 방향입니다';}
     else if(arrived&&state.inside&&state.aligned&&!state.stopped){title='좋아요. 브레이크로 멈추세요';detail='정차한 상태로 1.2초 유지하면 성공';}
     else if(arrived&&state.ready){title='주차 확인 중…';detail='그대로 잠시 멈춰 주세요';}
     if(!arrived){const waypoint=round.checkpoints[checkpointIndex];title=`경유지 ${checkpointIndex+1} / ${round.checkpoints.length}로 이동`;detail=`다음 지점까지 ${Math.round(Math.hypot(pose.x-waypoint.x,pose.z-waypoint.z))}m · 미니맵의 주황색 원을 따라가세요`;}
     el('journeyProgress').textContent=arrived?'02 / PARK · 지정 구획에 주차':`01 / DRIVE · 경유지 ${checkpointIndex} / ${round.checkpoints.length}`;
     el('parkingStatus').textContent=title;el('parkingDetail').textContent=detail;el('holdProgress').style.width=Math.min(1,hold/1.2)*100+'%';targetFill.material.opacity=.16+Math.sin(now*.003)*.035+(state.ready?.16:0);
     if(hold>=1.2)finish();
   }
   const waypoint=round.checkpoints[checkpointIndex];beacon.visible=!!waypoint&&!complete;if(waypoint){beacon.position.set(waypoint.x,0,waypoint.z);pin.position.y=3+Math.sin(now*.003)*.25;}
   player.group.position.set(pose.x,0,pose.z);player.group.rotation.y=pose.yaw;
   for(const wheel of player.wheels){wheel.pivot.rotation.y=wheel.front?frontWheelAngle(steer,wheel.pivot.position.x):0;wheel.spin.rotation.x+=speed*dt/CAR.tireRadius;}
   player.body.rotation.z=THREE.MathUtils.damp(player.body.rotation.z,steer*speed*.008,7,dt);updateCamera(dt);
   if(now-hudTime>100){hudTime=now;el('speed').textContent=Math.round(Math.abs(speed)*3.6).toString().padStart(2,'0');el('timer').textContent=timeText(elapsed);el('hits').textContent=String(hits);el('steerDot').style.left=(50+steer*45)+'%';el('cockpitWheel').style.transform=`rotate(${steer*100}deg)`;drawMap();}
   if(now-lastStatus>350){lastStatus=now;status();}
   renderer.render(scene,view==='top'?topCamera:camera);
 }
 requestAnimationFrame(frame);window.addEventListener('pagehide',()=>peer?.destroy());
}
