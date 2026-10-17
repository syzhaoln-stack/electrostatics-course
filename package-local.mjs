import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
execFileSync(process.execPath,['build.mjs'],{stdio:'inherit'});
const output=path.resolve('local-release');
if(path.dirname(output)!==process.cwd())throw Error('Invalid release directory');
fs.rmSync(output,{recursive:true,force:true});fs.mkdirSync(output,{recursive:true});
function copy(from,to){for(const item of fs.readdirSync(from,{withFileTypes:true})){const a=path.join(from,item.name),b=path.join(to,item.name);if(item.isDirectory()){fs.mkdirSync(b,{recursive:true});copy(a,b);}else fs.copyFileSync(a,b);}}
copy('dist',output);
for(const name of ['serve.mjs','start-local.ps1','启动本地课堂.cmd'])fs.copyFileSync(name,path.join(output,name));
fs.writeFileSync(path.join(output,'使用说明.txt'),'静电场交互教材 · 发现版 3.4.0 · 本地课堂\n\n解压后，双击“启动本地课堂.cmd”。需要已安装 Node.js（本机已有时无需安装依赖）。\n程序只监听本机 127.0.0.1。图形库、图片、库仑论文原图与译文、扭秤仿真、六段 Manim 动画、Blender 设备模型、EPA 除尘器历史教学录像和豆包双人声音已包含，不联网也能使用课堂；外部资料链接需要网络。\n不能直接双击 HTML：浏览器的模块安全限制要求通过本地服务打开。\n\nWindows 高级用法：powershell -File start-local.ps1 -Port 4174\n其他系统：node serve.mjs，然后浏览器打开 http://127.0.0.1:4174\n');
console.log(output);
