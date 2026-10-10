import {BufferGeometry,Float32BufferAttribute,Ray,Vector3,DoubleSide} from 'three';
import {MeshBVH} from 'three-mesh-bvh';import {sunVector,intervals} from './solar.js';
let bvh,ids;
self.onmessage=async({data:d})=>{try{
 if(d.type==='init'){const g=new BufferGeometry();g.setAttribute('position',new Float32BufferAttribute(d.positions,3));bvh=new MeshBVH(g,{indirect:true,maxLeafSize:8,maxDepth:64});ids=d.ids;postMessage({type:'ready'});return;}
 if(d.type!=='calc')return;
 const step=d.settings.step,results=[],ray=new Ray(),direction=new Vector3();
 const suns=Array.from({length:1440/step},(_,i)=>sunVector(d.settings.date,(i+.5)*step,d.settings.lat,d.settings.lon,d.settings.utc,d.settings.north));
 for(let p=0;p<d.points.length;p++){
  const pt=d.points[p],flags=[],reasons={},blocked=[],n=pt.normal?new Vector3(...pt.normal):null;
  ray.origin.fromArray(pt.position);
  for(const sun of suns){let id=0;if(sun.y<=0){flags.push(0);blocked.push(-1);continue;}
   direction.set(sun.x,sun.y,sun.z);if(n&&n.dot(direction)<=0){flags.push(0);blocked.push(-2);continue;}
   ray.direction.copy(direction);const hit=bvh.raycastFirst(ray,DoubleSide,0.005,Infinity);if(hit)id=ids[hit.faceIndex]||0;
   flags.push(hit?0:1);blocked.push(hit?id:0);if(hit)reasons[id]=(reasons[id]||0)+step;
  }
  const spans=intervals(flags,step);results.push({id:pt.id,intervals:spans,total:spans.reduce((s,[a,b])=>s+b-a,0),longest:Math.max(0,...spans.map(([a,b])=>b-a)),flags,blocked,reasons});
  if(p%10===0)postMessage({type:'progress',done:p+1,total:d.points.length});
 }
 postMessage({type:'result',results,settings:d.settings,run:d.run});
 }catch(e){postMessage({type:'error',message:e.message});}};
