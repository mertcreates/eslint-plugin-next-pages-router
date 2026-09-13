const assert = require('assert');
const { execFileSync, spawnSync } = require('child_process');
const { resolve } = require('path');

const cwd = resolve(__dirname, '../..');
const args = [
  'scripts/benchmark.js', '--routes', '6', '--statements', '24',
  '--files', '3', '--iterations', '1', '--warmup', '0', '--json', 'true',
];

describe('benchmark execution', () => {
  for (const mode of ['single', 'files']) {
    for (const rules of ['compare', 'navigation', 'mixed']) {
      it(`runs ${rules} rules in ${mode} mode`, () => {
        const report = JSON.parse(execFileSync(process.execPath, [
          ...args, '--mode', mode, '--rules', rules,
        ], { cwd, encoding: 'utf8' }));

        assert.ok(report.diagnosticsPerRun > 0);
        assert.strictEqual(report.files, mode === 'files' ? 3 : 1);
        assert.strictEqual(report.measuredRuns, 1);
      });
    }
  }

  it('rejects a workload where the rules are skipped', () => {
    const result = spawnSync(process.execPath, [
      ...args, '--pages-dir', 'tests/fixtures/pages/does-not-exist',
    ], { cwd, encoding: 'utf8' });

    assert.notStrictEqual(result.status, 0);
    assert.match(result.stderr, /Benchmark rule check failed/);
  });
});
