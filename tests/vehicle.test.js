import test from 'node:test';
import assert from 'node:assert/strict';
import {CAR,MIN_REAR_RADIUS,MAX_STEER,REAR_AXLE_Z,advanceVehicle,rearAxle,frontWheelAngle,advanceSteering} from '../src/vehicle.js';
const near=(a,b,tol=1e-7)=>assert.ok(Math.abs(a-b)<tol,`${a} != ${b}`);
test('published dimensions and front/rear wheel positions use the same metre scale',()=>{
 near(CAR.length,4.9149);near(CAR.width,1.83896);near(CAR.wheelbase,2.82448);
 near(CAR.turningDiameter,11.39952);near(-2*REAR_AXLE_Z,CAR.wheelbase);
});
test('full-lock front outer tyre traces the manufacturer curb-to-curb circle',()=>{
 for(const steer of [-1,1]){
   const curvature=-Math.tan(steer*MAX_STEER)/CAR.wheelbase;
   const initial={x:2,z:3,yaw:.7},rear=rearAxle(initial);
   const icr={x:rear.x+Math.cos(initial.yaw)/curvature,z:rear.z-Math.sin(initial.yaw)/curvature};
   const travelTime=2*Math.PI/(Math.abs(curvature)*1.7),steps=1200;
   let pose=initial;
   for(let i=0;i<steps;i++){
     pose=advanceVehicle(pose,1.7,steer,travelTime/steps);
     const r=rearAxle(pose);
     near(Math.hypot(r.x-icr.x,r.z-icr.z),MIN_REAR_RADIUS);
     const outsideX=steer*CAR.frontTrack/2;
     const x=r.x+Math.cos(pose.yaw)*outsideX+Math.sin(pose.yaw)*CAR.wheelbase;
     const z=r.z-Math.sin(pose.yaw)*outsideX+Math.cos(pose.yaw)*CAR.wheelbase;
     near(Math.hypot(x-icr.x,z-icr.z)+CAR.tireWidth/2,CAR.turningDiameter/2);
   }
   near(pose.x,initial.x);near(pose.z,initial.z);
 }
});
test('forward/reverse and frame intervals preserve the same turning geometry',()=>{
 const start={x:1,z:4,yaw:1.1};
 let forward=advanceVehicle(start,1.5,.6,2);const reversed=advanceVehicle(forward,-1.5,.6,2);
 near(reversed.x,start.x);near(reversed.z,start.z);near(reversed.yaw,start.yaw);
 let stepped=start;for(let i=0;i<120;i++)stepped=advanceVehicle(stepped,1.5,.6,2/120);
 near(stepped.x,forward.x);near(stepped.z,forward.z);near(stepped.yaw,forward.yaw);
 assert.deepEqual(advanceVehicle(start,0,1,1),start);
});
test('Ackermann wheels turn by different angles and share one turn centre',()=>{
 const left=frontWheelAngle(1,CAR.frontTrack/2),right=frontWheelAngle(1,-CAR.frontTrack/2);
 assert.ok(Math.abs(right)>Math.abs(left));
 near(CAR.wheelbase/Math.tan(left)+CAR.frontTrack/2,-MIN_REAR_RADIUS);
 near(CAR.wheelbase/Math.tan(right)-CAR.frontTrack/2,-MIN_REAR_RADIUS);
});
test('steering respects finite rack speed and partial steering uses tan(actual angle)',()=>{
 near(advanceSteering(0,1,.1),.6);
 const half=advanceVehicle({x:0,z:0,yaw:0},1,.5,1);
 near(Math.abs(half.yaw),Math.tan(MAX_STEER*.5)/CAR.wheelbase);
});

test('full steering is reached within 167ms and opposite lock within 334ms',()=>{
 let steer=0;for(let i=0;i<10;i++)steer=advanceSteering(steer,1,1/60);near(steer,1);
 for(let i=0;i<20;i++)steer=advanceSteering(steer,-1,1/60);near(steer,-1);
});
