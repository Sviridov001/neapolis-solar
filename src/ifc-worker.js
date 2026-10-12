import * as W from 'web-ifc';
self.onmessage=async({data:d})=>{let api,model;try{
 let warningCount=0;const log=console.error;console.error=(...a)=>{if(a.join(' ').includes('[WEB-IFC]'))warningCount++;else log(...a)};api=new W.IfcAPI();api.SetWasmPath(new URL('./',self.location.href).href,true);await api.Init(undefined,true);
 model=api.OpenModel(new Uint8Array(d.buffer),{COORDINATE_TO_ORIGIN:false});
 const meta={name:d.name,schema:api.GetModelSchema(model),units:'m',elements:[],chunks:[],bounds:[[Infinity,Infinity,Infinity],[-Infinity,-Infinity,-Infinity]],latitude:null,longitude:null,north:[0,1],failed:[]};
 function getVal(x){return x?.value??x??''}function degrees(a){return (getVal(a)||[]).reduce((s,v,i)=>s+Number(getVal(v))/[1,60,3600,3600000000][i],0)}
 let siteIds=api.GetLineIDsWithType(model,W.IFCSITE);if(siteIds.size()){let s=api.GetLine(model,siteIds.get(0));if(s.RefLatitude)meta.latitude=degrees(s.RefLatitude);if(s.RefLongitude)meta.longitude=degrees(s.RefLongitude);}
 let ctxIds=api.GetLineIDsWithType(model,W.IFCGEOMETRICREPRESENTATIONCONTEXT);for(let i=0;i<ctxIds.size();i++){let c=api.GetLine(model,ctxIds.get(i));if(c.TrueNorth){let n=api.GetLine(model,c.TrueNorth.value);meta.north=getVal(n.DirectionRatios).map(x=>Number(getVal(x)));break;}}
 const geom=[],counts={};let buffer=[],offset=0;function flush(){if(!offset)return;let a=new Float32Array(offset),p=0;for(let b of buffer){a.set(b,p);p+=b.length}geom.push(a);buffer=[];offset=0;}
 api.StreamAllMeshes(model,(mesh,index,total)=>{
  let el=api.GetLine(model,mesh.expressID),type=api.GetNameFromTypeCode(el.type),name=String(getVal(el.Name)),window=el.type===W.IFCWINDOW||(el.type===W.IFCBUILDINGELEMENTPROXY&&/^[ОБ]-/.test(name));
  if(el.type===W.IFCSPACE||el.type===W.IFCOPENINGELEMENT)return;counts[type]=(counts[type]||0)+1;
  for(let j=0;j<mesh.geometries.size();j++){
   const inst=mesh.geometries.get(j),g=api.GetGeometry(model,inst.geometryExpressID),v=api.GetVertexArray(g.GetVertexData(),g.GetVertexDataSize()),ix=api.GetIndexArray(g.GetIndexData(),g.GetIndexDataSize()),mat=inst.flatTransformation;
   if(!ix.length){g.delete();continue;}if(offset+ix.length*3>2400000)flush();const ar=new Float32Array(ix.length*3),bounds=[[Infinity,Infinity,Infinity],[-Infinity,-Infinity,-Infinity]];
   for(let k=0;k<ix.length;k++){let a=ix[k]*6,x=v[a],y=v[a+1],z=v[a+2];let p=[mat[0]*x+mat[4]*y+mat[8]*z+mat[12],mat[1]*x+mat[5]*y+mat[9]*z+mat[13],mat[2]*x+mat[6]*y+mat[10]*z+mat[14]];
    // web-ifc's default geometry is Y-up (IFC Z maps to Y and IFC Y to -Z).
    ar.set(p,k*3);for(let h=0;h<3;h++){bounds[0][h]=Math.min(bounds[0][h],p[h]);bounds[1][h]=Math.max(bounds[1][h],p[h]);meta.bounds[0][h]=Math.min(meta.bounds[0][h],p[h]);meta.bounds[1][h]=Math.max(meta.bounds[1][h],p[h]);}
   }
   meta.elements.push({id:mesh.expressID,guid:String(getVal(el.GlobalId)),type,name,storey:'',window,glass:inst.color.w<.95,chunk:geom.length,start:offset,count:ar.length,bbox:bounds});buffer.push(ar);offset+=ar.length;g.delete();
  }
  if(index%150===0)postMessage({type:'progress',done:index,total});
 });
 flush();meta.geometryWarnings=warningCount;meta.counts=counts;meta.meshedElementCount=new Set(meta.elements.map(e=>e.id)).size;meta.sourceElementCount=Object.values(counts).reduce((a,b)=>a+b,0);
 api.CloseModel(model);api.Dispose();postMessage({type:'model',meta,arrays:geom},geom.map(a=>a.buffer));
 }catch(e){if(api&&model!==undefined)try{api.CloseModel(model)}catch{}postMessage({type:'error',message:e.message});}};
