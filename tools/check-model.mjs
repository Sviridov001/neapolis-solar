import fs from 'node:fs';import {gunzipSync} from 'node:zlib';import assert from 'node:assert/strict';import * as T from 'three';import {MeshBVH} from 'three-mesh-bvh';import {sunVector,intervals} from '../src/solar.js';
const meta=JSON.parse(gunzipSync(fs.readFileSync('dist/model/model.json.gz')));
const chunks=meta.chunks.map(c=>{let b=gunzipSync(fs.readFileSync('dist/model/'+c.file));assert.equal(b.length,c.floats*4);return new Float32Array(b.buffer,b.byteOffset,b.length/4)});
let n=meta.elements.filter(e=>!e.glass).reduce((s,e)=>s+e.count,0),positions=new Float32Array(n),ids=new Uint32Array(n/9),offset=0;
for(let e of meta.elements){assert.equal(e.count%9,0);assert(e.start+e.count<=chunks[e.chunk].length);if(e.glass)continue;positions.set(chunks[e.chunk].subarray(e.start,e.start+e.count),offset);ids.fill(e.id,offset/9,(offset+e.count)/9);offset+=e.count}
assert(positions.every(Number.isFinite));assert(Math.abs(meta.latitude-44.9480555556)<1e-6);assert(Math.abs(meta.longitude-34.1041666667)<1e-6);
// Reference bounds independently checked with IfcOpenShell. Tolerance 0.1 mm.
let bound=meta.elements.filter(e=>e.id===43471);assert(bound.length);assert(Math.abs(Math.min(...bound.map(e=>e.bbox[0][0]))-(-341.1393509566))<.0001);
const g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(positions,3));const bvh=new MeshBVH(g,{indirect:true,maxDepth:64});const ray=new T.Ray(),dir=new T.Vector3();
let tests=[["Вне участка",[500,.05,500]],["Центр двора",[-129,.05,-195]]];for(let [name,p] of tests){let flags=[],hits=0;for(let m=0;m<1440;m+=5){let v=sunVector('2026-03-22',m+2.5,meta.latitude,meta.longitude,3,0);dir.set(v.x,v.y,v.z);ray.origin.fromArray(p);ray.direction.copy(dir);let hit=v.y>0?bvh.raycastFirst(ray,T.DoubleSide,.005):null;if(hit){assert(ids[hit.faceIndex]>0);hits++}flags.push(v.y>0&&!hit?1:0)}console.log(name,intervals(flags,5),'blockedSteps',hits);if(name==='Вне участка')assert.equal(hits,0);}
console.log('PASS: all binary ranges, finite geometry, coordinates, independent bounds, full-model ray tracing');
