import test from 'node:test';
import assert from 'node:assert/strict';
import {wheelAngle,wheelInput} from '../src/steering.js';
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,`${a} != ${b}`);
// Given a gravity projection on a vertical screen, produce valid beta/gamma.
function orientationAt(angle){
  const r=angle*Math.PI/180;
  const b=Math.asin(Math.cos(r));
  const g=Math.asin(Math.max(-1,Math.min(1,Math.sin(r)/Math.max(1e-12,Math.cos(b)))));
  return [b*180/Math.PI,g*180/Math.PI];
}
test('both landscape holds: clockwise is right, anticlockwise is left',()=>{
  for(const neutral of [-90,90]){
    near(wheelAngle(...orientationAt(neutral)),neutral);
    for(const delta of [-30,-10,10,30]){
      const angle=wheelAngle(...orientationAt(neutral+delta));
      assert.equal(Math.sign(wheelInput(angle,neutral)),Math.sign(delta));
    }
  }
});
test('equivalent Euler representations have identical wheel angle',()=>{
  near(wheelAngle(20,75),wheelAngle(160,-105));
  near(wheelAngle(-20,75),wheelAngle(-160,-105));
});
test('wraparound and calibration remain continuous',()=>{
  near(wheelInput(-179,179),wheelInput(2,0));
  near(wheelInput(179,-179),wheelInput(-2,0));
  near(wheelInput(-90,-90),0);
});
test('flat, missing, and invalid sensor values are rejected',()=>{
  for(const args of [[0,0],[1,1],[null,0],[NaN,20],[10,undefined]])assert.equal(wheelAngle(...args),null);
});
test('deadzone, higher sensitivity and maximum input',()=>{
  near(wheelInput(1,0),0);
  assert.ok(wheelInput(10,0,2)>wheelInput(10,0,1));
  near(wheelInput(90,0),1);near(wheelInput(-90,0),-1);
});
