const assert = require('assert');

const {
  buildDynamicMatcherIndex,
  findMatchingPattern,
  getDynamicRouteParameters,
  matchesAnyRoutePattern,
  parseDynamicRouteSegment,
  patternToRegex,
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

  it('describes dynamic route segments in page order', () => {
    assert.strictEqual(parseDynamicRouteSegment('about'), null);
    assert.deepStrictEqual(parseDynamicRouteSegment('[id]'), {
      name: 'id',
      repeat: false,
      optional: false,
    });
    assert.deepStrictEqual(parseDynamicRouteSegment('[...slug]'), {
      name: 'slug',
      repeat: true,
      optional: false,
    });
    assert.deepStrictEqual(parseDynamicRouteSegment('[[...slug]]'), {
      name: 'slug',
      repeat: true,
      optional: true,
    });
    assert.deepStrictEqual(
      getDynamicRouteParameters('/[lang]/blog/[category]/[...slug]'),
      [
        { name: 'lang', repeat: false, optional: false },
        { name: 'category', repeat: false, optional: false },
        { name: 'slug', repeat: true, optional: false },
      ]
    );
  });

  it('preserves required and optional catch-all matching', () => {
    assert.strictEqual(patternToRegex('/blog/[...slug]').test('/blog'), false);
    assert.strictEqual(
      patternToRegex('/blog/[...slug]').test('/blog/a/b'),
      true
    );
    assert.strictEqual(
      patternToRegex('/blog/[[...slug]]').test('/blog'),
      true
    );
    assert.strictEqual(
      patternToRegex('/blog/[[...slug]]').test('/blog/a/b'),
      true
    );
  });
});
