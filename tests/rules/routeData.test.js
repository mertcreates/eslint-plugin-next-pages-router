const assert = require('assert');
const fs = require('fs');
const { mkdtempSync, mkdirSync, writeFileSync, rmSync, statSync } = fs;
const { join } = require('path');
const { tmpdir } = require('os');

const { getRouteMatchers } = require('../../lib/routeData');

describe('routeData cache', () => {
  it('rebuilds cached routes when the pages tree changes', () => {
    const tempRoot = mkdtempSync(join(tmpdir(), 'eslint-next-routing-route-data-'));
    const pagesDir = join(tempRoot, 'pages');

    try {
      mkdirSync(pagesDir, { recursive: true });
      writeFileSync(join(pagesDir, 'about.js'), 'export default function About() {}');

      const first = getRouteMatchers({
        pagesDir,
        cwd: tempRoot,
        includeDynamicMatchers: false,
      });

      assert.strictEqual(first.routeSet.has('/about'), true);
      assert.strictEqual(first.routeSet.has('/blog'), false);

      mkdirSync(join(pagesDir, 'blog'), { recursive: true });
      writeFileSync(
        join(pagesDir, 'blog', 'index.js'),
        'export default function Blog() {}'
      );

      const second = getRouteMatchers({
        pagesDir,
        cwd: tempRoot,
        includeDynamicMatchers: false,
      });

      assert.strictEqual(second.routeSet.has('/about'), true);
      assert.strictEqual(second.routeSet.has('/blog'), true);
    } finally {
      rmSync(tempRoot, { recursive: true, force: true });
    }
  });

  it('retries route cache rebuild when statSync races with filesystem changes', () => {
    const tempRoot = mkdtempSync(join(tmpdir(), 'eslint-next-routing-route-data-race-'));
    const pagesDir = join(tempRoot, 'pages');
    let statCalls = 0;

    try {
      mkdirSync(pagesDir, { recursive: true });
      writeFileSync(join(pagesDir, 'about.js'), 'export default function About() {}');

      const fsOps = {
        existsSync: (path) => fs.existsSync(path),
        statSync: (...args) => {
          statCalls += 1;

          if (statCalls === 1) {
            const error = new Error('ENOENT');
            error.code = 'ENOENT';
            throw error;
          }

          return statSync(...args);
        },
      };

      const result = getRouteMatchers({
        pagesDir,
        cwd: tempRoot,
        includeDynamicMatchers: false,
        fsOps,
      });

      assert.strictEqual(result.routeSet.has('/about'), true);
      assert.strictEqual(statCalls >= 2, true);
    } finally {
      rmSync(tempRoot, { recursive: true, force: true });
    }
  });
});
