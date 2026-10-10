import SunCalc from 'suncalc';
export function sunVector(day,minute,latitude,longitude,utcOffset,northDegrees=0){
 const d=new Date(`${day}T00:00:00Z`);d.setTime(d.getTime()+(minute-utcOffset*60)*60000);
 const {altitude,azimuth}=SunCalc.getPosition(d,latitude,longitude);
 const east=-Math.sin(azimuth)*Math.cos(altitude),north=-Math.cos(azimuth)*Math.cos(altitude),a=northDegrees*Math.PI/180;
 // World X east / world -Z north; north angle clockwise from model +Y.
 return {x:east*Math.cos(a)+north*Math.sin(a),y:Math.sin(altitude),z:east*Math.sin(a)-north*Math.cos(a),altitude,azimuth:(azimuth*180/Math.PI+180+360)%360};
}
export function intervals(flags,step){const out=[];let start=null;for(let i=0;i<=flags.length;i++){if(flags[i]&&start===null)start=i*step;if(!flags[i]&&start!==null){out.push([start,Math.min(i*step,1440)]);start=null;}}return out;}
export function insidePolygon(x,z,poly){let inside=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const a=poly[i],b=poly[j];if((a[2]>z)!==(b[2]>z)&&x<(b[0]-a[0])*(z-a[2])/(b[2]-a[2])+a[0])inside=!inside;}return inside;}
export function polygonArea(poly){return Math.abs(poly.reduce((s,a,i)=>{let b=poly[(i+1)%poly.length];return s+a[0]*b[2]-b[0]*a[2]},0))/2;}
export function simplePolygon(poly){
 if(poly.length<3)return false;
 const cross=(a,b,c)=>(b[0]-a[0])*(c[2]-a[2])-(b[2]-a[2])*(c[0]-a[0]);
 const between=(a,b,p)=>Math.min(a[0],b[0])-1e-8<=p[0]&&p[0]<=Math.max(a[0],b[0])+1e-8&&Math.min(a[2],b[2])-1e-8<=p[2]&&p[2]<=Math.max(a[2],b[2])+1e-8;
 for(let i=0;i<poly.length;i++){let a=poly[i],b=poly[(i+1)%poly.length];if(Math.hypot(a[0]-b[0],a[2]-b[2])<1e-5)return false;
  for(let j=i+1;j<poly.length;j++){if(j===i+1||i===0&&j===poly.length-1)continue;let c=poly[j],d=poly[(j+1)%poly.length],u=cross(a,b,c),v=cross(a,b,d),w=cross(c,d,a),x=cross(c,d,b);if(u*v<0&&w*x<0||Math.abs(u)<1e-8&&between(a,b,c)||Math.abs(v)<1e-8&&between(a,b,d)||Math.abs(w)<1e-8&&between(c,d,a)||Math.abs(x)<1e-8&&between(c,d,b))return false;}
 }return true;
}
