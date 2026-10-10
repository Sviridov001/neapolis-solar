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
