const assert = require('assert');

const {
  buildDynamicMatcherIndex,
  findMatchingPattern,
  matchesAnyRoutePattern,
} = require('../../lib/routes');

describe('route matcher index', () => {
  it('prefers exact dynamic matches over catch-all siblings', () => {
    const dynamicMatchers = [
      { pattern: '/blog/[slug]', regex: /^\/blog\/[^/]+$/ },
      { pattern: '/blog/[...slug]', regex: /^\/blog\/.+$/ },
      { pattern: '/[lang]/posts/[id]', regex: /^\/[^/]+\/posts\/[^/]+$/ },
    ];

    const index = buildDynamicMatcherIndex(dynamicMatchers);

    assert.strictEqual(findMatchingPattern('/blog/hello', index), '/blog/[slug]');
    assert.strictEqual(
      findMatchingPattern('/blog/hello/world', index),
      '/blog/[...slug]'
    );
    assert.strictEqual(
      findMatchingPattern('/en/posts/123', index),
      '/[lang]/posts/[id]'
    );
  });

  it('still resolves static routes without needing dynamic matchers', () => {
    assert.strictEqual(
      matchesAnyRoutePattern('/about', new Set(['/about']), null),
      true
    );
    assert.strictEqual(
      matchesAnyRoutePattern('/missing', new Set(['/about']), null),
      false
    );
  });
});
