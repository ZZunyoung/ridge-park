import test from 'node:test';
import assert from 'node:assert/strict';
import {CAR,ROUNDS,LOT,PARKING,overlaps,parkingState,corners,nextCheckpoint} from '../src/parking-rules.js';
test('parking requires the entire car, correct nose direction, and a complete stop',()=>{
 const slot={x:0,z:0,yaw:0,...PARKING.standard};
 assert.equal(parkingState({x:0,z:0,yaw:0},slot,0).ready,true);
 assert.equal(parkingState({x:1,z:0,yaw:0},slot,0).inside,false);
 assert.equal(parkingState({x:0,z:0,yaw:Math.PI},slot,0).aligned,false);
 assert.equal(parkingState({x:0,z:0,yaw:0},slot,.5).ready,false);
 assert.equal(parkingState({x:0,z:0,yaw:2*Math.PI},slot,0).ready,true);
});
test('oriented collision test detects overlap, but allows touching boundaries',()=>{
 const a={...CAR,x:0,z:0,yaw:0};
 assert.equal(overlaps(a,{...a,x:1}),true);
 assert.equal(overlaps(a,{...a,x:CAR.width}),false);
 assert.equal(overlaps(a,{...a,x:4,yaw:Math.PI/4}),false);
 assert.equal(overlaps(a,{...a,x:1.7,yaw:Math.PI/4}),true);
});
test('every round has a clear spawn and a collision-free target pose',()=>{
 for(const round of ROUNDS){
   for(const pose of [round.spawn,round.slot]){
     const rect={...CAR,x:pose.x,z:pose.z,yaw:pose.yaw};
     assert.ok(corners(rect).every(p=>Math.abs(p.x)<LOT.width/2&&Math.abs(p.z)<LOT.length/2),round.name+' boundary');
     for(const obstacle of round.obstacles)assert.equal(overlaps(rect,obstacle),false,round.name+' overlap');
   }
   assert.equal(parkingState(round.slot,round.slot,0).ready,true,round.name);
 }
});
test('the final straight parking approach for round 1 stays clear',()=>{
 const r=ROUNDS[0];for(let z=r.parkingApproach.z;z<=r.slot.z;z+=.05){
   assert.ok(!r.obstacles.some(o=>overlaps({...CAR,x:0,z,yaw:0},o)));
 }
});
test('narrow final slot rejects small position errors and rotated targets work',()=>{
 const r=ROUNDS.at(-1);assert.equal(parkingState({...r.slot,x:r.slot.x+.4},r.slot,0).ready,false);
 const diagonal=ROUNDS[3];assert.equal(parkingState(diagonal.slot,diagonal.slot,0).ready,true);
 assert.equal(parkingState({...diagonal.slot,yaw:0},diagonal.slot,0).ready,false);
});

test('all bays use actual standard, expanded or parallel dimensions',()=>{
 for(const round of ROUNDS)for(const bay of round.bays){
   assert.ok(Object.values(PARKING).some(size=>size?.width===bay.width&&size.length===bay.length));
 }
 assert.equal(PARKING.aisleWidth,6);
 for(const round of [ROUNDS[0],ROUNDS[1],ROUNDS[4]]){
   const north=round.bays.filter(b=>b.z>22),south=round.bays.filter(b=>b.z>10&&b.z<22);
   const n=north[0],s=south[0];assert.ok(Math.abs((n.z-n.length/2)-(s.z+s.length/2)-6)<1e-8);
 }
});

test('parallel round has a complete collision-free reverse parking path',async()=>{
 const {MIN_REAR_RADIUS:R,advanceVehicle,advanceSteering}=await import('../src/vehicle.js');
 const round=ROUNDS[2],dx=round.slot.x-round.parkingApproach.x;
 const angle=Math.acos(1-dx/(2*R));
 let pose={...round.parkingApproach},steer=0,samples=0;
 function clear(){
   const car={...CAR,...pose};
   assert.ok(corners(car).every(p=>Math.abs(p.x)<LOT.width/2&&Math.abs(p.z)<LOT.length/2));
   assert.ok(!round.obstacles.some(o=>overlaps(car,o)),`collision at ${JSON.stringify(pose)}`);
   samples++;
 }
 clear();
 for(const target of [-1,1]){
   // Turn the wheels while stopped, then reverse through one exact arc.
   for(let i=0;i<25;i++)steer=advanceSteering(steer,target,1/60);
   for(let i=0;i<600;i++){pose=advanceVehicle(pose,-1,steer,R*angle/600);clear();}
 }
 assert.ok(Math.hypot(pose.x-round.slot.x,pose.z-round.slot.z)<1e-6);
 assert.equal(parkingState(pose,round.slot,0).ready,true);
 assert.ok(samples>1200);
 assert.equal(round.obstacles.filter(o=>o.z>10).length,2,'parallel approach must not be blocked by perpendicular rows');
});


test('all rounds start far from parking, and checkpoint drive segments are unobstructed',()=>{
 for(const round of ROUNDS){
   assert.ok(Math.hypot(round.spawn.x-round.slot.x,round.spawn.z-round.slot.z)>50);
   assert.ok(round.routeLength>70);
   const points=[round.spawn,...round.checkpoints];
   for(let i=1;i<points.length;i++){
     const a=points[i-1],b=points[i],length=Math.hypot(b.x-a.x,b.z-a.z),yaw=Math.atan2(b.x-a.x,b.z-a.z);
     for(let d=0;d<=length;d+=.25){
       const pose={...CAR,x:a.x+(b.x-a.x)*d/length,z:a.z+(b.z-a.z)*d/length,yaw};
       assert.ok(corners(pose).every(p=>Math.abs(p.x)<LOT.width/2&&Math.abs(p.z)<LOT.length/2));
       assert.ok(!round.obstacles.some(o=>overlaps(pose,o)),`${round.name} route segment ${i} blocked`);
     }
   }
 }
});
test('checkpoints must be visited in order before the parking phase',()=>{
 const r=ROUNDS[0];let index=0;
 assert.equal(nextCheckpoint(r.slot,r.checkpoints,index),0);
 assert.equal(nextCheckpoint(r.checkpoints.at(-1),r.checkpoints,index),0);
 for(const p of r.checkpoints){index=nextCheckpoint(p,r.checkpoints,index);}
 assert.equal(index,r.checkpoints.length);
});
