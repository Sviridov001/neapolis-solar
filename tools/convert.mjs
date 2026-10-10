import * as W from '../node_modules/web-ifc/web-ifc-api-node.js';import fs from 'node:fs';import path from 'node:path';
const api=new W.IfcAPI();api.SetWasmPath(path.resolve('node_modules/web-ifc')+'/',true);await api.Init();const m=api.OpenModel(new Uint8Array(fs.readFileSync(process.argv[2])),{COORDINATE_TO_ORIGIN:false});
const val=x=>x?.value??x??'',deg=a=>(val(a)||[]).reduce((s,x,i)=>s+Number(val(x))/[1,60,3600,3600000000][i],0),meta={name:path.basename(process.argv[2]),schema:api.GetModelSchema(m),units:'m',north:[0,1],latitude:null,longitude:null,elements:[],chunks:[],bounds:[[Infinity,Infinity,Infinity],[-Infinity,-Infinity,-Infinity]],counts:{},failed:[]};
let ids=api.GetLineIDsWithType(m,W.IFCSITE);if(ids.size()){let s=api.GetLine(m,ids.get(0));meta.latitude=deg(s.RefLatitude);meta.longitude=deg(s.RefLongitude)}
ids=api.GetLineIDsWithType(m,W.IFCGEOMETRICREPRESENTATIONCONTEXT);for(let i=0;i<ids.size();i++){let c=api.GetLine(m,ids.get(i));if(c.TrueNorth){meta.north=val(api.GetLine(m,c.TrueNorth.value).DirectionRatios).map(x=>Number(val(x)));break}}
const out=process.argv[3];fs.mkdirSync(out,{recursive:true});let chunk=0,n=0,buf=[];
function flush(){if(!n)return;let a=new Float32Array(n),p=0;for(let b of buf){a.set(b,p);p+=b.length}let file=`geometry-${chunk}.bin`;fs.writeFileSync(path.join(out,file),Buffer.from(a.buffer));meta.chunks.push({file,floats:n});chunk++;n=0;buf=[];fs.writeFileSync(path.join(out,'model.partial.json'),JSON.stringify(meta));}
api.StreamAllMeshes(m,(mesh,index,total)=>{
 const el=api.GetLine(m,mesh.expressID),name=String(val(el.Name)),type=api.GetNameFromTypeCode(el.type);
 if(el.type===W.IFCSPACE||el.type===W.IFCOPENINGELEMENT)return;
 meta.counts[type]=(meta.counts[type]||0)+1;
 for(let j=0;j<mesh.geometries.size();j++){
  const inst=mesh.geometries.get(j),g=api.GetGeometry(m,inst.geometryExpressID),v=api.GetVertexArray(g.GetVertexData(),g.GetVertexDataSize()),ix=api.GetIndexArray(g.GetIndexData(),g.GetIndexDataSize()),t=inst.flatTransformation;
  if(!ix.length){g.delete();continue}if(n+ix.length*3>2400000)flush();
  const a=new Float32Array(ix.length*3),bounds=[[Infinity,Infinity,Infinity],[-Infinity,-Infinity,-Infinity]];
  for(let k=0;k<ix.length;k++){let b=ix[k]*6,x=v[b],y=v[b+1],z=v[b+2],p=[t[0]*x+t[4]*y+t[8]*z+t[12],t[1]*x+t[5]*y+t[9]*z+t[13],t[2]*x+t[6]*y+t[10]*z+t[14]];a.set(p,k*3);for(let h=0;h<3;h++){bounds[0][h]=Math.min(bounds[0][h],p[h]);bounds[1][h]=Math.max(bounds[1][h],p[h]);meta.bounds[0][h]=Math.min(meta.bounds[0][h],p[h]);meta.bounds[1][h]=Math.max(meta.bounds[1][h],p[h]);}}
  meta.elements.push({id:mesh.expressID,guid:String(val(el.GlobalId)),name,type,storey:'',window:el.type===W.IFCWINDOW||(el.type===W.IFCBUILDINGELEMENTPROXY&&/^[ОБ]-/.test(name)),glass:inst.color.w<.95,chunk,start:n,count:a.length,bbox:bounds});buf.push(a);n+=a.length;g.delete();
 }
 if(index%500===0)console.log('mesh',index,total,'chunks',chunk);
});flush();meta.meshedElementCount=Object.values(meta.counts).reduce((a,b)=>a+b,0);meta.sourceElementCount=meta.meshedElementCount;fs.writeFileSync(path.join(out,'model.json'),JSON.stringify(meta));fs.unlinkSync(path.join(out,'model.partial.json'));api.CloseModel(m);api.Dispose();console.log('DONE',meta.bounds,meta.counts,'chunks',chunk);
