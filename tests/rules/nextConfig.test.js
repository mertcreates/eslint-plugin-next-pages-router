const assert = require('assert');
const fs = require('fs');
const { mkdtempSync, rmSync, writeFileSync } = fs;
const { join } = require('path');
const { tmpdir } = require('os');

const { loadNextConfigSync } = require('../../lib/nextConfig');

describe('nextConfig loader', () => {
  it('reads basePath and locales from a static next.config.mjs default export', () => {
    const tempRoot = mkdtempSync(join(tmpdir(), 'eslint-next-routing-config-'));

    try {
      writeFileSync(
        join(tempRoot, 'next.config.mjs'),
        [
          'export default {',
          "  basePath: '/docs',",
          '  i18n: {',
          "    locales: ['en', 'tr'],",
          '  },',
          '};',
          '',
        ].join('\n')
      );

      const config = loadNextConfigSync({ cwd: tempRoot, configPath: '' });

      assert.deepStrictEqual(config, {
        basePath: '/docs',
        i18n: {
          locales: ['en', 'tr'],
        },
      });
    } finally {
      rmSync(tempRoot, { recursive: true, force: true });
    }
  });

  it('uses an explicit next.config.mjs path', () => {
    const tempRoot = mkdtempSync(join(tmpdir(), 'eslint-next-routing-config-'));
    const configPath = join(tempRoot, 'custom-next.config.mjs');

    try {
      writeFileSync(
        configPath,
        "export default { basePath: '/docs', i18n: { locales: ['en'] } };\n"
      );

      const config = loadNextConfigSync({
        cwd: tempRoot,
        configPath,
      });

      assert.strictEqual(config.basePath, '/docs');
      assert.deepStrictEqual(config.i18n.locales, ['en']);
    } finally {
      rmSync(tempRoot, { recursive: true, force: true });
    }
  });

  it('skips dynamic next.config.mjs default exports', () => {
    const tempRoot = mkdtempSync(join(tmpdir(), 'eslint-next-routing-config-'));

    try {
      writeFileSync(
        join(tempRoot, 'next.config.mjs'),
        "export default withAnalyzer({ basePath: '/docs' });\n"
      );

      const config = loadNextConfigSync({ cwd: tempRoot, configPath: '' });

      assert.strictEqual(config, null);
    } finally {
      rmSync(tempRoot, { recursive: true, force: true });
    }
  });
});
