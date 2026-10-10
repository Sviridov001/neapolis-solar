import assert from 'node:assert/strict';import {sunVector,intervals,insidePolygon,polygonArea,simplePolygon} from './src/solar.js';import * as T from 'three';import {MeshBVH} from 'three-mesh-bvh';
let a=sunVector('2026-03-20',360,0,0,0,0),b=sunVector('2026-03-20',720,0,0,0,0),c=sunVector('2026-03-20',1080,0,0,0,0);
assert(a.x>.99,'Morning sun must be east');assert(b.y>.99,'Equinox noon must be overhead');assert(c.x<-.99,'Evening sun must be west');
let n=sunVector('2026-03-20',360,0,0,0,90);assert(n.z>.99,'Rotation: east is +Z for north +X');
assert.deepEqual(intervals([0,1,1,0,1],5),[[5,15],[20,25]]);assert.deepEqual(intervals([0,0],1),[]);assert.deepEqual(intervals([1,1],1),[[0,2]]);
let poly=[[0,0,0],[10,0,0],[10,0,10],[0,0,10]];assert.equal(polygonArea(poly),100);assert(insidePolygon(5,5,poly));assert(!insidePolygon(15,5,poly));
// BVH must preserve original triangle identifiers, including back faces.
const box=new T.BoxGeometry(2,2,2).toNonIndexed(),bvh=new MeshBVH(box,{indirect:true});let ray=new T.Ray(new T.Vector3(0,0,5),new T.Vector3(0,0,-1)),hit=bvh.raycastFirst(ray,T.DoubleSide);assert(hit);assert(Math.abs(hit.distance-4)<1e-6);const ar=box.attributes.position.array;let zs=[ar[hit.faceIndex*9+2],ar[hit.faceIndex*9+5],ar[hit.faceIndex*9+8]];assert(zs.every(z=>z===1),'BVH faceIndex must refer to original triangle');
assert.equal(bvh.raycastFirst(new T.Ray(new T.Vector3(0,0,5),new T.Vector3(0,0,1)),T.DoubleSide),null);
console.log('PASS: solar orientation / timezone / polygon / intervals / BVH hit identification');
let d=sunVector('2026-03-20',900,0,0,3,0);assert(Math.abs(d.y-b.y)<1e-12,'UTC offset changes time, not sun');

assert(simplePolygon(poly));assert(!simplePolygon([[0,0,0],[10,0,10],[0,0,10],[10,0,0]]));

// The display plane must contain both the ray and the vertical direction,
// including an overhead sun and arbitrarily rotated model north.
const {rayPlaneFrame,daylightPath}=await import('./src/sun-display.js');
for(const north of [0,37,90,180,270])for(const minute of [0,360,720,1080,1439]){
 const direction=sunVector('2026-06-21',minute,44.948056,34.104167,3,north);
 const frame=rayPlaneFrame(direction);
 assert(Math.abs(frame.normal.reduce((sum,v,i)=>sum+v*[direction.x,direction.y,direction.z][i],0))<1e-10);
 assert.equal(frame.normal[1],0);
 assert(Math.abs(Math.hypot(...frame.normal)-1)<1e-10);
}
assert.deepEqual(rayPlaneFrame({x:0,y:1,z:0}).horizontal,[1,0,0]);
const config={date:'2026-03-22',lat:44.948056,lon:34.104167,utc:3,north:0};
const path=daylightPath(config);
assert(path.length>100);
assert(Math.abs(path[0].y)<1e-7&&Math.abs(path.at(-1).y)<1e-7,'Trajectory ends at the geometric horizon');
assert(path.every(p=>p.y>-1e-7&&Math.abs(Math.hypot(p.x,p.y,p.z)-1)<1e-10));
const rotated=daylightPath({...config,north:90});
assert.equal(path.length,rotated.length);
for(let i=0;i<path.length;i++)assert(Math.abs(path[i].x-rotated[i].z)<1e-10);
assert.equal(daylightPath({...config,date:'2026-12-21',lat:89}).length,0,'Polar night');
assert.equal(daylightPath({...config,date:'2026-06-21',lat:89})[0].minute,0,'Polar day begins at midnight');

const {selectPointIds,calculationPoints}=await import('./src/selection.js');
let chosen=selectPointIds(new Set(),'a');
chosen=selectPointIds(chosen,'b',true);assert.deepEqual([...chosen],['a','b']);
const before=chosen;chosen=selectPointIds(chosen,'a',true);
assert.deepEqual([...before],['a','b'],'Selection does not mutate the previous state');
assert.deepEqual([...chosen],['b']);
chosen=selectPointIds(chosen,'c');assert.deepEqual([...chosen],['c']);
assert.deepEqual(calculationPoints([{id:'a'},{id:'b'},{id:'c'}],chosen,'selected'),[{id:'c'}]);
assert.equal(calculationPoints([{id:'a'},{id:'b'}],new Set(),'selected').length,0);
assert.equal(calculationPoints([{id:'a'},{id:'b'}],chosen,'all').length,2);
assert.equal(selectPointIds(new Set(['c']),'c',true).size,0,'Toggle last point off');
console.log('PASS: ray section / daily trajectory / polar day and night / multi-selection / calculation scope');
