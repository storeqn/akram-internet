import{cp,mkdir,readFile,writeFile,rm}from'node:fs/promises';
for(const dir of ['dist','dist-pages']){await rm(dir,{recursive:true,force:true});await mkdir(dir,{recursive:true});await cp('public',dir,{recursive:true});}
await writeFile('dist/_worker.js',await readFile('server/worker.js','utf8'));
await writeFile('dist/_routes.json',JSON.stringify({version:1,include:['/api/*','/admin','/admin/*'],exclude:[]}));
await rm('dist-pages/_headers',{force:true});await writeFile('dist-pages/.nojekyll','');console.log('Built WhatsApp-only site for Cloudflare Pages and GitHub Pages.');
