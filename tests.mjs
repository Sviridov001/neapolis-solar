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

const {daylightPath,sectorSlices}=await import('./src/sun-display.js');
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
console.log('PASS: daily trajectory / polar day and night / multi-selection / calculation scope');

// Split the fan at every result boundary, including boundaries between samples.
const spans=[[600.25,612.75],[660,669]];
const slices=sectorSlices(config,spans);
assert(slices.length>100);
assert(Math.abs(slices.filter(s=>s.sunlit).reduce((sum,s)=>sum+s.b.minute-s.a.minute,0)-21.5)<1e-7);
for(const [start,end] of spans){assert(slices.some(s=>s.sunlit&&Math.abs(s.a.minute-start)<1e-6));assert(slices.some(s=>s.sunlit&&Math.abs(s.b.minute-end)<1e-6));}
assert(sectorSlices(config).every(s=>!s.sunlit),'No highlight before calculation');
assert(sectorSlices(config,[]).every(s=>!s.sunlit),'Empty result has no sunny wedges');
assert.equal(sectorSlices({...config,date:'2026-12-21',lat:89},[[0,1440]]).length,0);
const wrapping=sectorSlices({...config,lon:180},[[0,1440]]);
assert(wrapping.some(s=>s.a.minute===0)&&wrapping.some(s=>s.b.minute===1440));
assert(wrapping.every(s=>s.b.minute-s.a.minute<=3.01),'No fan triangles bridge the night');
const {createRaySector,createSunGlyph,positionSunGlyph}=await import('./src/sun-scene.js');
const point=[2,3,4],radius=20,fan=createRaySector(slices,point,radius);
assert(Math.abs(fan.userData.sunlitMinutes-21.5)<1e-7);
for(const mesh of fan.children.filter(c=>c.isMesh)){
 const coords=mesh.geometry.attributes.position.array;
 for(let i=0;i<coords.length;i+=9){assert.deepEqual(Array.from(coords.slice(i,i+3)),point);for(const j of [i+3,i+6])assert(Math.abs(Math.hypot(...point.map((v,k)=>coords[j+k]-v))-radius)<1e-5);}
}
const mid=slices.find(s=>s.a.minute>=720);
const normal=new T.Vector3(mid.a.x,mid.a.y,mid.a.z).cross(new T.Vector3(mid.b.x,mid.b.y,mid.b.z)).normalize();
assert(Math.abs(normal.y)>.4,'Daily fan is inclined, not a vertical section');
const sunGlyph=createSunGlyph(),anchor=new T.Vector3(...point),direction=new T.Vector3(mid.a.x,mid.a.y,mid.a.z);
positionSunGlyph(sunGlyph,direction,anchor,radius);assert(sunGlyph.visible);assert(Math.abs(sunGlyph.position.distanceTo(anchor)-radius)<1e-10);assert(sunGlyph.children.some(c=>c.isMesh)&&sunGlyph.children.some(c=>c.isSprite));
positionSunGlyph(sunGlyph,new T.Vector3(0,-1,0),anchor,radius);assert(!sunGlyph.visible,'Sun hidden below horizon');
positionSunGlyph(sunGlyph,direction,anchor,radius,false);assert(!sunGlyph.visible,'Sun toggle');
console.log('PASS: inclined daily fan / exact sunny boundaries / no night triangles / mesh geometry / sun glyph');
