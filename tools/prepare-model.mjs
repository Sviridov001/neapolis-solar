import {spawnSync} from 'node:child_process';import fs from 'node:fs';import path from 'node:path';import {gzipSync} from 'node:zlib';import {fileURLToPath} from 'node:url';
const [input,out]=process.argv.slice(2);if(!input||!out){console.error('Usage: node tools/prepare-model.mjs input.ifc output-directory');process.exit(1)}
const converter=fileURLToPath(new URL('./convert.mjs',import.meta.url));const r=spawnSync(process.execPath,[converter,path.resolve(input),path.resolve(out)],{stdio:'inherit'});if(r.status!==0)process.exit(r.status||1);
const manifest=path.join(out,'model.json'),m=JSON.parse(fs.readFileSync(manifest));m.meshedElementCount=new Set(m.elements.map(e=>e.id)).size;
for(let c of m.chunks){let p=path.join(out,c.file),next=c.file+'.gz';fs.writeFileSync(path.join(out,next),gzipSync(fs.readFileSync(p)));fs.unlinkSync(p);c.file=next}
fs.writeFileSync(manifest+'.gz',gzipSync(Buffer.from(JSON.stringify(m))));fs.unlinkSync(manifest);console.log('Prepared model:',path.resolve(out));
