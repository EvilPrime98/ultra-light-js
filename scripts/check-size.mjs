import process from 'node:process';
// Fails when the min+gzip size of the browser bundle exceeds the budget.
// Run after `pnpm run build`. Budget is read from package.json `sizeBudget`.
import { readFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const budget = pkg.sizeBudget?.['dist/ultra-light.global.js'];
const file = new URL('../dist/ultra-light.global.js', import.meta.url);
const gz = gzipSync(readFileSync(file), { level: 9 }).length;
console.log(`dist/ultra-light.global.js: ${gz} B min+gzip (budget ${budget} B)`);
if (!budget) { console.error('Missing sizeBudget in package.json'); process.exit(1); }
if (gz > budget) { console.error('Size budget exceeded.'); process.exit(1); }
