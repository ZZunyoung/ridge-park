// Metres throughout. Reference: Toyota's 2025 Camry LE brochure, p.18.
// Body dimensions, wheelbase, tracks, 205/65 R16 tyres and curb-to-curb
// turning diameter are published. Symmetric overhangs and steering rate are
// simulation assumptions, rather than a claim to reproduce the production car.
const INCH=.0254, FOOT=.3048;
export const CAR=Object.freeze({
  length:193.5*INCH,width:72.4*INCH,height:56.9*INCH,
  wheelbase:111.2*INCH,frontTrack:63*INCH,rearTrack:63.7*INCH,
  tireWidth:.205,tireRadius:16*INCH/2+.205*.65,
  turningDiameter:37.4*FOOT,
  steerRate:6,
});
export const REAR_AXLE_Z=-CAR.wheelbase/2;
// The outside front tyre's outer edge describes the published curb circle.
// Its centre travels on a slightly smaller circle. Do not apply this radius
// directly to the vehicle centre or the rear-axle bicycle state.
export const MIN_REAR_RADIUS=Math.sqrt((CAR.turningDiameter/2-CAR.tireWidth/2)**2-CAR.wheelbase**2)-CAR.frontTrack/2;
export const MAX_STEER=Math.atan(CAR.wheelbase/MIN_REAR_RADIUS);
export const MIN_BODY_SWEEP_RADIUS=Math.hypot(MIN_REAR_RADIUS+CAR.width/2,CAR.length/2-REAR_AXLE_Z);
export function rearAxle(pose){return {x:pose.x+Math.sin(pose.yaw)*REAR_AXLE_Z,z:pose.z+Math.cos(pose.yaw)*REAR_AXLE_Z};}
export function advanceVehicle(pose,speed,steer,dt){
  const bounded=Math.max(-1,Math.min(1,steer));
  const curvature=-Math.tan(bounded*MAX_STEER)/CAR.wheelbase;
  const rear=rearAxle(pose),distance=speed*dt,yaw=pose.yaw+distance*curvature;
  let x,z;
  if(Math.abs(curvature)<1e-8){x=rear.x+Math.sin(pose.yaw)*distance;z=rear.z+Math.cos(pose.yaw)*distance;}
  else{x=rear.x+(Math.cos(pose.yaw)-Math.cos(yaw))/curvature;z=rear.z+(Math.sin(yaw)-Math.sin(pose.yaw))/curvature;}
  return {x:x-Math.sin(yaw)*REAR_AXLE_Z,z:z-Math.cos(yaw)*REAR_AXLE_Z,yaw};
}
export function frontWheelAngle(steer,x){
  const k=-Math.tan(Math.max(-1,Math.min(1,steer))*MAX_STEER)/CAR.wheelbase;
  return Math.atan(CAR.wheelbase*k/(1-x*k));
}
export function advanceSteering(current,target,dt){
  const bounded=Math.max(-1,Math.min(1,target));
  return current+Math.max(-CAR.steerRate*dt,Math.min(CAR.steerRate*dt,bounded-current));
}
export function advanceSpeed(speed,throttle,brake,dt){
  const sign=Math.sign(speed);
  if(brake)return sign*Math.max(0,Math.abs(speed)-3.5*dt);
  if(!throttle)return sign*Math.max(0,Math.abs(speed)-.65*dt);
  return Math.max(-1.8,Math.min(25/3.6,speed+throttle*1.4*dt));
}
