import { CAR, MIN_REAR_RADIUS } from './vehicle.js';
export { CAR } from './vehicle.js';
export function corners(rect) {
  const sin = Math.sin(rect.yaw), cos = Math.cos(rect.yaw);
  return [-1, 1].flatMap(x => [-1, 1].map(z => ({
    x: rect.x + cos * x * rect.width / 2 + sin * z * rect.length / 2,
    z: rect.z - sin * x * rect.width / 2 + cos * z * rect.length / 2,
  })));
}
export function overlaps(a, b) {
  const ac = corners(a), bc = corners(b);
  for (const r of [a,b]) {
    for (const axis of [{x:Math.cos(r.yaw),z:-Math.sin(r.yaw)},{x:Math.sin(r.yaw),z:Math.cos(r.yaw)}]) {
      const ap=ac.map(p=>p.x*axis.x+p.z*axis.z),bp=bc.map(p=>p.x*axis.x+p.z*axis.z);
      if(Math.max(...ap)<=Math.min(...bp)||Math.max(...bp)<=Math.min(...ap))return false;
    }
  }
  return true;
}
export function parkingState(car, slot, speed) {
  const s=Math.sin(slot.yaw),c=Math.cos(slot.yaw);
  const inside=corners({...car,...CAR}).every(p=>{
    const dx=p.x-slot.x,dz=p.z-slot.z;
    return Math.abs(dx*c-dz*s)<=slot.width/2 && Math.abs(dx*s+dz*c)<=slot.length/2;
  });
  const angle=Math.abs(Math.atan2(Math.sin(car.yaw-slot.yaw),Math.cos(car.yaw-slot.yaw)));
  const aligned=angle<=12*Math.PI/180;
  const stopped=Math.abs(speed)<.035;
  return {inside,aligned,stopped,ready:inside&&aligned&&stopped,angle};
}
// Current Korean parking-space standards, in metres (not rendered scale factors).
export const PARKING=Object.freeze({standard:{width:2.5,length:5},expanded:{width:2.6,length:5.2},parallel:{width:2,length:6},aisleWidth:6});
export const LOT=Object.freeze({width:80,length:84});
const palette=['#a2b8b5','#b7aa91','#c5c8b9','#718d85'];
function rows(size){
 const z=PARKING.aisleWidth/2+size.length/2;
 return [-1,1].flatMap(side=>Array.from({length:9},(_,i)=>({x:(i-4)*size.width,z:side*z,yaw:side>0?0:Math.PI,...size})));
}
function carAt(bay,i){return {x:bay.x,z:bay.z,yaw:bay.yaw,width:CAR.width,length:CAR.length,color:palette[i%palette.length]};}
const expanded=rows(PARKING.expanded),standard=rows(PARKING.standard);
function layout(bays,slot){return {bays,obstacles:bays.filter(b=>Math.hypot(b.x-slot.x,b.z-slot.z)>.1).map(carAt)};}
const frontSlot={x:0,z:5.6,yaw:0,...PARKING.expanded};
const reverseSlot={x:2.6,z:5.6,yaw:Math.PI,...PARKING.expanded};
const parallelSlot={x:8,z:0,yaw:0,...PARKING.parallel};
// Dedicated parallel-practice road: no perpendicular rows across the approach.
// Keep the painted target at 2x6m; allow an extra metre before adjacent bays.
const parallelBays=[parallelSlot,...[-7,7].map(z=>({...parallelSlot,z}))];
const parallelOffset=2.8;
const parallelEntryAngle=Math.acos(1-parallelOffset/(2*MIN_REAR_RADIUS));
const parallelSpawn={x:parallelSlot.x-parallelOffset,z:2*MIN_REAR_RADIUS*Math.sin(parallelEntryAngle),yaw:0};
const angledSlot={x:-4,z:5.5,yaw:Math.PI/6,...PARKING.standard};
const angledBays=[...standard.filter(b=>b.z<0||b.x<-8||b.x>1),...[-1,0,1].map(n=>({...angledSlot,x:angledSlot.x+n*2.5*Math.cos(angledSlot.yaw),z:angledSlot.z-n*2.5*Math.sin(angledSlot.yaw)}))];
const finalSlot={x:0,z:5.5,yaw:Math.PI,...PARKING.standard};
const practiceRounds=[
 {name:'첫 번째 자리',type:'전진 주차',hint:'확장형 구획입니다. 초록색 자리로 천천히 진입하세요.',slot:frontSlot,spawn:{x:0,z:-.5,yaw:0},...layout(expanded,frontSlot)},
 {name:'한 번 돌아서',type:'후진 주차',hint:'6m 통로에서 차를 돌려 R 기어로 천천히 들어가세요.',slot:reverseSlot,spawn:{x:-5,z:0,yaw:-Math.PI/2},...layout(expanded,reverseSlot)},
 {name:'틈 사이로',type:'평행 주차',hint:'앞차 옆에서 시작합니다. R 기어로 후진하며 초록색 자리로 들어가세요.',slot:parallelSlot,spawn:parallelSpawn,...layout(parallelBays,parallelSlot)},
 {name:'조금 다른 각도',type:'사선 주차',hint:'2.5 × 5m 구획입니다. 차의 앞뒤 모서리를 확인하세요.',slot:angledSlot,spawn:{x:5,z:0,yaw:Math.PI/2},...layout(angledBays,angledSlot)},
 {name:'마지막 한 자리',type:'일반형 후진 주차',hint:'2.5 × 5m 일반형 구획입니다. 짧게 움직이며 정렬하세요.',slot:finalSlot,spawn:{x:6,z:0,yaw:Math.PI/2},...layout(standard,finalSlot)},
];


// Each parking exercise sits at the far end of a larger car park. Filled
// double rows leave 6m cross aisles; outer lanes connect the whole site.
const campusBays=[-16,0].flatMap(block=>[-2.5,2.5].flatMap(offset=>Array.from({length:15},(_,i)=>({x:(i-7)*2.5,z:block+offset,yaw:offset>0?0:Math.PI,...PARKING.standard}))));
const routes=[
 [{x:-28,z:-8},{x:-28,z:22},{x:-14,z:22}],
 [{x:28,z:-8},{x:28,z:22},{x:14,z:22}],
 [{x:-28,z:-24},{x:28,z:-24},{x:28,z:22},{x:5.2,z:20}],
 [{x:-28,z:-8},{x:28,z:-8},{x:28,z:22},{x:14,z:22}],
 [{x:28,z:-24},{x:-28,z:-24},{x:-28,z:8},{x:28,z:8},{x:28,z:22},{x:14,z:22}],
];
export const ROUNDS=practiceRounds.map((r,i)=>{
 const shift=b=>({...b,z:b.z+22});
 const spawn={x:i===1||i===4?28:-28,z:-32,yaw:0};
 const parkingApproach=shift(r.spawn);
 const checkpoints=[...routes[i],{x:parkingApproach.x,z:parkingApproach.z}];
 const bays=[...campusBays,...r.bays.map(shift)];
 const obstacles=[...campusBays.map(carAt),...r.obstacles.map(shift)];
 const points=[spawn,...checkpoints,shift(r.slot)];
 const routeLength=points.slice(1).reduce((sum,p,j)=>sum+Math.hypot(p.x-points[j].x,p.z-points[j].z),0);
 return {...r,name:['입구에서 A구역까지','동쪽 통로의 빈자리','한 바퀴 돌아 평행주차','교차로 너머 사선 주차','주차장 끝 마지막 자리'][i],slot:shift(r.slot),spawn,parkingApproach,checkpoints,bays,obstacles,routeLength,timeTarget:Math.max(110,routeLength/2+75)};
});
export function nextCheckpoint(pose,checkpoints,index){
 const next=checkpoints[index];
 return next&&Math.hypot(pose.x-next.x,pose.z-next.z)<3?index+1:index;
}
