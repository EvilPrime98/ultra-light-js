import { describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';

// Regression test for issue #45. dist/ultra-light.js must resolve under
// Node's native ESM loader, not only under a bundler's resolver.
// A plain `import()` in this Vitest process still goes through Vite's own
// resolver, which masks the bug the same way a bundler-based consumer does.
// This test starts a `node` subprocess instead. The subprocess repeats the
// issue's own repro command (`node -e "import('ultra-light-js')"`) against
// the built file.
describe('dist/ultra-light.js: native Node ESM resolution', () => {

    const distEntry = resolve(__dirname, '../../dist/ultra-light.js');
    const builtDistExists = existsSync(distEntry);

    it.skipIf(!builtDistExists)('resolves its relative imports with extensions Node can load natively', () => {
        const entryUrl = pathToFileURL(distEntry).href;
        const result = spawnSync(process.execPath, ['-e', `import(${JSON.stringify(entryUrl)})`], {
            encoding: 'utf-8'
        });

        expect(result.status).toBe(0);
        expect(result.stderr).not.toMatch(/ERR_MODULE_NOT_FOUND/);
    });
});
