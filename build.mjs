import {build} from 'esbuild';import fs from 'node:fs';
fs.mkdirSync('dist',{recursive:true});
await build({entryPoints:['src/app.js','src/ifc-worker.js','src/calc-worker.js'],bundle:true,format:'esm',outdir:'dist',minify:true,platform:'browser',target:'es2022'});
fs.copyFileSync('node_modules/web-ifc/web-ifc.wasm','dist/web-ifc.wasm');
fs.copyFileSync('src/index.html','dist/index.html');fs.copyFileSync('src/style.css','dist/style.css');
