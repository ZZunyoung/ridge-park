import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {wheelAngle,wheelInput} from '../src/steering.js';
test('sensor samples are transmitted immediately without the old smoothing delay',async()=>{
 const listeners={},nodes=new Map(),intervals=[];
 const el=id=>{if(!nodes.has(id))nodes.set(id,{value:'1.2',textContent:'',style:{},classList:{add(){},remove(){},toggle(){}},addEventListener(type,fn){listeners[id+':'+type]=fn},setPointerCapture(){}});return nodes.get(id)};
 class Peer{on(){}}
 const context={app:{},document:{addEventListener(){}},window:{DeviceOrientationEvent:{},addEventListener(type,fn){listeners[type]=fn}},screen:{orientation:{addEventListener(){}}},DeviceOrientationEvent:{},params:new URLSearchParams('?controller=test'),Peer,peerOptions:{},navigator:{},el,clamp:(x,a,b)=>Math.max(a,Math.min(b,x)),Date,Number,Math,setTimeout(){},setInterval(fn,ms){intervals.push(ms)},wheelAngle,wheelInput};
 vm.createContext(context);
 const source=fs.readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
 vm.runInContext(source.slice(source.indexOf('function controller(){'),source.indexOf('\nfunction game(){'))+'\ncontroller();',context);
 const sent=[];context.connection={open:true,send:data=>sent.push(data)};
 await el('sensor').onclick();
 listeners.deviceorientation({beta:0,gamma:90});
 const before=sent.length;
 listeners.deviceorientation({beta:-30,gamma:90});
 assert.equal(sent.length,before+1);
 assert.ok(sent.at(-1).steer>.95,'first rotated sensor sample should reach full input');
 assert.deepEqual(intervals,[16]);
 listeners.deviceorientation({beta:0,gamma:0});
 assert.equal(sent.at(-1).steer,0,'invalid sensor pose should release steering immediately');
});
