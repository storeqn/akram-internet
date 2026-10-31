import{cp,mkdir,readFile,writeFile,rm}from'node:fs/promises';
for(const dir of ['dist','dist-pages']){await rm(dir,{recursive:true,force:true});await mkdir(dir,{recursive:true});await cp('public',dir,{recursive:true});}
let worker=await readFile('server/worker.js','utf8');const shared=await readFile('public/shared.js','utf8');worker=worker.replace("import {validate, STATUSES} from '../public/shared.js';",shared.replace(/export /g,''));await writeFile('dist/_worker.js',worker);await writeFile('dist/_routes.json',JSON.stringify({version:1,include:['/api/*','/admin','/admin/*'],exclude:[]}));
// GitHub Pages cannot run server code. It gets only public assets, never the admin UI.
await rm('dist-pages/admin',{recursive:true,force:true});await rm('dist-pages/_headers',{force:true});await writeFile('dist-pages/.nojekyll','');console.log('Built dist (Cloudflare Pages) and dist-pages (GitHub Pages).');
