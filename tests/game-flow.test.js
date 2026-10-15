import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as ActualThree from 'three';
import {CAR,ROUNDS,LOT,PARKING,corners,overlaps,parkingState,nextCheckpoint} from '../src/parking-rules.js';
import {advanceVehicle,advanceSteering,advanceSpeed,frontWheelAngle} from '../src/vehicle.js';

test('parking phase: drive, stop, parking hold, next round, retry and all camera modes',()=>{
 const nodes=new Map(),events={},viewButtons=['top','chase','driver'].map(view=>node({dataset:{view}}));
 function node(extra={}){const flags=new Set(['hidden']);return {textContent:'',innerHTML:'',getContext(){return new Proxy({},{get:(obj,key)=>key in obj?obj[key]:()=>{}})},style:{},dataset:{},classList:{add:x=>flags.add(x),remove:x=>flags.delete(x),contains:x=>flags.has(x),toggle(x,v){if(v)flags.add(x);else flags.delete(x)}},setAttribute(){},addEventListener(){},...extra};}
 const doc={hidden:false,getElementById(id){if(!nodes.has(id))nodes.set(id,node());return nodes.get(id)},querySelectorAll(){return viewButtons},addEventListener(){},createElement(){return {getContext(){return new Proxy({},{get:(obj,key)=>key in obj?obj[key]:()=>{}})}}}};
 let animation,renderedScene,cameras=[];
 class FakeRenderer{constructor(){this.shadowMap={}}setPixelRatio(){}setSize(){}render(scene,camera){renderedScene=scene;cameras.push(camera)}}
 const fakeThree={...ActualThree,WebGLRenderer:FakeRenderer};
 const source=fs.readFileSync(new URL('../src/parking.js',import.meta.url),'utf8').replace(/^import .*;\n/gm,'').replace('export function startParking','function startParking');
 const win={addEventListener(type,fn){events[type]=fn}};
 const getStart=new Function('THREE','CAR','ROUNDS','LOT','PARKING','advanceVehicle','advanceSteering','advanceSpeed','frontWheelAngle','corners','overlaps','parkingState','nextCheckpoint','location','document','window','innerWidth','innerHeight','devicePixelRatio','requestAnimationFrame',source+'\nreturn startParking;');
 const start=getStart(fakeThree,CAR,ROUNDS.map(r=>({...r,spawn:r.parkingApproach,checkpoints:[]})),LOT,PARKING,advanceVehicle,advanceSteering,advanceSpeed,frontWheelAngle,corners,overlaps,parkingState,nextCheckpoint,{hostname:'localhost'},doc,win,1440,900,1,fn=>animation=fn);
 start({app:{},Peer:class{},QRCode:{},peerOptions:{}});
 let now=performance.now();const tick=()=>{now+=1000/60;animation(now)};
 const key=(value,type='keydown')=>events[type]({key:value,target:{},preventDefault(){}});
 tick();assert.equal(renderedScene.getObjectByName('player-car').position.z,ROUNDS[0].parkingApproach.z);
 const model=renderedScene.getObjectByName('player-car'),marker=model.getObjectByName('direction-marker');model.remove(marker);
 const size=new ActualThree.Box3().setFromObject(model).getSize(new ActualThree.Vector3());model.add(marker);
 assert.ok(Math.abs(size.x-CAR.width)<1e-6);assert.ok(Math.abs(size.z-CAR.length)<1e-6);assert.ok(Math.abs(size.y-CAR.height)<1e-6);
 key('w');for(let i=0;i<1000;i++){const before=model.position.z;tick();const measuredSpeed=(model.position.z-before)*60;if(model.position.z+measuredSpeed**2/7>=ROUNDS[0].slot.z-.04)break;}
 key('w','keyup');key(' ');for(let i=0;i<180;i++)tick();
 assert.equal(doc.getElementById('resultModal').classList.contains('hidden'),false,'round should complete');
 assert.equal(doc.getElementById('hits').textContent,'0');
 doc.getElementById('nextRound').onclick();assert.equal(doc.getElementById('roundTag').textContent,'ROUND 02 / 05');
 for(const b of viewButtons){b.onclick();tick();}
 assert.ok(cameras.some(c=>c.isOrthographicCamera));assert.ok(cameras.some(c=>c.isPerspectiveCamera));
 key('s');for(let i=0;i<20;i++)tick();key('s','keyup');assert.match(doc.getElementById('gearBtn').innerHTML,/R/);
 doc.getElementById('resetBtn').onclick();assert.equal(doc.getElementById('timer').textContent,'00:00');assert.match(doc.getElementById('gearBtn').innerHTML,/D/);
});
