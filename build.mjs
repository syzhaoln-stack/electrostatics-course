import fs from 'node:fs';
import path from 'node:path';
const buildRoot=path.resolve('dist');
if(path.dirname(buildRoot)!==process.cwd())throw Error('Invalid build directory');
fs.rmSync(buildRoot,{recursive:true,force:true});
fs.mkdirSync(buildRoot,{recursive:true});
const version=JSON.parse(fs.readFileSync('package.json','utf8')).version;
// Version local code/style URLs so a shared classroom link picks up the current edition.
const versionReferences=source=>source.replace(/(["'])(\.\/[\w./-]+\.(?:js|css))\1/g,(_,quote,reference)=>`${quote}${reference}?v=${version}${quote}`);
for(const name of fs.readdirSync('.'))if(/\.(html|css|js)$/.test(name)&&!name.endsWith('.test.js')&&!name.startsWith('qa-'))fs.writeFileSync(path.join('dist',name),versionReferences(fs.readFileSync(name,'utf8')));
function copyDirectory(from,to){fs.mkdirSync(to,{recursive:true});for(const item of fs.readdirSync(from,{withFileTypes:true})){const src=path.join(from,item.name),dst=path.join(to,item.name);if(item.isDirectory())copyDirectory(src,dst);else fs.copyFileSync(src,dst);}}
copyDirectory('vendor','dist/vendor');
if(fs.existsSync('assets'))copyDirectory('assets','dist/assets');
fs.mkdirSync('dist/media',{recursive:true});
for(const name of ['electric-field-dialogue.mp3','electric-field-dialogue.timeline.json','electric-field-dialogue.vtt','podcast-status.json'])if(fs.existsSync('media/'+name))fs.copyFileSync('media/'+name,'dist/media/'+name);
console.log('Static pages and local assets built in dist');

fs.writeFileSync('dist/.nojekyll','');
