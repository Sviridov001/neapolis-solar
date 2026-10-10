const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const MIME = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.wasm':'application/wasm','.png':'image/png','.gz':'application/gzip','.bin':'application/octet-stream'};
const CSP = "default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; worker-src 'self'; connect-src 'self'; img-src 'self' blob: data:; style-src 'self' 'unsafe-inline'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'";
async function startServer(root) {
 const prefix = '/'+crypto.randomBytes(24).toString('hex')+'/';
 const server = http.createServer((req,res)=>{
  if (!['GET','HEAD'].includes(req.method)) {res.writeHead(405);res.end();return;}
  let pathname;
  try {pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);} catch {res.writeHead(400);res.end();return;}
  if(!pathname.startsWith(prefix)){res.writeHead(403);res.end();return;}
  const relative=pathname.slice(prefix.length)||'index.html';
  if(relative.includes('\0')||relative.includes('\\')||relative.split('/').includes('..')){res.writeHead(403);res.end();return;}
  const target=path.resolve(root,relative);
  if(!target.startsWith(path.resolve(root)+path.sep)){res.writeHead(403);res.end();return;}
  fs.stat(target,(err,stat)=>{
   if(err||!stat.isFile()){res.writeHead(404);res.end();return;}
   res.writeHead(200,{'Content-Type':MIME[path.extname(target)]||'application/octet-stream','Content-Length':stat.size,'Content-Security-Policy':CSP,'X-Content-Type-Options':'nosniff','Cache-Control':'no-store','Referrer-Policy':'no-referrer'});
   if(req.method==='HEAD'){res.end();return;}
   const stream=fs.createReadStream(target);stream.on('error',()=>res.destroy());stream.pipe(res);
  });
 });
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve)});
 return {server,url:`http://127.0.0.1:${server.address().port}${prefix}index.html`,base:`http://127.0.0.1:${server.address().port}${prefix}`};
}
module.exports={startServer};
