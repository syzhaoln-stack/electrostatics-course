import fs from 'node:fs';import {spawnSync} from 'node:child_process';
const tests=fs.readdirSync('.').filter(name=>name.endsWith('.test.mjs')).sort();
const result=spawnSync(process.execPath,['--test',...tests],{stdio:'inherit'});process.exit(result.status??1);
