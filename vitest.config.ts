import { defineConfig } from 'vitest/config';

// The thresholds below are a mandatory floor, not a target.
// If a run drops under any threshold, Vitest exits non-zero and the CI build
// fails (ci.yml, release.yml).
// The values sit a few points under the current baseline
// (statements 93 / branches 88 / functions 97 / lines 93).
// Ordinary churn does not trip the gate. A real regression does.
// Raise the values when the suite improves. Never lower them.
export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      // src/tests: the specs themselves. src/types.ts: type-only declarations
      // with no executable lines. *.d.ts: emitted types.
      exclude: ['src/tests/**', 'src/types.ts', '**/*.d.ts'],
      // text: the table in local and CI logs. html: local drill-down.
      // lcov and json-summary: machine-readable artifacts a pipeline can diff
      // for a coverage feedback loop (coverage/coverage-summary.json).
      reporter: ['text', 'html', 'lcov', 'json-summary'],
      reportsDirectory: './coverage',
      thresholds: {
        lines: 90,
        statements: 90,
        functions: 90,
        branches: 85,
      },
    },
  },
});
